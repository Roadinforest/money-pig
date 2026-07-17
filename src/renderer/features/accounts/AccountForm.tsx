// Form used on the Accounts tab to create a new account.
// Local state; the parent's submit callback does the IPC + state update.

import { FormEvent, useState } from "react";
import { Plus } from "lucide-react";
import type { Account, AccountInput } from "../../../shared/types";
import { PanelTitle } from "../../components/PanelTitle";
import { Select } from "../../components/Select";
import { accountKindLabels } from "../../lib/labels";

export function AccountForm({ onSubmit }: { onSubmit(input: AccountInput): Promise<void> }) {
  const [draft, setDraft] = useState<AccountInput>({
    name: "",
    kind: "bank",
    currency: "CNY",
    openingBalance: 0
  });

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onSubmit({ ...draft, openingBalance: Number(draft.openingBalance) });
    setDraft({ name: "", kind: "bank", currency: "CNY", openingBalance: 0 });
  }

  return (
    <section className="panel">
      <PanelTitle icon={<Plus size={18} />} title="新增账户" />
      <form className="compact-form" onSubmit={handleSubmit}>
        <label>
          名称
          <input
            value={draft.name}
            onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
            required
          />
        </label>
        <div className="two-fields">
          <label>
            类型
            <Select
              value={draft.kind}
              onChange={(kind) =>
                setDraft((current) => ({ ...current, kind: kind as Account["kind"] }))
              }
              options={Object.entries(accountKindLabels).map(([value, label]) => ({
                value,
                label
              }))}
            />
          </label>
          <label>
            币种
            <input
              value={draft.currency}
              onChange={(event) => setDraft((current) => ({ ...current, currency: event.target.value }))}
              required
            />
          </label>
        </div>
        <label>
          初始余额
          <input
            type="number"
            step="0.01"
            value={draft.openingBalance}
            onChange={(event) =>
              setDraft((current) => ({ ...current, openingBalance: Number(event.target.value) }))
            }
          />
        </label>
        <button className="primary-button" type="submit">
          <Plus size={17} />
          添加账户
        </button>
      </form>
    </section>
  );
}
