import {
  ArrowDownLeft,
  ArrowRightLeft,
  ArrowUpRight,
  Bot,
  CheckCircle2,
  FileText,
  Landmark,
  Plus,
  RefreshCw,
  Sparkles,
  Tags,
  Trash2,
  Upload,
  WalletCards
} from "lucide-react";
import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import type {
  Account,
  AccountInput,
  AgentDraftTransaction,
  AgentSourceType,
  Category,
  CategoryInput,
  LedgerState,
  TransactionInput,
  TransactionType,
  TransactionView
} from "../shared/types";

const emptyState: LedgerState = {
  accounts: [],
  categories: [],
  transactions: [],
  summary: {
    totalAssets: 0,
    totalLiabilities: 0,
    netWorth: 0,
    monthIncome: 0,
    monthExpense: 0,
    monthNet: 0,
    topExpenseCategories: []
  }
};

const accountKindLabels: Record<Account["kind"], string> = {
  cash: "现金",
  bank: "银行",
  credit: "信用",
  investment: "投资",
  asset: "资产",
  liability: "负债"
};

const transactionTypeLabels: Record<TransactionType, string> = {
  expense: "支出",
  income: "收入",
  transfer: "转账"
};

const today = formatDateInput(new Date());

export function App() {
  const [state, setState] = useState<LedgerState>(emptyState);
  const [databasePath, setDatabasePath] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [agentSourceType, setAgentSourceType] = useState<AgentSourceType>("plain-text");
  const [agentText, setAgentText] = useState("");
  const [agentDrafts, setAgentDrafts] = useState<AgentDraftTransaction[]>([]);
  const [agentNotes, setAgentNotes] = useState<string[]>([]);
  const [agentLoading, setAgentLoading] = useState(false);
  const [transaction, setTransaction] = useState<TransactionInput>({
    type: "expense",
    accountId: "",
    categoryId: "",
    transferAccountId: "",
    amount: 0,
    occurredOn: today,
    note: ""
  });
  const [account, setAccount] = useState<AccountInput>({
    name: "",
    kind: "bank",
    currency: "CNY",
    openingBalance: 0
  });
  const [category, setCategory] = useState<CategoryInput>({
    name: "",
    type: "expense",
    color: "#f97316",
    icon: "circle"
  });

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    if (!transaction.accountId && state.accounts[0]) {
      setTransaction((current) => ({ ...current, accountId: state.accounts[0].id }));
    }
  }, [state.accounts, transaction.accountId]);

  const activeAccounts = useMemo(() => state.accounts.filter((item) => !item.archived), [state.accounts]);
  const activeCategories = useMemo(
    () => state.categories.filter((item) => !item.archived && item.type === transaction.type),
    [state.categories, transaction.type]
  );

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [nextState, path] = await Promise.all([window.moneyPig.getState(), window.moneyPig.getDatabasePath()]);
      setState(nextState);
      setDatabasePath(path);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function submitTransaction(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    try {
      const nextState = await window.moneyPig.createTransaction({
        ...transaction,
        categoryId: transaction.type === "transfer" ? null : transaction.categoryId,
        transferAccountId: transaction.type === "transfer" ? transaction.transferAccountId : null,
        amount: Number(transaction.amount)
      });
      setState(nextState);
      setTransaction((current) => ({
        ...current,
        amount: 0,
        note: "",
        occurredOn: today
      }));
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  async function submitAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    try {
      const nextState = await window.moneyPig.createAccount({
        ...account,
        openingBalance: Number(account.openingBalance)
      });
      setState(nextState);
      setAccount({ name: "", kind: "bank", currency: "CNY", openingBalance: 0 });
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  async function submitCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    try {
      const nextState = await window.moneyPig.createCategory(category);
      setState(nextState);
      setCategory({ name: "", type: category.type, color: "#f97316", icon: "circle" });
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  async function deleteTransaction(id: string) {
    setError("");
    try {
      setState(await window.moneyPig.deleteTransaction(id));
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  async function readAgentFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setError("");
    try {
      const text = await file.text();
      setAgentText(text);
      const lowerName = file.name.toLowerCase();
      if (lowerName.includes("微信") || lowerName.includes("wechat")) {
        setAgentSourceType("wechat");
      } else if (lowerName.includes("支付宝") || lowerName.includes("alipay")) {
        setAgentSourceType("alipay");
      } else {
        setAgentSourceType("plain-text");
      }
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      event.target.value = "";
    }
  }

  async function parseWithAgent() {
    setError("");
    setAgentNotes([]);
    if (!agentText.trim()) {
      setError("请先粘贴口述内容或上传账单文件");
      return;
    }

    setAgentLoading(true);
    try {
      const result = await window.moneyPig.parseTransactionsWithAgent({
        sourceType: agentSourceType,
        content: agentText
      });
      setAgentDrafts(result.drafts);
      setAgentNotes([`${result.provider === "minimax" ? "Minimax" : "本地解析"} 生成 ${result.drafts.length} 条草稿`, ...result.notes]);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setAgentLoading(false);
    }
  }

  async function commitAgentDrafts() {
    setError("");
    const validDrafts = agentDrafts.filter(isDraftReady);
    if (validDrafts.length === 0) {
      setError("没有可确认写入的草稿");
      return;
    }

    try {
      const nextState = await window.moneyPig.createTransactions(
        validDrafts.map(({ id: _id, source: _source, confidence: _confidence, warnings: _warnings, ...input }) => ({
          ...input,
          amount: Number(input.amount)
        }))
      );
      setState(nextState);
      setAgentDrafts([]);
      setAgentNotes([`已写入 ${validDrafts.length} 条账目`]);
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  function updateAgentDraft(id: string, patch: Partial<AgentDraftTransaction>) {
    setAgentDrafts((current) =>
      current.map((draft) =>
        draft.id === id
          ? {
              ...draft,
              ...patch,
              warnings: recomputeDraftWarnings({ ...draft, ...patch })
            }
          : draft
      )
    );
  }

  function removeAgentDraft(id: string) {
    setAgentDrafts((current) => current.filter((draft) => draft.id !== id));
  }

  function updateTransactionType(type: TransactionType) {
    const firstCategory = state.categories.find((item) => item.type === type && !item.archived);
    const secondAccount = activeAccounts.find((item) => item.id !== transaction.accountId);

    setTransaction((current) => ({
      ...current,
      type,
      categoryId: type === "transfer" ? null : firstCategory?.id ?? "",
      transferAccountId: type === "transfer" ? secondAccount?.id ?? "" : null
    }));
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <h1>Money Pig</h1>
          <p>{databasePath || "本地账本"}</p>
        </div>
        <button className="icon-button" title="刷新" onClick={load} disabled={loading}>
          <RefreshCw size={18} />
        </button>
      </header>

      {error ? <div className="error-banner">{error}</div> : null}

      <section className="summary-grid">
        <MetricCard label="净资产" value={state.summary.netWorth} tone="ink" />
        <MetricCard label="总资产" value={state.summary.totalAssets} tone="green" />
        <MetricCard label="总负债" value={state.summary.totalLiabilities} tone="red" />
        <MetricCard label="本月结余" value={state.summary.monthNet} tone="blue" />
        <MetricCard label="本月收入" value={state.summary.monthIncome} tone="green" />
        <MetricCard label="本月支出" value={state.summary.monthExpense} tone="orange" />
      </section>

      <section className="panel agent-panel">
        <div className="agent-header">
          <PanelTitle icon={<Bot size={18} />} title="Agent 记账" />
          <div className="agent-actions">
            <label className="file-button">
              <Upload size={16} />
              上传账单
              <input type="file" accept=".txt,.csv,.log,.text" onChange={readAgentFile} />
            </label>
            <button className="secondary-button fit" type="button" onClick={parseWithAgent} disabled={agentLoading}>
              <Sparkles size={16} />
              {agentLoading ? "解析中" : "生成草稿"}
            </button>
            <button
              className="primary-button fit"
              type="button"
              onClick={commitAgentDrafts}
              disabled={agentDrafts.filter(isDraftReady).length === 0}
            >
              <CheckCircle2 size={16} />
              确认写入
            </button>
          </div>
        </div>

        <div className="agent-input-grid">
          <label>
            来源
            <select
              value={agentSourceType}
              onChange={(event) => setAgentSourceType(event.target.value as AgentSourceType)}
            >
              <option value="plain-text">普通文本</option>
              <option value="wechat">微信账单</option>
              <option value="alipay">支付宝账单</option>
              <option value="speech">口述</option>
            </select>
          </label>
          <label className="agent-text-field">
            内容
            <textarea
              value={agentText}
              onChange={(event) => setAgentText(event.target.value)}
              placeholder="粘贴微信/支付宝账单文本，或输入：昨天午饭 35 元，今天工资到账 12000 元"
            />
          </label>
        </div>

        {agentNotes.length > 0 ? (
          <div className="agent-notes">
            {agentNotes.map((note) => (
              <span key={note}>{note}</span>
            ))}
          </div>
        ) : null}

        {agentDrafts.length > 0 ? (
          <div className="draft-table">
            <div className="draft-head">
              <span>类型</span>
              <span>日期</span>
              <span>金额</span>
              <span>账户</span>
              <span>分类/转入</span>
              <span>备注</span>
              <span />
            </div>
            {agentDrafts.map((draft) => (
              <AgentDraftRow
                key={draft.id}
                draft={draft}
                accounts={activeAccounts}
                categories={state.categories.filter((item) => !item.archived)}
                onChange={updateAgentDraft}
                onRemove={removeAgentDraft}
              />
            ))}
          </div>
        ) : (
          <div className="agent-empty">
            <FileText size={17} />
            等待上传账单或输入口述内容
          </div>
        )}
      </section>

      <section className="workspace">
        <div className="left-column">
          <section className="panel">
            <PanelTitle icon={<Plus size={18} />} title="记一笔" />
            <form className="form-grid transaction-form" onSubmit={submitTransaction}>
              <div className="segmented" role="group" aria-label="交易类型">
                {(["expense", "income", "transfer"] as TransactionType[]).map((type) => (
                  <button
                    key={type}
                    type="button"
                    className={transaction.type === type ? "active" : ""}
                    onClick={() => updateTransactionType(type)}
                  >
                    {type === "expense" ? <ArrowUpRight size={16} /> : null}
                    {type === "income" ? <ArrowDownLeft size={16} /> : null}
                    {type === "transfer" ? <ArrowRightLeft size={16} /> : null}
                    {transactionTypeLabels[type]}
                  </button>
                ))}
              </div>

              <label>
                金额
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={transaction.amount || ""}
                  onChange={(event) =>
                    setTransaction((current) => ({ ...current, amount: Number(event.target.value) }))
                  }
                  required
                />
              </label>

              <label>
                日期
                <input
                  type="date"
                  value={transaction.occurredOn}
                  onChange={(event) => setTransaction((current) => ({ ...current, occurredOn: event.target.value }))}
                  required
                />
              </label>

              <label>
                账户
                <select
                  value={transaction.accountId}
                  onChange={(event) => setTransaction((current) => ({ ...current, accountId: event.target.value }))}
                  required
                >
                  {activeAccounts.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>

              {transaction.type === "transfer" ? (
                <label>
                  转入
                  <select
                    value={transaction.transferAccountId ?? ""}
                    onChange={(event) =>
                      setTransaction((current) => ({ ...current, transferAccountId: event.target.value }))
                    }
                    required
                  >
                    <option value="">选择账户</option>
                    {activeAccounts
                      .filter((item) => item.id !== transaction.accountId)
                      .map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name}
                        </option>
                      ))}
                  </select>
                </label>
              ) : (
                <label>
                  分类
                  <select
                    value={transaction.categoryId ?? ""}
                    onChange={(event) => setTransaction((current) => ({ ...current, categoryId: event.target.value }))}
                    required
                  >
                    <option value="">选择分类</option>
                    {activeCategories.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              <label className="wide">
                备注
                <input
                  value={transaction.note ?? ""}
                  onChange={(event) => setTransaction((current) => ({ ...current, note: event.target.value }))}
                  placeholder="午餐、工资、基金赎回"
                />
              </label>

              <button className="primary-button wide" type="submit">
                <Plus size={17} />
                保存
              </button>
            </form>
          </section>

          <section className="panel">
            <PanelTitle icon={<WalletCards size={18} />} title="账户" />
            <div className="account-list">
              {state.accounts.map((item) => (
                <article className="account-row" key={item.id}>
                  <div>
                    <strong>{item.name}</strong>
                    <span>{accountKindLabels[item.kind]}</span>
                  </div>
                  <b>{formatMoney(item.currentBalance, item.currency)}</b>
                </article>
              ))}
            </div>
          </section>
        </div>

        <section className="panel ledger-panel">
          <PanelTitle icon={<Landmark size={18} />} title="流水" />
          <div className="ledger-list">
            {state.transactions.length === 0 ? (
              <div className="empty-row">暂无流水</div>
            ) : (
              state.transactions.map((item) => (
                <TransactionRow key={item.id} transaction={item} onDelete={deleteTransaction} />
              ))
            )}
          </div>
        </section>

        <div className="right-column">
          <section className="panel">
            <PanelTitle icon={<Tags size={18} />} title="本月支出" />
            <div className="category-rank">
              {state.summary.topExpenseCategories.length === 0 ? (
                <div className="empty-row">暂无支出</div>
              ) : (
                state.summary.topExpenseCategories.map((item) => (
                  <div className="rank-row" key={item.categoryId}>
                    <span style={{ background: item.color }} />
                    <b>{item.name}</b>
                    <strong>{formatMoney(item.total)}</strong>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="panel">
            <PanelTitle icon={<Plus size={18} />} title="新增账户" />
            <form className="compact-form" onSubmit={submitAccount}>
              <label>
                名称
                <input
                  value={account.name}
                  onChange={(event) => setAccount((current) => ({ ...current, name: event.target.value }))}
                  required
                />
              </label>
              <div className="two-fields">
                <label>
                  类型
                  <select
                    value={account.kind}
                    onChange={(event) =>
                      setAccount((current) => ({ ...current, kind: event.target.value as Account["kind"] }))
                    }
                  >
                    {Object.entries(accountKindLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  初始
                  <input
                    type="number"
                    step="0.01"
                    value={account.openingBalance}
                    onChange={(event) =>
                      setAccount((current) => ({ ...current, openingBalance: Number(event.target.value) }))
                    }
                  />
                </label>
              </div>
              <button className="secondary-button" type="submit">
                <Plus size={16} />
                添加
              </button>
            </form>
          </section>

          <section className="panel">
            <PanelTitle icon={<Tags size={18} />} title="新增分类" />
            <form className="compact-form" onSubmit={submitCategory}>
              <label>
                名称
                <input
                  value={category.name}
                  onChange={(event) => setCategory((current) => ({ ...current, name: event.target.value }))}
                  required
                />
              </label>
              <div className="two-fields">
                <label>
                  类型
                  <select
                    value={category.type}
                    onChange={(event) =>
                      setCategory((current) => ({
                        ...current,
                        type: event.target.value as Category["type"]
                      }))
                    }
                  >
                    <option value="expense">支出</option>
                    <option value="income">收入</option>
                  </select>
                </label>
                <label>
                  颜色
                  <input
                    type="color"
                    value={category.color}
                    onChange={(event) => setCategory((current) => ({ ...current, color: event.target.value }))}
                  />
                </label>
              </div>
              <button className="secondary-button" type="submit">
                <Plus size={16} />
                添加
              </button>
            </form>
          </section>
        </div>
      </section>
    </main>
  );
}

function MetricCard({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <article className={`metric-card ${tone}`}>
      <span>{label}</span>
      <strong>{formatMoney(value)}</strong>
    </article>
  );
}

function AgentDraftRow({
  draft,
  accounts,
  categories,
  onChange,
  onRemove
}: {
  draft: AgentDraftTransaction;
  accounts: Account[];
  categories: Category[];
  onChange(id: string, patch: Partial<AgentDraftTransaction>): void;
  onRemove(id: string): void;
}) {
  const typedCategories = categories.filter((item) => item.type === draft.type);

  return (
    <article className={`draft-row ${isDraftReady(draft) ? "" : "invalid"}`}>
      <select
        value={draft.type}
        onChange={(event) => {
          const type = event.target.value as TransactionType;
          const category = categories.find((item) => item.type === type);
          const transferAccount = accounts.find((item) => item.id !== draft.accountId);
          onChange(draft.id, {
            type,
            categoryId: type === "transfer" ? null : category?.id ?? "",
            transferAccountId: type === "transfer" ? transferAccount?.id ?? "" : null
          });
        }}
      >
        <option value="expense">支出</option>
        <option value="income">收入</option>
        <option value="transfer">转账</option>
      </select>

      <input
        type="date"
        value={draft.occurredOn}
        onChange={(event) => onChange(draft.id, { occurredOn: event.target.value })}
      />

      <input
        type="number"
        min="0.01"
        step="0.01"
        value={draft.amount || ""}
        onChange={(event) => onChange(draft.id, { amount: Number(event.target.value) })}
      />

      <select value={draft.accountId} onChange={(event) => onChange(draft.id, { accountId: event.target.value })}>
        <option value="">账户</option>
        {accounts.map((item) => (
          <option key={item.id} value={item.id}>
            {item.name}
          </option>
        ))}
      </select>

      {draft.type === "transfer" ? (
        <select
          value={draft.transferAccountId ?? ""}
          onChange={(event) => onChange(draft.id, { transferAccountId: event.target.value })}
        >
          <option value="">转入账户</option>
          {accounts
            .filter((item) => item.id !== draft.accountId)
            .map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
        </select>
      ) : (
        <select value={draft.categoryId ?? ""} onChange={(event) => onChange(draft.id, { categoryId: event.target.value })}>
          <option value="">分类</option>
          {typedCategories.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      )}

      <input value={draft.note ?? ""} onChange={(event) => onChange(draft.id, { note: event.target.value })} />

      <button className="icon-button small" title="移除草稿" onClick={() => onRemove(draft.id)}>
        <Trash2 size={16} />
      </button>

      <div className="draft-meta">
        <span>置信度 {Math.round(draft.confidence * 100)}%</span>
        <span>{draft.source}</span>
        {draft.warnings.map((warning) => (
          <b key={warning}>{warning}</b>
        ))}
      </div>
    </article>
  );
}

function PanelTitle({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="panel-title">
      {icon}
      <h2>{title}</h2>
    </div>
  );
}

function TransactionRow({
  transaction,
  onDelete
}: {
  transaction: TransactionView;
  onDelete(id: string): Promise<void>;
}) {
  const sign = transaction.type === "income" ? "+" : transaction.type === "expense" ? "-" : "";
  const title =
    transaction.type === "transfer"
      ? `${transaction.accountName} -> ${transaction.transferAccountName}`
      : transaction.categoryName ?? transactionTypeLabels[transaction.type];

  return (
    <article className={`transaction-row ${transaction.type}`}>
      <div className="transaction-icon">
        {transaction.type === "expense" ? <ArrowUpRight size={17} /> : null}
        {transaction.type === "income" ? <ArrowDownLeft size={17} /> : null}
        {transaction.type === "transfer" ? <ArrowRightLeft size={17} /> : null}
      </div>
      <div className="transaction-main">
        <strong>{title}</strong>
        <span>
          {transaction.occurredOn} · {transaction.note || transaction.accountName}
        </span>
      </div>
      <b>{sign + formatMoney(transaction.amount)}</b>
      <button className="icon-button small" title="删除" onClick={() => void onDelete(transaction.id)}>
        <Trash2 size={16} />
      </button>
    </article>
  );
}

function formatMoney(value: number, currency = "CNY") {
  return new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency,
    maximumFractionDigits: 2
  }).format(value);
}

function formatDateInput(date: Date) {
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 10);
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function isDraftReady(draft: AgentDraftTransaction) {
  if (!draft.accountId || !draft.occurredOn || !Number.isFinite(draft.amount) || draft.amount <= 0) {
    return false;
  }

  if (draft.type === "transfer") {
    return Boolean(draft.transferAccountId && draft.transferAccountId !== draft.accountId);
  }

  return Boolean(draft.categoryId);
}

function recomputeDraftWarnings(draft: AgentDraftTransaction) {
  const warnings: string[] = [];
  if (!draft.accountId) warnings.push("缺少账户");
  if (!draft.occurredOn) warnings.push("缺少日期");
  if (!Number.isFinite(draft.amount) || draft.amount <= 0) warnings.push("金额必须大于 0");
  if (draft.type === "transfer") {
    if (!draft.transferAccountId) warnings.push("缺少转入账户");
    if (draft.transferAccountId && draft.transferAccountId === draft.accountId) warnings.push("转出和转入不能相同");
  } else if (!draft.categoryId) {
    warnings.push("缺少分类");
  }
  return warnings;
}
