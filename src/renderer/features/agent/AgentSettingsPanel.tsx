// Agent settings form (Minimax provider, key, base URL, model).
// The settings object itself is owned by the parent so saves propagate app-wide.

import { FormEvent } from "react";
import { CheckCircle2, Settings } from "lucide-react";
import type { AgentSettings } from "../../../shared/types";
import { PanelTitle } from "../../components/PanelTitle";
import { Select } from "../../components/Select";
import { formatDateTime } from "../../lib/format";

export function AgentSettingsPanel({
  settings,
  saved,
  onChange,
  onSubmit
}: {
  settings: AgentSettings;
  saved: boolean;
  onChange(next: AgentSettings): void;
  onSubmit(event: FormEvent<HTMLFormElement>): void;
}) {
  return (
    <section className="panel agent-settings-panel">
      <PanelTitle icon={<Settings size={18} />} title="Agent 配置" />
      <form className="settings-form" onSubmit={onSubmit}>
        <label>
          Provider
          <Select
            value={settings.provider}
            onChange={() => {
              /* provider is fixed in this build */
            }}
            disabled
            options={[{ value: "minimax", label: "Minimax" }]}
          />
        </label>
        <label>
          API Key
          <input
            type="password"
            value={settings.apiKey}
            onChange={(event) => onChange({ ...settings, apiKey: event.target.value })}
            placeholder="MINIMAX_API_KEY"
          />
        </label>
        <label>
          Base URL
          <input
            value={settings.baseUrl}
            onChange={(event) => onChange({ ...settings, baseUrl: event.target.value })}
          />
        </label>
        <label>
          模型
          <input
            value={settings.model}
            onChange={(event) => onChange({ ...settings, model: event.target.value })}
          />
        </label>
        <button className="secondary-button" type="submit">
          <CheckCircle2 size={16} />
          保存配置
        </button>
        <div className="settings-status">
          {saved
            ? "配置已保存到本地"
            : settings.updatedAt
            ? `上次保存 ${formatDateTime(settings.updatedAt)}`
            : "尚未保存配置"}
        </div>
      </form>
    </section>
  );
}
