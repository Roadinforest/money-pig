// Minimax HTTP client: builds the request body, calls fetch, parses the response,
// and produces human-readable debug output.

import type { AgentParseRequest, LedgerState } from "../../shared/types.js";
import { todayText } from "./date-parser.js";
import type { ModelDraft } from "./local-parser.js";

export const DEFAULT_MINIMAX_BASE_URL = "https://api.minimaxi.com/v1/chat/completions";
export const DEFAULT_MINIMAX_MODEL = "MiniMax-M1";

export interface MinimaxSettings {
  apiKey: string;
  baseUrl?: string;
  model?: string;
}

export interface MinimaxRequestDebug {
  baseUrl: string;
  model: string;
  sourceType: AgentParseRequest["sourceType"];
  contentLength: number;
  imageCount: number;
  apiKey: string;
}

export async function parseWithMinimax(
  input: AgentParseRequest,
  state: LedgerState,
  settings: MinimaxSettings
): Promise<ModelDraft[]> {
  const baseUrl = resolveMinimaxEndpoint(settings.baseUrl);
  const model = settings.model || DEFAULT_MINIMAX_MODEL;
  const response = await fetch(baseUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${settings.apiKey}`
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: buildSystemPrompt(state) },
        buildUserMessage(input)
      ],
      temperature: 0.1
    })
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`HTTP ${response.status}: ${summarizeResponseBody(body)}`);
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

export function buildUserMessage(input: AgentParseRequest) {
  const text = [
    `来源类型：${input.sourceType}`,
    "请从内容中提取记账草稿；如果是图片，请先识别图片中的账单、聊天记录、支付截图或口述截图文字。",
    "",
    "原始内容：",
    input.content || "(无文本，仅图片)"
  ].join("\n");

  const imageDataUrls = getImageDataUrls(input);
  if (imageDataUrls.length === 0) {
    return { role: "user" as const, content: text };
  }

  return {
    role: "user" as const,
    content: [
      { type: "text" as const, text },
      ...imageDataUrls.map((url) => ({ type: "image_url" as const, image_url: { url } }))
    ]
  };
}

export function getImageDataUrls(input: AgentParseRequest): string[] {
  return input.imageDataUrls?.length ? input.imageDataUrls : input.imageDataUrl ? [input.imageDataUrl] : [];
}

export function resolveMinimaxEndpoint(baseUrl: string | undefined): string {
  const trimmed = baseUrl?.trim();
  if (!trimmed) return DEFAULT_MINIMAX_BASE_URL;

  const withoutTrailingSlash = trimmed.replace(/\/+$/, "");
  if (withoutTrailingSlash.endsWith("/v1")) {
    return `${withoutTrailingSlash}/chat/completions`;
  }
  return withoutTrailingSlash;
}

export function buildMinimaxDebug(input: AgentParseRequest, settings: MinimaxSettings): MinimaxRequestDebug {
  return {
    baseUrl: settings.baseUrl ?? DEFAULT_MINIMAX_BASE_URL,
    model: settings.model ?? DEFAULT_MINIMAX_MODEL,
    sourceType: input.sourceType,
    contentLength: input.content.length,
    imageCount: getImageDataUrls(input).length,
    apiKey: settings.apiKey
  };
}

export function formatMinimaxDebug(debug: MinimaxRequestDebug): string {
  return [
    `URL=${debug.baseUrl}`,
    `model=${debug.model}`,
    `source=${debug.sourceType}`,
    `chars=${debug.contentLength}`,
    `images=${debug.imageCount}`,
    `key=${maskApiKey(debug.apiKey)}`
  ].join("，");
}

export function maskApiKey(apiKey: string): string {
  const trimmed = apiKey.trim();
  if (!trimmed) return "empty";
  if (trimmed.length <= 8) return `set(${trimmed.length})`;
  return `set(...${trimmed.slice(-4)})`;
}

export function summarizeResponseBody(body: string): string {
  const compact = body.replace(/\s+/g, " ").trim();
  if (!compact) return "(empty response body)";
  return compact.length > 300 ? `${compact.slice(0, 300)}...` : compact;
}

export function buildSystemPrompt(state: LedgerState): string {
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
    `当前日期：${todayText()}。遇到"今天"必须使用当前日期，"昨天/前天/明天/后天"必须基于当前日期计算。`,
    `可用账户：${accounts}`,
    `可用分类：${categories}`,
    "输出必须是严格 JSON，不要 Markdown，不要解释。",
    "JSON 结构：{\"transactions\":[{\"type\":\"expense|income|transfer\",\"amount\":数字,\"occurredOn\":\"YYYY-MM-DD\",\"note\":\"说明\",\"accountName\":\"账户名\",\"transferAccountName\":\"转入账户名或 null\",\"categoryName\":\"分类名或 null\",\"source\":\"原文片段\",\"confidence\":0到1}]}",
    "微信/支付宝账单中付款、消费、支出通常是 expense；收款、退款、工资、转入通常是 income；账户互转才是 transfer。",
    "无法确定账户时使用最可能的现有账户；无法确定分类时根据商户或备注选择最接近分类。"
  ].join("\n");
}

function parseJsonObject(content: string): { transactions?: unknown } {
  const trimmed = content.trim();
  if (trimmed.startsWith("{")) {
    return JSON.parse(trimmed) as { transactions?: unknown };
  }

  const match = trimmed.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("响应中未找到 JSON 对象");
  return JSON.parse(match[0]) as { transactions?: unknown };
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
