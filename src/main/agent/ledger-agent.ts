// Top-level Agent entry point. Tries the configured Minimax provider first
// and falls back to the local regex parser on failure / missing key.

import type { AgentParseRequest, AgentParseResult } from "../../shared/types.js";
import type { LedgerRepository } from "../database.js";
import type { SettingsRepository } from "../settings.js";
import {
  buildMinimaxDebug,
  DEFAULT_MINIMAX_BASE_URL,
  DEFAULT_MINIMAX_MODEL,
  errorMessage,
  formatMinimaxDebug,
  getImageDataUrls,
  maskApiKey,
  parseWithMinimax,
  resolveMinimaxEndpoint
} from "./minimax-client.js";
import { normalizeDrafts, parseLocally } from "./local-parser.js";

export class LedgerAgent {
  constructor(
    private readonly repository: LedgerRepository,
    private readonly settings: SettingsRepository
  ) {}

  async parseTransactions(input: AgentParseRequest): Promise<AgentParseResult> {
    const state = this.repository.getState();
    const notes: string[] = [];

    const agentSettings = this.settings.getAgentSettings();
    const apiKey = agentSettings.apiKey || process.env.MINIMAX_API_KEY;

    if (apiKey) {
      const baseUrl = resolveMinimaxEndpoint(agentSettings.baseUrl || process.env.MINIMAX_BASE_URL);
      const model = agentSettings.model || process.env.MINIMAX_MODEL || DEFAULT_MINIMAX_MODEL;
      const debug = buildMinimaxDebug(input, { apiKey, baseUrl, model });
      notes.push(`Minimax 请求：${formatMinimaxDebug(debug)}`);

      try {
        const drafts = await parseWithMinimax(input, state, { apiKey, baseUrl, model });
        return {
          provider: "minimax",
          drafts: normalizeDrafts(drafts, state),
          notes
        };
      } catch (error) {
        const message = errorMessage(error);
        console.warn("[MoneyPig Agent] Minimax parse failed", {
          ...debug,
          apiKey: maskApiKey(debug.apiKey),
          error: message
        });
        notes.push(`Minimax 解析失败，已切换本地解析：${message}`);
      }
    } else if (getImageDataUrls(input).length > 0) {
      notes.push("未配置 Minimax API Key，图片无法本地识别。");
    } else {
      notes.push("未配置 Minimax API Key，已使用本地解析。");
    }

    return {
      provider: "local",
      drafts: getImageDataUrls(input).length > 0 ? [] : parseLocally(input, state),
      notes
    };
  }
}

// Kept so the public DEFAULT_MINIMAX_BASE_URL / DEFAULT_MINIMAX_MODEL constants
// remain discoverable to anyone reading this module's exports tree.
export { DEFAULT_MINIMAX_BASE_URL, DEFAULT_MINIMAX_MODEL } from "./minimax-client.js";
