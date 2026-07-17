import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type { AgentSettings } from "../shared/types.js";

const DEFAULT_AGENT_SETTINGS: AgentSettings = {
  provider: "minimax",
  apiKey: "",
  baseUrl: "https://api.minimaxi.com/v1/chat/completions",
  model: "MiniMax-M1",
  updatedAt: null
};

const LEGACY_MINIMAX_BASE_URLS = new Set([
  "https://api.minimax.io/v1/chat/completions"
]);

export class SettingsRepository {
  private settings: AgentSettings;

  private constructor(private readonly settingsPath: string) {
    this.settings = this.read();
    this.persist();
  }

  static open(userDataPath: string): SettingsRepository {
    return new SettingsRepository(join(userDataPath, "money-pig-settings.json"));
  }

  getAgentSettings(): AgentSettings {
    return { ...this.settings };
  }

  saveAgentSettings(input: AgentSettings): AgentSettings {
    this.settings = {
      provider: "minimax",
      apiKey: input.apiKey.trim(),
      baseUrl: normalizeBaseUrl(input.baseUrl),
      model: input.model.trim() || DEFAULT_AGENT_SETTINGS.model,
      updatedAt: new Date().toISOString()
    };
    this.persist();
    return this.getAgentSettings();
  }

  private read(): AgentSettings {
    if (!existsSync(this.settingsPath)) {
      return DEFAULT_AGENT_SETTINGS;
    }

    try {
      const parsed = JSON.parse(readFileSync(this.settingsPath, "utf8")) as Partial<AgentSettings>;
      return {
        ...DEFAULT_AGENT_SETTINGS,
        ...parsed,
        provider: "minimax",
        baseUrl: normalizeBaseUrl(parsed.baseUrl)
      };
    } catch {
      return DEFAULT_AGENT_SETTINGS;
    }
  }

  private persist(): void {
    mkdirSync(dirname(this.settingsPath), { recursive: true });
    writeFileSync(this.settingsPath, `${JSON.stringify(this.settings, null, 2)}\n`);
  }
}

function normalizeBaseUrl(baseUrl: string | undefined): string {
  const trimmed = baseUrl?.trim();
  if (!trimmed || LEGACY_MINIMAX_BASE_URLS.has(trimmed)) {
    return DEFAULT_AGENT_SETTINGS.baseUrl;
  }

  const withoutTrailingSlash = trimmed.replace(/\/+$/, "");
  if (withoutTrailingSlash.endsWith("/v1")) {
    return `${withoutTrailingSlash}/chat/completions`;
  }

  return withoutTrailingSlash;
}
