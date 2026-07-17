// Validation helpers for Agent-generated draft transactions.
// Lives next to the Agent feature so the draft table, parser and IPC all agree.

import type { AgentDraftTransaction } from "../../../shared/types";

export function isDraftReady(draft: AgentDraftTransaction): boolean {
  if (!draft.accountId || !draft.occurredOn || !Number.isFinite(draft.amount) || draft.amount <= 0) {
    return false;
  }

  if (draft.type === "transfer") {
    return Boolean(draft.transferAccountId && draft.transferAccountId !== draft.accountId);
  }

  return Boolean(draft.categoryId);
}

export function recomputeDraftWarnings(draft: AgentDraftTransaction): string[] {
  const warnings: string[] = [];
  if (!draft.accountId) warnings.push("缺少账户");
  if (!draft.occurredOn) warnings.push("缺少日期");
  if (!Number.isFinite(draft.amount) || draft.amount <= 0) warnings.push("金额必须大于 0");
  if (draft.type === "transfer") {
    if (!draft.transferAccountId) warnings.push("缺少转入账户");
    if (draft.transferAccountId && draft.transferAccountId === draft.accountId) {
      warnings.push("转出和转入不能相同");
    }
  } else if (!draft.categoryId) {
    warnings.push("缺少分类");
  }
  return warnings;
}
