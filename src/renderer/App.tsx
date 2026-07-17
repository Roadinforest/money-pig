import {
  ArrowDownLeft,
  ArrowRightLeft,
  ArrowUpRight,
  BarChart3,
  Bot,
  CheckCircle2,
  CircleDollarSign,
  Edit3,
  FileText,
  Landmark,
  Plus,
  RefreshCw,
  Settings,
  Sparkles,
  Tags,
  Trash2,
  Upload,
  X,
  WalletCards
} from "lucide-react";
import { ChangeEvent, ClipboardEvent, DragEvent, FormEvent, useEffect, useMemo, useState } from "react";
import type {
  Account,
  AccountInput,
  AccountUpdateInput,
  AgentDraftTransaction,
  AgentSettings,
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

type AppTab = "ledger" | "accounts" | "agent";
type AgentImage = { id: string; dataUrl: string; name: string };

const defaultAgentSettings: AgentSettings = {
  provider: "minimax",
  apiKey: "",
  baseUrl: "https://api.minimaxi.com/v1/chat/completions",
  model: "MiniMax-M1",
  updatedAt: null
};

export function App() {
  const [state, setState] = useState<LedgerState>(emptyState);
  const [databasePath, setDatabasePath] = useState("");
  const [activeTab, setActiveTab] = useState<AppTab>("ledger");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [agentSettings, setAgentSettings] = useState<AgentSettings>(defaultAgentSettings);
  const [settingsSaved, setSettingsSaved] = useState(false);
  const [agentSourceType, setAgentSourceType] = useState<AgentSourceType>("plain-text");
  const [agentText, setAgentText] = useState("");
  const [agentImages, setAgentImages] = useState<AgentImage[]>([]);
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
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
  const [accountDraft, setAccountDraft] = useState<AccountUpdateInput | null>(null);
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
  const accountStats = useMemo(() => buildAccountStats(state.accounts), [state.accounts]);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [nextState, path, settings] = await Promise.all([
        window.moneyPig.getState(),
        window.moneyPig.getDatabasePath(),
        window.moneyPig.getAgentSettings()
      ]);
      setState(nextState);
      setDatabasePath(path);
      setAgentSettings(settings);
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

  async function submitAccountDraft(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!accountDraft) {
      return;
    }

    setError("");
    try {
      setState(await window.moneyPig.updateAccount(accountDraft));
      setEditingAccountId(null);
      setAccountDraft(null);
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  async function deleteAccount(id: string) {
    setError("");
    try {
      setState(await window.moneyPig.deleteAccount(id));
      if (editingAccountId === id) {
        setEditingAccountId(null);
        setAccountDraft(null);
      }
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  function startEditingAccount(item: Account) {
    setEditingAccountId(item.id);
    setAccountDraft({
      id: item.id,
      name: item.name,
      kind: item.kind,
      currency: item.currency,
      openingBalance: item.openingBalance
    });
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
    const files = Array.from(event.target.files ?? []);
    const firstFile = files[0];
    if (!firstFile) {
      return;
    }

    setError("");
    try {
      const imageFiles = files.filter((file) => file.type.startsWith("image/"));
      if (imageFiles.length > 0) {
        await useAgentImages(imageFiles);
        return;
      }

      const text = await firstFile.text();
      setAgentText(text);
      setAgentImages([]);
      const lowerName = firstFile.name.toLowerCase();
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

  async function useAgentImages(files: File[]) {
    const images = await Promise.all(
      files.map(async (file) => ({
        id: crypto.randomUUID(),
        dataUrl: await readFileAsDataUrl(file),
        name: file.name || "粘贴的图片"
      }))
    );
    appendAgentImages(images);
  }

  function appendAgentImages(images: AgentImage[]) {
    setAgentImages((current) => {
      const next = [...current, ...images];
      setAgentNotes([`已载入 ${next.length} 张图片`]);
      return next;
    });
    setAgentText((current) => stripImageFileUrls(current));
    setAgentSourceType("image");
  }

  function removeAgentImage(id: string) {
    setAgentImages((current) => {
      const next = current.filter((item) => item.id !== id);
      setAgentNotes(next.length > 0 ? [`已载入 ${next.length} 张图片`] : []);
      return next;
    });
  }

  async function readAgentImageFromFiles(files: FileList | File[]) {
    const images = Array.from(files).filter((file) => file.type.startsWith("image/"));
    if (images.length === 0) {
      return false;
    }

    setError("");
    try {
      await useAgentImages(images);
    } catch (err) {
      setError(errorMessage(err));
    }
    return true;
  }

  function handleAgentPaste(event: ClipboardEvent<HTMLTextAreaElement>) {
    const files = event.clipboardData.files;
    if (files.length > 0) {
      event.preventDefault();
      void readAgentImageFromFiles(files);
      return;
    }

    const text = event.clipboardData.getData("text/plain").trim();
    if (isImageFileUrl(text)) {
      event.preventDefault();
      void readAgentImageFromFileUrls([text]);
    }
  }

  function handleAgentDragOver(event: DragEvent<HTMLDivElement>) {
    if (Array.from(event.dataTransfer.items).some((item) => item.type.startsWith("image/"))) {
      event.preventDefault();
    }
  }

  function handleAgentDrop(event: DragEvent<HTMLDivElement>) {
    if (Array.from(event.dataTransfer.files).some((file) => file.type.startsWith("image/"))) {
      event.preventDefault();
      void readAgentImageFromFiles(event.dataTransfer.files);
      return;
    }

    const text = event.dataTransfer.getData("text/plain").trim();
    if (isImageFileUrl(text)) {
      event.preventDefault();
      void readAgentImageFromFileUrls([text]);
    }
  }

  async function readAgentImageFromFileUrls(urls: string[]) {
    const imageUrls = urls.filter(isImageFileUrl);
    if (imageUrls.length === 0) {
      return false;
    }

    setError("");
    try {
      const images = await Promise.all(
        imageUrls.map(async (url) => ({
          id: crypto.randomUUID(),
          dataUrl: await readUrlAsDataUrl(url),
          name: decodeURIComponent(url.split("/").at(-1) || "粘贴的图片")
        }))
      );
      appendAgentImages(images);
    } catch (err) {
      setError(errorMessage(err));
    }
    return true;
  }

  async function parseWithAgent() {
    setError("");
    setAgentNotes([]);
    if (!agentText.trim() && agentImages.length === 0) {
      setError("请先粘贴口述内容、上传账单文件，或粘贴/拖拽图片");
      return;
    }

    setAgentLoading(true);
    try {
      const result = await window.moneyPig.parseTransactionsWithAgent({
        sourceType: agentSourceType,
        content: agentText,
        imageDataUrls: agentImages.map((image) => image.dataUrl)
      });
      setAgentDrafts(result.drafts);
      setAgentNotes([`${result.provider === "minimax" ? "Minimax" : "本地解析"} 生成 ${result.drafts.length} 条草稿`, ...result.notes]);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setAgentLoading(false);
    }
  }

  async function saveAgentSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSettingsSaved(false);
    try {
      const saved = await window.moneyPig.saveAgentSettings(agentSettings);
      setAgentSettings(saved);
      setSettingsSaved(true);
    } catch (err) {
      setError(errorMessage(err));
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

      <nav className="tabbar app-tabs" aria-label="主功能">
        <button className={activeTab === "ledger" ? "active" : ""} onClick={() => setActiveTab("ledger")}>
          <Landmark size={17} />
          记账
        </button>
        <button className={activeTab === "accounts" ? "active" : ""} onClick={() => setActiveTab("accounts")}>
          <WalletCards size={17} />
          账户
        </button>
        <button className={activeTab === "agent" ? "active" : ""} onClick={() => setActiveTab("agent")}>
          <Bot size={17} />
          Agent
        </button>
      </nav>

      {error ? <div className="error-banner">{error}</div> : null}

      {activeTab === "ledger" ? (
        <>
          <section className="summary-grid">
            <MetricCard label="净资产" value={state.summary.netWorth} tone="ink" />
            <MetricCard label="总资产" value={state.summary.totalAssets} tone="green" />
            <MetricCard label="总负债" value={state.summary.totalLiabilities} tone="red" />
            <MetricCard label="本月结余" value={state.summary.monthNet} tone="blue" />
            <MetricCard label="本月收入" value={state.summary.monthIncome} tone="green" />
            <MetricCard label="本月支出" value={state.summary.monthExpense} tone="orange" />
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
        </>
      ) : activeTab === "accounts" ? (
        <section className="accounts-page">
          <section className="summary-grid account-summary-grid">
            <MetricCard label="活跃账户" value={accountStats.activeCount} tone="ink" format="number" />
            <MetricCard label="资产账户" value={accountStats.assetCount} tone="green" format="number" />
            <MetricCard label="负债账户" value={accountStats.liabilityCount} tone="red" format="number" />
            <MetricCard label="平均余额" value={accountStats.averageBalance} tone="blue" />
          </section>

          <section className="accounts-workspace">
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
                    币种
                    <input
                      value={account.currency}
                      onChange={(event) => setAccount((current) => ({ ...current, currency: event.target.value }))}
                      required
                    />
                  </label>
                </div>
                <label>
                  初始余额
                  <input
                    type="number"
                    step="0.01"
                    value={account.openingBalance}
                    onChange={(event) =>
                      setAccount((current) => ({ ...current, openingBalance: Number(event.target.value) }))
                    }
                  />
                </label>
                <button className="primary-button" type="submit">
                  <Plus size={17} />
                  添加账户
                </button>
              </form>
            </section>

            <section className="panel accounts-chart-panel">
              <PanelTitle icon={<BarChart3 size={18} />} title="账户统计" />
              <div className="account-balance-chart">
                {accountStats.chartAccounts.length === 0 ? (
                  <div className="empty-row">暂无账户</div>
                ) : (
                  accountStats.chartAccounts.map((item) => (
                    <div className="account-bar-row" key={item.id}>
                      <span>{item.name}</span>
                      <div>
                        <i style={{ width: `${item.ratio}%` }} />
                      </div>
                      <strong>{formatMoney(item.currentBalance, item.currency)}</strong>
                    </div>
                  ))
                )}
              </div>
            </section>
          </section>

          <section className="panel">
            <PanelTitle icon={<CircleDollarSign size={18} />} title="账户管理" />
            <div className="account-management-list">
              {state.accounts.map((item) =>
                editingAccountId === item.id && accountDraft ? (
                  <form className="account-edit-row" key={item.id} onSubmit={submitAccountDraft}>
                    <input
                      value={accountDraft.name}
                      onChange={(event) => setAccountDraft((current) => current && { ...current, name: event.target.value })}
                      required
                    />
                    <select
                      value={accountDraft.kind}
                      onChange={(event) =>
                        setAccountDraft((current) =>
                          current && { ...current, kind: event.target.value as Account["kind"] }
                        )
                      }
                    >
                      {Object.entries(accountKindLabels).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                    <input
                      value={accountDraft.currency}
                      onChange={(event) =>
                        setAccountDraft((current) => current && { ...current, currency: event.target.value })
                      }
                      required
                    />
                    <input
                      type="number"
                      step="0.01"
                      value={accountDraft.openingBalance}
                      onChange={(event) =>
                        setAccountDraft((current) =>
                          current && { ...current, openingBalance: Number(event.target.value) }
                        )
                      }
                    />
                    <div className="account-row-actions">
                      <button className="primary-button fit" type="submit">
                        <CheckCircle2 size={16} />
                        保存
                      </button>
                      <button
                        className="secondary-button fit"
                        type="button"
                        onClick={() => {
                          setEditingAccountId(null);
                          setAccountDraft(null);
                        }}
                      >
                        取消
                      </button>
                    </div>
                  </form>
                ) : (
                  <article className={`account-manage-row ${item.archived ? "archived" : ""}`} key={item.id}>
                    <div className="account-manage-main">
                      <strong>{item.name}</strong>
                      <span>
                        {accountKindLabels[item.kind]} · {item.currency} · 初始 {formatMoney(item.openingBalance, item.currency)}
                        {item.archived ? " · 已归档" : ""}
                      </span>
                    </div>
                    <b>{formatMoney(item.currentBalance, item.currency)}</b>
                    <div className="account-row-actions">
                      <button className="icon-button small" title="编辑" onClick={() => startEditingAccount(item)}>
                        <Edit3 size={15} />
                      </button>
                      <button className="icon-button small" title="删除/归档" onClick={() => void deleteAccount(item.id)}>
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </article>
                )
              )}
            </div>
          </section>
        </section>
      ) : (
        <section className="agent-layout">
          <section className="panel agent-settings-panel">
            <PanelTitle icon={<Settings size={18} />} title="Agent 配置" />
            <form className="settings-form" onSubmit={saveAgentSettings}>
              <label>
                Provider
                <select value={agentSettings.provider} disabled>
                  <option value="minimax">Minimax</option>
                </select>
              </label>
              <label>
                API Key
                <input
                  type="password"
                  value={agentSettings.apiKey}
                  onChange={(event) =>
                    setAgentSettings((current) => ({ ...current, apiKey: event.target.value }))
                  }
                  placeholder="MINIMAX_API_KEY"
                />
              </label>
              <label>
                Base URL
                <input
                  value={agentSettings.baseUrl}
                  onChange={(event) =>
                    setAgentSettings((current) => ({ ...current, baseUrl: event.target.value }))
                  }
                />
              </label>
              <label>
                模型
                <input
                  value={agentSettings.model}
                  onChange={(event) => setAgentSettings((current) => ({ ...current, model: event.target.value }))}
                />
              </label>
              <button className="secondary-button" type="submit">
                <CheckCircle2 size={16} />
                保存配置
              </button>
              <div className="settings-status">
                {settingsSaved ? "配置已保存到本地" : agentSettings.updatedAt ? `上次保存 ${formatDateTime(agentSettings.updatedAt)}` : "尚未保存配置"}
              </div>
            </form>
          </section>

          <section className="panel agent-panel">
            <div className="agent-header">
              <PanelTitle icon={<Bot size={18} />} title="Agent 记账" />
              <div className="agent-actions">
                <label className="file-button">
                  <Upload size={16} />
                  上传账单
                  <input type="file" accept=".txt,.csv,.log,.text,image/*" multiple onChange={readAgentFile} />
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

            <div className="agent-input-grid" onDragOver={handleAgentDragOver} onDrop={handleAgentDrop}>
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
                  <option value="image">图片</option>
                </select>
              </label>
              <label className="agent-text-field">
                内容
                <textarea
                  value={agentText}
                  onChange={(event) => setAgentText(event.target.value)}
                  onPaste={handleAgentPaste}
                  placeholder="粘贴账单文本、口述内容，或直接粘贴/拖拽支付截图"
                />
              </label>
            </div>

            {agentImages.length > 0 ? (
              <div className="agent-image-grid" aria-label="已附加图片">
                {agentImages.map((image) => (
                  <figure className="agent-image-thumb" key={image.id}>
                    <img src={image.dataUrl} alt={image.name} />
                    <button
                      className="icon-button small"
                      type="button"
                      onClick={() => removeAgentImage(image.id)}
                      aria-label="移除图片"
                    >
                      <X size={14} />
                    </button>
                  </figure>
                ))}
              </div>
            ) : null}

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
        </section>
      )}
    </main>
  );
}

function MetricCard({
  label,
  value,
  tone,
  format = "money"
}: {
  label: string;
  value: number;
  tone: string;
  format?: "money" | "number";
}) {
  return (
    <article className={`metric-card ${tone}`}>
      <span>{label}</span>
      <strong>{format === "number" ? value : formatMoney(value)}</strong>
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

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function buildAccountStats(accounts: Account[]) {
  const activeAccounts = accounts.filter((item) => !item.archived);
  const assetKinds = new Set<Account["kind"]>(["cash", "bank", "investment", "asset"]);
  const liabilityKinds = new Set<Account["kind"]>(["credit", "liability"]);
  const chartAccounts = activeAccounts
    .slice()
    .sort((a, b) => Math.abs(b.currentBalance) - Math.abs(a.currentBalance))
    .slice(0, 8);
  const maxBalance = Math.max(...chartAccounts.map((item) => Math.abs(item.currentBalance)), 1);

  return {
    activeCount: activeAccounts.length,
    assetCount: activeAccounts.filter((item) => assetKinds.has(item.kind)).length,
    liabilityCount: activeAccounts.filter((item) => liabilityKinds.has(item.kind)).length,
    averageBalance:
      activeAccounts.length > 0
        ? activeAccounts.reduce((sum, item) => sum + item.currentBalance, 0) / activeAccounts.length
        : 0,
    chartAccounts: chartAccounts.map((item) => ({
      ...item,
      ratio: Math.max(6, (Math.abs(item.currentBalance) / maxBalance) * 100)
    }))
  };
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error("无法读取图片"));
      }
    });
    reader.addEventListener("error", () => reject(reader.error ?? new Error("无法读取图片")));
    reader.readAsDataURL(file);
  });
}

async function readUrlAsDataUrl(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`无法读取图片：${response.status}`);
  }
  const blob = await response.blob();
  return readFileAsDataUrl(new File([blob], decodeURIComponent(url.split("/").at(-1) || "image"), { type: blob.type }));
}

function isImageFileUrl(value: string): boolean {
  return /^file:\/\/.+\.(?:png|jpe?g|webp|gif|bmp)$/i.test(value);
}

function stripImageFileUrls(value: string): string {
  return value
    .split(/\s+/)
    .filter((part) => !isImageFileUrl(part))
    .join(" ")
    .trim();
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
