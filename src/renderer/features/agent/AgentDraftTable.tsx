// Editable draft table for parsed agent transactions.

import { Trash2 } from "lucide-react";
import type { Account, AgentDraftTransaction, Category, TransactionType } from "../../../shared/types";
import { IconButton } from "../../components/IconButton";
import { Select } from "../../components/Select";
import { isDraftReady } from "./draftValidation";

export function AgentDraftTable({
  drafts,
  accounts,
  categories,
  onChange,
  onRemove
}: {
  drafts: AgentDraftTransaction[];
  accounts: Account[];
  categories: Category[];
  onChange(id: string, patch: Partial<AgentDraftTransaction>): void;
  onRemove(id: string): void;
}) {
  return (
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
      {drafts.map((draft) => (
        <AgentDraftRow
          key={draft.id}
          draft={draft}
          accounts={accounts}
          categories={categories}
          onChange={onChange}
          onRemove={onRemove}
        />
      ))}
    </div>
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
      <Select
        value={draft.type}
        onChange={(value) => {
          const type = value as TransactionType;
          const category = categories.find((item) => item.type === type);
          const transferAccount = accounts.find((item) => item.id !== draft.accountId);
          onChange(draft.id, {
            type,
            categoryId: type === "transfer" ? null : category?.id ?? "",
            transferAccountId: type === "transfer" ? transferAccount?.id ?? "" : null
          });
        }}
        options={[
          { value: "expense", label: "支出" },
          { value: "income", label: "收入" },
          { value: "transfer", label: "转账" }
        ]}
      />

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

      <Select
        value={draft.accountId}
        onChange={(accountId) => onChange(draft.id, { accountId })}
        options={[
          { value: "", label: "账户" },
          ...accounts.map((item) => ({ value: item.id, label: item.name }))
        ]}
      />

      {draft.type === "transfer" ? (
        <Select
          value={draft.transferAccountId ?? ""}
          onChange={(transferAccountId) => onChange(draft.id, { transferAccountId })}
          options={[
            { value: "", label: "转入账户" },
            ...accounts
              .filter((item) => item.id !== draft.accountId)
              .map((item) => ({ value: item.id, label: item.name }))
          ]}
        />
      ) : (
        <Select
          value={draft.categoryId ?? ""}
          onChange={(categoryId) => onChange(draft.id, { categoryId })}
          options={[
            { value: "", label: "分类" },
            ...typedCategories.map((item) => ({ value: item.id, label: item.name }))
          ]}
        />
      )}

      <input value={draft.note ?? ""} onChange={(event) => onChange(draft.id, { note: event.target.value })} />

      <IconButton small title="移除草稿" onClick={() => onRemove(draft.id)}>
        <Trash2 size={16} />
      </IconButton>

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
