// Account management list — view/edit/delete rows for every account.
// Row-level edit state lives here so toggling between rows is purely local.

import { FormEvent, useState } from "react";
import { CheckCircle2, CircleDollarSign, Edit3, Trash2 } from "lucide-react";
import type { Account, AccountUpdateInput } from "../../../shared/types";
import { formatMoney } from "../../lib/format";
import { accountKindLabels } from "../../lib/labels";
import { PanelTitle } from "../../components/PanelTitle";
import { IconButton } from "../../components/IconButton";

export function AccountManagementList({
  accounts,
  onUpdate,
  onDelete
}: {
  accounts: Account[];
  onUpdate(input: AccountUpdateInput): Promise<void>;
  onDelete(id: string): Promise<void>;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<AccountUpdateInput | null>(null);

  function startEditing(item: Account) {
    setEditingId(item.id);
    setDraft({
      id: item.id,
      name: item.name,
      kind: item.kind,
      currency: item.currency,
      openingBalance: item.openingBalance
    });
  }

  function cancelEditing() {
    setEditingId(null);
    setDraft(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft) return;
    await onUpdate({ ...draft, openingBalance: Number(draft.openingBalance) });
    cancelEditing();
  }

  async function handleDelete(id: string) {
    await onDelete(id);
    if (editingId === id) {
      cancelEditing();
    }
  }

  return (
    <section className="panel">
      <PanelTitle icon={<CircleDollarSign size={18} />} title="账户管理" />
      <div className="account-management-list">
        {accounts.map((item) =>
          editingId === item.id && draft ? (
            <form className="account-edit-row" key={item.id} onSubmit={handleSubmit}>
              <input
                value={draft.name}
                onChange={(event) =>
                  setDraft((current) => current && { ...current, name: event.target.value })
                }
                required
              />
              <select
                value={draft.kind}
                onChange={(event) =>
                  setDraft((current) =>
                    current && { ...current, kind: event.target.value as Account["kind"] }
                  )
                }
              >
                {Object.entries(accountKindLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              <input
                value={draft.currency}
                onChange={(event) =>
                  setDraft((current) => current && { ...current, currency: event.target.value })
                }
                required
              />
              <input
                type="number"
                step="0.01"
                value={draft.openingBalance}
                onChange={(event) =>
                  setDraft((current) =>
                    current && { ...current, openingBalance: Number(event.target.value) }
                  )
                }
              />
              <div className="account-row-actions">
                <button className="primary-button fit" type="submit">
                  <CheckCircle2 size={16} />
                  保存
                </button>
                <button className="secondary-button fit" type="button" onClick={cancelEditing}>
                  取消
                </button>
              </div>
            </form>
          ) : (
            <article className={`account-manage-row ${item.archived ? "archived" : ""}`} key={item.id}>
              <div className="account-manage-main">
                <strong>{item.name}</strong>
                <span>
                  {accountKindLabels[item.kind]} · {item.currency} · 初始 {formatMoney(item.openingBalance, item.currency)}
                  {item.archived ? " · 已归档" : ""}
                </span>
              </div>
              <b>{formatMoney(item.currentBalance, item.currency)}</b>
              <div className="account-row-actions">
                <IconButton small title="编辑" onClick={() => startEditing(item)}>
                  <Edit3 size={15} />
                </IconButton>
                <IconButton small title="删除/归档" onClick={() => void handleDelete(item.id)}>
                  <Trash2 size={15} />
                </IconButton>
              </div>
            </article>
          )
        )}
      </div>
    </section>
  );
}
