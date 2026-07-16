import type {
  Account,
  AgentDraftTransaction,
  AgentParseRequest,
  AgentParseResult,
  Category,
  LedgerState,
  TransactionInput,
  TransactionType
} from "../shared/types.js";
import type { LedgerRepository } from "./database.js";

interface ModelDraft {
  type: TransactionType;
  amount: number;
  occurredOn?: string;
  note?: string;
  accountName?: string;
  transferAccountName?: string | null;
  categoryName?: string | null;
  source?: string;
  confidence?: number;
}

const DEFAULT_MINIMAX_BASE_URL = "https://api.minimax.io/v1/chat/completions";
const DEFAULT_MINIMAX_MODEL = "MiniMax-M1";

export class LedgerAgent {
  constructor(private readonly repository: LedgerRepository) {}

  async parseTransactions(input: AgentParseRequest): Promise<AgentParseResult> {
    const state = this.repository.getState();
    const notes: string[] = [];

    if (process.env.MINIMAX_API_KEY) {
      try {
        const drafts = await parseWithMinimax(input, state);
        return {
          provider: "minimax",
          drafts: normalizeDrafts(drafts, state),
          notes
        };
      } catch (error) {
        notes.push(`Minimax 解析失败，已切换本地解析：${errorMessage(error)}`);
      }
    } else {
      notes.push("未配置 MINIMAX_API_KEY，已使用本地解析。");
    }

    return {
      provider: "local",
      drafts: parseLocally(input, state),
      notes
    };
  }
}

async function parseWithMinimax(input: AgentParseRequest, state: LedgerState): Promise<ModelDraft[]> {
  const baseUrl = process.env.MINIMAX_BASE_URL ?? DEFAULT_MINIMAX_BASE_URL;
  const model = process.env.MINIMAX_MODEL ?? DEFAULT_MINIMAX_MODEL;
  const response = await fetch(baseUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.MINIMAX_API_KEY}`
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "system",
          content: buildSystemPrompt(state)
        },
        {
          role: "user",
          content: `来源类型：${input.sourceType}\n\n原始内容：\n${input.content}`
        }
      ],
      temperature: 0.1
    })
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${await response.text()}`);
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
    reply?: string;
  };
  const content = payload.choices?.[0]?.message?.content ?? payload.reply;
  if (!content) {
    throw new Error("Minimax 响应为空");
  }

  const parsed = parseJsonObject(content);
  if (!Array.isArray(parsed.transactions)) {
    throw new Error("Minimax 响应缺少 transactions 数组");
  }

  return parsed.transactions as ModelDraft[];
}

function buildSystemPrompt(state: LedgerState): string {
  const accounts = state.accounts
    .filter((account) => !account.archived)
    .map((account) => `${account.name}(${account.kind})`)
    .join("、");
  const categories = state.categories
    .filter((category) => !category.archived)
    .map((category) => `${category.name}(${category.type})`)
    .join("、");

  return [
    "你是 Money Pig 的本地记账 Agent，只负责从微信账单、支付宝账单、用户口述文本中提取候选账目。",
    "你不能写入数据库，只能返回 JSON 草稿，由用户确认后再入库。",
    `可用账户：${accounts}`,
    `可用分类：${categories}`,
    "输出必须是严格 JSON，不要 Markdown，不要解释。",
    "JSON 结构：{\"transactions\":[{\"type\":\"expense|income|transfer\",\"amount\":数字,\"occurredOn\":\"YYYY-MM-DD\",\"note\":\"说明\",\"accountName\":\"账户名\",\"transferAccountName\":\"转入账户名或 null\",\"categoryName\":\"分类名或 null\",\"source\":\"原文片段\",\"confidence\":0到1}]}",
    "微信/支付宝账单中付款、消费、支出通常是 expense；收款、退款、工资、转入通常是 income；账户互转才是 transfer。",
    "无法确定账户时使用最可能的现有账户；无法确定分类时根据商户或备注选择最接近分类。"
  ].join("\n");
}

function parseLocally(input: AgentParseRequest, state: LedgerState): AgentDraftTransaction[] {
  const lines = input.content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const drafts: AgentDraftTransaction[] = [];
  for (const line of lines) {
    const amount = extractAmount(line);
    if (!amount) {
      continue;
    }

    const type = inferType(line);
    const occurredOn = extractDate(line) ?? todayText();
    const account = matchAccount(line, state.accounts) ?? firstActiveAccount(state.accounts);
    const category =
      type === "transfer" ? null : matchCategory(line, state.categories, type) ?? firstCategory(state.categories, type);
    const warnings: string[] = [];

    if (!extractDate(line)) {
      warnings.push("未识别日期，已使用今天");
    }
    if (!matchAccount(line, state.accounts)) {
      warnings.push(`未识别账户，已使用 ${account?.name ?? "默认账户"}`);
    }
    if (type !== "transfer" && !matchCategory(line, state.categories, type)) {
      warnings.push(`未识别分类，已使用 ${category?.name ?? "默认分类"}`);
    }

    if (!account || (type !== "transfer" && !category)) {
      warnings.push("缺少账户或分类，需要手动补全");
    }

    drafts.push({
      id: crypto.randomUUID(),
      type,
      accountId: account?.id ?? "",
      transferAccountId: null,
      categoryId: category?.id ?? null,
      amount,
      occurredOn,
      note: cleanNote(line),
      source: line,
      confidence: warnings.length > 0 ? 0.62 : 0.82,
      warnings
    });
  }

  return drafts;
}

function normalizeDrafts(drafts: ModelDraft[], state: LedgerState): AgentDraftTransaction[] {
  return drafts
    .filter((draft) => Number.isFinite(Number(draft.amount)) && Number(draft.amount) > 0)
    .map((draft) => {
      const type = normalizeType(draft.type);
      const source = draft.source?.trim() || draft.note?.trim() || "";
      const account = matchAccount(draft.accountName ?? source, state.accounts) ?? firstActiveAccount(state.accounts);
      const transferAccount =
        type === "transfer"
          ? matchAccount(draft.transferAccountName ?? source, state.accounts, account?.id) ??
            firstOtherAccount(state.accounts, account?.id)
          : null;
      const category =
        type === "transfer"
          ? null
          : matchCategory(draft.categoryName ?? source, state.categories, type) ?? firstCategory(state.categories, type);
      const warnings: string[] = [];

      if (!account) {
        warnings.push("缺少账户，需要手动补全");
      }
      if (type === "transfer" && !transferAccount) {
        warnings.push("缺少转入账户，需要手动补全");
      }
      if (type !== "transfer" && !category) {
        warnings.push("缺少分类，需要手动补全");
      }

      return {
        id: crypto.randomUUID(),
        type,
        accountId: account?.id ?? "",
        transferAccountId: transferAccount?.id ?? null,
        categoryId: category?.id ?? null,
        amount: Number(draft.amount),
        occurredOn: normalizeDate(draft.occurredOn) ?? todayText(),
        note: draft.note?.trim() || source,
        source,
        confidence: clamp(Number(draft.confidence ?? 0.76), 0, 1),
        warnings
      };
    });
}

function parseJsonObject(content: string): { transactions?: unknown } {
  const trimmed = content.trim();
  if (trimmed.startsWith("{")) {
    return JSON.parse(trimmed) as { transactions?: unknown };
  }

  const match = trimmed.match(/\{[\s\S]*\}/);
  if (!match) {
    throw new Error("响应中未找到 JSON 对象");
  }

  return JSON.parse(match[0]) as { transactions?: unknown };
}

function inferType(text: string): TransactionType {
  if (/转账|转入|转出|提现|充值/.test(text)) {
    return "transfer";
  }
  if (/收入|收款|工资|奖金|退款|报销|到账|入账/.test(text)) {
    return "income";
  }
  return "expense";
}

function normalizeType(type: TransactionType | string | undefined): TransactionType {
  if (type === "income" || type === "transfer") {
    return type;
  }
  return "expense";
}

function extractAmount(text: string): number | null {
  const textWithoutDates = text
    .replace(/20\d{2}[-/.年]\d{1,2}[-/.月]\d{1,2}[日]?/g, " ")
    .replace(/\d{1,2}[-/月]\d{1,2}[日]?/g, " ");
  const explicit =
    textWithoutDates.match(/[+-]?\s*(?:¥|￥)\s*(\d+(?:\.\d{1,2})?)/) ??
    textWithoutDates.match(/[+-]?\s*(\d+(?:\.\d{1,2})?)\s*(?:元|块|rmb|RMB)/);

  if (explicit) {
    return Number(explicit[1]);
  }

  const matches = [...textWithoutDates.matchAll(/[+-]?\s*(\d+(?:\.\d{1,2})?)/g)];
  const lastMatch = matches.at(-1);
  if (!lastMatch) {
    return null;
  }
  return Number(lastMatch[1]);
}

function extractDate(text: string): string | null {
  const full = text.match(/(20\d{2})[-/.年](\d{1,2})[-/.月](\d{1,2})/);
  if (full) {
    return `${full[1]}-${pad(full[2])}-${pad(full[3])}`;
  }

  const partial = text.match(/(\d{1,2})[-/月](\d{1,2})/);
  if (partial) {
    return `${new Date().getFullYear()}-${pad(partial[1])}-${pad(partial[2])}`;
  }

  return null;
}

function normalizeDate(value: string | undefined): string | null {
  if (!value) {
    return null;
  }
  return extractDate(value) ?? (/^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null);
}

function matchAccount(text: string, accounts: Account[], excludeId?: string): Account | undefined {
  const activeAccounts = accounts.filter((account) => !account.archived && account.id !== excludeId);
  return activeAccounts.find((account) => text.includes(account.name));
}

function firstActiveAccount(accounts: Account[]): Account | undefined {
  return accounts.find((account) => !account.archived);
}

function firstOtherAccount(accounts: Account[], accountId: string | undefined): Account | undefined {
  return accounts.find((account) => !account.archived && account.id !== accountId);
}

function matchCategory(
  text: string,
  categories: Category[],
  type: Exclude<TransactionType, "transfer">
): Category | undefined {
  const activeCategories = categories.filter((category) => !category.archived && category.type === type);
  return (
    activeCategories.find((category) => text.includes(category.name)) ??
    activeCategories.find((category) => category.name === inferCategoryName(text, type))
  );
}

function firstCategory(categories: Category[], type: Exclude<TransactionType, "transfer">): Category | undefined {
  return categories.find((category) => !category.archived && category.type === type);
}

function inferCategoryName(text: string, type: Exclude<TransactionType, "transfer">): string {
  if (type === "income") {
    if (/工资|薪资|奖金/.test(text)) return "工资";
    if (/投资|基金|股票|理财|收益/.test(text)) return "投资收益";
    return "副业";
  }

  if (/餐|饭|咖啡|奶茶|外卖|美团|饿了么/.test(text)) return "餐饮";
  if (/地铁|公交|打车|滴滴|高铁|机票|停车|加油/.test(text)) return "交通";
  if (/淘宝|京东|拼多多|购物|超市|便利店/.test(text)) return "购物";
  if (/房租|物业|水电|燃气|宽带/.test(text)) return "住房";
  if (/电影|游戏|会员|娱乐/.test(text)) return "娱乐";
  if (/医院|药|医保|门诊/.test(text)) return "医疗";
  return "购物";
}

function cleanNote(text: string): string {
  return text.replace(/\s+/g, " ").slice(0, 120);
}

function todayText(): string {
  const now = new Date();
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

function pad(value: string | number): string {
  return String(value).padStart(2, "0");
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
