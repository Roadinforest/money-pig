// Local fallback parser — used when no Minimax key is configured (or the API fails).
// Also normalises Minimax JSON drafts into the shared AgentDraftTransaction shape.

import type {
  Account,
  AgentDraftTransaction,
  AgentParseRequest,
  Category,
  LedgerState,
  TransactionType
} from "../../shared/types.js";
import { resolveDateFromText, todayText } from "./date-parser.js";

// ---- Shared model shape returned by the LLM ---------------------------------

export interface ModelDraft {
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

// ---- Public entry points ----------------------------------------------------

export function parseLocally(input: AgentParseRequest, state: LedgerState): AgentDraftTransaction[] {
  const lines = input.content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const drafts: AgentDraftTransaction[] = [];
  for (const line of lines) {
    const amount = extractAmount(line);
    if (!amount) continue;

    const type = inferType(line);
    const occurredOn = resolveDateFromText(line) ?? todayText();
    const account = matchAccount(line, state.accounts) ?? firstActiveAccount(state.accounts);
    const category =
      type === "transfer" ? null : matchCategory(line, state.categories, type) ?? firstCategory(state.categories, type);
    const warnings: string[] = [];

    if (!resolveDateFromText(line)) warnings.push("未识别日期，已使用今天");
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

export function normalizeDrafts(drafts: ModelDraft[], state: LedgerState): AgentDraftTransaction[] {
  return drafts
    .filter((draft) => Number.isFinite(Number(draft.amount)) && Number(draft.amount) > 0)
    .map((draft) => {
      const type = normalizeType(draft.type);
      const source = draft.source?.trim() || draft.note?.trim() || "";
      const account =
        matchAccount(draft.accountName ?? source, state.accounts) ?? firstActiveAccount(state.accounts);
      const transferAccount =
        type === "transfer"
          ? matchAccount(draft.transferAccountName ?? source, state.accounts, account?.id) ??
            firstOtherAccount(state.accounts, account?.id)
          : null;
      const category =
        type === "transfer"
          ? null
          : matchCategory(draft.categoryName ?? source, state.categories, type) ??
            firstCategory(state.categories, type);
      const warnings: string[] = [];

      if (!account) warnings.push("缺少账户，需要手动补全");
      if (type === "transfer" && !transferAccount) warnings.push("缺少转入账户，需要手动补全");
      if (type !== "transfer" && !category) warnings.push("缺少分类，需要手动补全");

      return {
        id: crypto.randomUUID(),
        type,
        accountId: account?.id ?? "",
        transferAccountId: transferAccount?.id ?? null,
        categoryId: category?.id ?? null,
        amount: Number(draft.amount),
        occurredOn:
          resolveDateFromText(source) ??
          resolveDateFromText(draft.note ?? "") ??
          normalizeDate(draft.occurredOn) ??
          todayText(),
        note: draft.note?.trim() || source,
        source,
        confidence: clamp(Number(draft.confidence ?? 0.76), 0, 1),
        warnings
      };
    });
}

// ---- Building blocks --------------------------------------------------------

export function inferType(text: string): TransactionType {
  if (/转账|转入|转出|提现|充值/.test(text)) return "transfer";
  if (/收入|收款|工资|奖金|退款|报销|到账|入账/.test(text)) return "income";
  return "expense";
}

export function normalizeType(type: TransactionType | string | undefined): TransactionType {
  if (type === "income" || type === "transfer") return type;
  return "expense";
}

export function extractAmount(text: string): number | null {
  const textWithoutDates = text
    .replace(/20\d{2}[-/.年]\d{1,2}[-/.月]\d{1,2}[日]?/g, " ")
    .replace(/\d{1,2}[-/月]\d{1,2}[日]?/g, " ");
  const explicit =
    textWithoutDates.match(/[+-]?\s*(?:¥|￥)\s*(\d+(?:\.\d{1,2})?)/) ??
    textWithoutDates.match(/[+-]?\s*(\d+(?:\.\d{1,2})?)\s*(?:元|块|rmb|RMB)/);

  if (explicit) return Number(explicit[1]);

  const matches = [...textWithoutDates.matchAll(/[+-]?\s*(\d+(?:\.\d{1,2})?)/g)];
  const lastMatch = matches.at(-1);
  return lastMatch ? Number(lastMatch[1]) : null;
}

export function matchAccount(
  text: string,
  accounts: Account[],
  excludeId?: string
): Account | undefined {
  const activeAccounts = accounts.filter((account) => !account.archived && account.id !== excludeId);
  return activeAccounts.find((account) => text.includes(account.name));
}

export function firstActiveAccount(accounts: Account[]): Account | undefined {
  return accounts.find((account) => !account.archived);
}

export function firstOtherAccount(accounts: Account[], accountId: string | undefined): Account | undefined {
  return accounts.find((account) => !account.archived && account.id !== accountId);
}

export function matchCategory(
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

export function firstCategory(
  categories: Category[],
  type: Exclude<TransactionType, "transfer">
): Category | undefined {
  return categories.find((category) => !category.archived && category.type === type);
}

export function inferCategoryName(text: string, type: Exclude<TransactionType, "transfer">): string {
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

export function cleanNote(text: string): string {
  return text.replace(/\s+/g, " ").slice(0, 120);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

// normalizeDate is re-exported so ledger-agent can pass drafts through it
// without importing the date parser module directly.
import { normalizeDate } from "./date-parser.js";
