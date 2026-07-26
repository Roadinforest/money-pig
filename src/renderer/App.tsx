// Top-level App: loads ledger + settings, owns shared state, dispatches IPC calls,
// and delegates rendering to feature tabs.

import {
  ChangeEvent,
  ClipboardEvent,
  DragEvent,
  FormEvent,
  lazy,
  Suspense,
  useEffect,
  useState
} from "react";
import { RefreshCw } from "lucide-react";
import type {
  Account,
  AccountInput,
  AccountUpdateInput,
  AgentDraftTransaction,
  AgentSettings,
  AgentSourceType,
  CategoryInput,
  LedgerState,
  TransactionInput,
  TransactionUpdateInput
} from "../shared/types";
import { errorMessage } from "./lib/errors";
import { formatDateInput } from "./lib/format";
import { readFileAsDataUrl, readUrlAsDataUrl, stripImageFileUrls, isImageFileUrl } from "./lib/files";
import { TABS, type AppTab } from "./app/tabs";
import { LedgerTab } from "./features/ledger/LedgerTab";
import { TransactionsTab } from "./features/transactions/TransactionsTab";
import { AccountsTab } from "./features/accounts/AccountsTab";
import { AgentTab } from "./features/agent/AgentTab";
import type { AgentImage } from "./features/agent/AgentImageInput";
import { recomputeDraftWarnings } from "./features/agent/draftValidation";

const StatsTab = lazy(() =>
  import("./features/stats/StatsTab").then((module) => ({ default: module.StatsTab }))
);

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

  const [statsAccountId, setStatsAccountId] = useState("all");

  useEffect(() => {
    void load();
  }, []);

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

  // ---- Transaction + account/category handlers -------------------------------

  async function createTransaction(input: TransactionInput) {
    setError("");
    try {
      const nextState = await window.moneyPig.createTransaction(input);
      setState(nextState);
    } catch (err) {
      setError(errorMessage(err));
      throw err;
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

  async function updateTransaction(input: TransactionUpdateInput) {
    setError("");
    try {
      setState(await window.moneyPig.updateTransaction(input));
    } catch (err) {
      setError(errorMessage(err));
      throw err;
    }
  }

  async function createAccount(input: AccountInput) {
    setError("");
    try {
      setState(await window.moneyPig.createAccount(input));
    } catch (err) {
      setError(errorMessage(err));
      throw err;
    }
  }

  async function updateAccount(input: AccountUpdateInput) {
    setError("");
    try {
      setState(await window.moneyPig.updateAccount(input));
    } catch (err) {
      setError(errorMessage(err));
      throw err;
    }
  }

  async function deleteAccount(id: string) {
    setError("");
    try {
      setState(await window.moneyPig.deleteAccount(id));
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  async function createCategory(input: CategoryInput) {
    setError("");
    try {
      setState(await window.moneyPig.createCategory(input));
    } catch (err) {
      setError(errorMessage(err));
      throw err;
    }
  }

  // ---- Agent settings handlers ------------------------------------------------

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

  // ---- Agent file / image handlers -------------------------------------------

  async function readAgentFile(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    const firstFile = files[0];
    if (!firstFile) return;

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
    if (images.length === 0) return false;

    setError("");
    try {
      await useAgentImages(images);
    } catch (err) {
      setError(errorMessage(err));
    }
    return true;
  }

  async function readAgentImageFromFileUrls(urls: string[]) {
    const imageUrls = urls.filter(isImageFileUrl);
    if (imageUrls.length === 0) return false;

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

  // ---- Agent parse + commit ---------------------------------------------------

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
      setAgentNotes([
        `${result.provider === "minimax" ? "Minimax" : "本地解析"} 生成 ${result.drafts.length} 条草稿`,
        ...result.notes
      ]);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setAgentLoading(false);
    }
  }

  async function commitAgentDrafts() {
    setError("");
    const validDrafts = agentDrafts.filter((draft) => isDraftReadyLocal(draft));
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
        {TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} className={activeTab === id ? "active" : ""} onClick={() => setActiveTab(id)}>
            <Icon size={17} />
            {label}
          </button>
        ))}
      </nav>

      {error ? <div className="error-banner">{error}</div> : null}

      {loading ? null : activeTab === "ledger" ? (
        <LedgerTab
          accounts={state.accounts}
          categories={state.categories}
          transactions={state.transactions}
          summary={state.summary}
          onCreateTransaction={createTransaction}
          onCreateAccount={createAccount}
          onCreateCategory={createCategory}
          onUpdateTransaction={updateTransaction}
          onDeleteTransaction={deleteTransaction}
        />
      ) : activeTab === "transactions" ? (
        <TransactionsTab
          accounts={state.accounts}
          categories={state.categories}
          transactions={state.transactions}
          onUpdateTransaction={updateTransaction}
          onDeleteTransaction={deleteTransaction}
        />
      ) : activeTab === "accounts" ? (
        <AccountsTab
          accounts={state.accounts}
          onCreateAccount={createAccount}
          onUpdateAccount={updateAccount}
          onDeleteAccount={deleteAccount}
        />
      ) : activeTab === "stats" ? (
        <Suspense fallback={<div className="panel empty-row">正在加载统计图表…</div>}>
          <StatsTab
            accounts={state.accounts}
            categories={state.categories}
            transactions={state.transactions}
            accountId={statsAccountId}
            onChangeAccount={setStatsAccountId}
          />
        </Suspense>
      ) : (
        <AgentTab
          accounts={state.accounts}
          categories={state.categories}
          settings={agentSettings}
          settingsSaved={settingsSaved}
          drafts={agentDrafts}
          notes={agentNotes}
          images={agentImages}
          sourceType={agentSourceType}
          text={agentText}
          loading={agentLoading}
          onChangeSettings={setAgentSettings}
          onSubmitSettings={saveAgentSettings}
          onChangeText={setAgentText}
          onChangeSourceType={setAgentSourceType}
          onPaste={handleAgentPaste}
          onDragOver={handleAgentDragOver}
          onDrop={handleAgentDrop}
          onReadFile={readAgentFile}
          onRemoveImage={removeAgentImage}
          onParse={parseWithAgent}
          onCommitDrafts={commitAgentDrafts}
          onChangeDraft={updateAgentDraft}
          onRemoveDraft={removeAgentDraft}
        />
      )}
    </main>
  );
}

// Local re-export keeps the imports section above tidy.
function isDraftReadyLocal(draft: AgentDraftTransaction): boolean {
  return Boolean(draft.accountId) && Boolean(draft.occurredOn) && draft.amount > 0;
}
