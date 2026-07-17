// Agent tab — settings, parser controls, image attachments, draft table.

import { ChangeEvent, ClipboardEvent, DragEvent, FormEvent } from "react";
import { Bot, CheckCircle2, FileText, Sparkles, Upload } from "lucide-react";
import type {
  Account,
  AgentDraftTransaction,
  AgentParseRequest,
  AgentSettings,
  AgentSourceType,
  Category
} from "../../../shared/types";
import { PanelTitle } from "../../components/PanelTitle";
import { AgentSettingsPanel } from "./AgentSettingsPanel";
import { AgentImageInput, type AgentImage } from "./AgentImageInput";
import { AgentDraftTable } from "./AgentDraftTable";
import { isDraftReady } from "./draftValidation";

export function AgentTab({
  accounts,
  categories,
  settings,
  settingsSaved,
  drafts,
  notes,
  images,
  sourceType,
  text,
  loading,
  onChangeSettings,
  onSubmitSettings,
  onChangeText,
  onChangeSourceType,
  onPaste,
  onDragOver,
  onDrop,
  onReadFile,
  onRemoveImage,
  onParse,
  onCommitDrafts,
  onChangeDraft,
  onRemoveDraft
}: {
  accounts: Account[];
  categories: Category[];
  settings: AgentSettings;
  settingsSaved: boolean;
  drafts: AgentDraftTransaction[];
  notes: string[];
  images: AgentImage[];
  sourceType: AgentSourceType;
  text: string;
  loading: boolean;
  onChangeSettings(next: AgentSettings): void;
  onSubmitSettings(event: FormEvent<HTMLFormElement>): void;
  onChangeText(next: string): void;
  onChangeSourceType(next: AgentSourceType): void;
  onPaste(event: ClipboardEvent<HTMLTextAreaElement>): void;
  onDragOver(event: DragEvent<HTMLDivElement>): void;
  onDrop(event: DragEvent<HTMLDivElement>): void;
  onReadFile(event: ChangeEvent<HTMLInputElement>): void;
  onRemoveImage(id: string): void;
  onParse(): void;
  onCommitDrafts(): void;
  onChangeDraft(id: string, patch: Partial<AgentDraftTransaction>): void;
  onRemoveDraft(id: string): void;
}) {
  const activeAccounts = accounts.filter((item) => !item.archived);
  const activeCategories = categories.filter((item) => !item.archived);

  return (
    <section className="agent-layout">
      <AgentSettingsPanel
        settings={settings}
        saved={settingsSaved}
        onChange={onChangeSettings}
        onSubmit={onSubmitSettings}
      />

      <section className="panel agent-panel">
        <div className="agent-header">
          <PanelTitle icon={<Bot size={18} />} title="Agent 记账" />
          <div className="agent-actions">
            <label className="file-button">
              <Upload size={16} />
              上传账单
              <input type="file" accept=".txt,.csv,.log,.text,image/*" multiple onChange={onReadFile} />
            </label>
            <button className="secondary-button fit" type="button" onClick={onParse} disabled={loading}>
              <Sparkles size={16} />
              {loading ? "解析中" : "生成草稿"}
            </button>
            <button
              className="primary-button fit"
              type="button"
              onClick={onCommitDrafts}
              disabled={drafts.filter(isDraftReady).length === 0}
            >
              <CheckCircle2 size={16} />
              确认写入
            </button>
          </div>
        </div>

        <div className="agent-input-grid" onDragOver={onDragOver} onDrop={onDrop}>
          <label>
            来源
            <select value={sourceType} onChange={(event) => onChangeSourceType(event.target.value as AgentSourceType)}>
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
              value={text}
              onChange={(event) => onChangeText(event.target.value)}
              onPaste={onPaste}
              placeholder="粘贴账单文本、口述内容，或直接粘贴/拖拽支付截图"
            />
          </label>
        </div>

        <AgentImageInput
          images={images}
          onPaste={onPaste}
          onDragOver={onDragOver}
          onDrop={onDrop}
          onRemove={onRemoveImage}
        />

        {notes.length > 0 ? (
          <div className="agent-notes">
            {notes.map((note) => (
              <span key={note}>{note}</span>
            ))}
          </div>
        ) : null}

        {drafts.length > 0 ? (
          <AgentDraftTable
            drafts={drafts}
            accounts={activeAccounts}
            categories={activeCategories}
            onChange={onChangeDraft}
            onRemove={onRemoveDraft}
          />
        ) : (
          <div className="agent-empty">
            <FileText size={17} />
            等待上传账单或输入口述内容
          </div>
        )}
      </section>
    </section>
  );
}

// Re-export the request type so the App layer can type its parse dispatch.
export type { AgentParseRequest };
