// Transaction creation form. Local state lives here; the parent handles submit + reset.

import { ArrowDownLeft, ArrowRightLeft, ArrowUpRight, Plus } from "lucide-react";
import { FormEvent, useState } from "react";
import type { Account, Category, TransactionInput, TransactionType } from "../../../shared/types";
import { PanelTitle } from "../../components/PanelTitle";
import { Select } from "../../components/Select";
import { transactionTypeLabels } from "../../lib/labels";
import { formatDateInput } from "../../lib/format";

const TRANSACTION_TYPES: TransactionType[] = ["expense", "income", "transfer"];

const emptyDraft = (accounts: Account[]): TransactionInput => ({
  type: "expense",
  accountId: accounts[0]?.id ?? "",
  categoryId: "",
  transferAccountId: "",
  amount: 0,
  occurredOn: formatDateInput(new Date()),
  note: ""
});

export function TransactionForm({
  accounts,
  categories,
  onSubmit
}: {
  accounts: Account[];
  categories: Category[];
  onSubmit(input: TransactionInput): Promise<void>;
}) {
  const activeAccounts = accounts.filter((item) => !item.archived);
  const [draft, setDraft] = useState<TransactionInput>(() => emptyDraft(activeAccounts));

  // Keep accountId valid when the underlying list changes.
  if (draft.accountId === "" && activeAccounts[0]) {
    setDraft((current) => ({ ...current, accountId: activeAccounts[0].id }));
  }

  const activeCategories = categories.filter(
    (item) => !item.archived && item.type === draft.type
  );

  function updateType(type: TransactionType) {
    const firstCategory = categories.find((item) => item.type === type && !item.archived);
    const secondAccount = activeAccounts.find((item) => item.id !== draft.accountId);

    setDraft((current) => ({
      ...current,
      type,
      categoryId: type === "transfer" ? null : firstCategory?.id ?? "",
      transferAccountId: type === "transfer" ? secondAccount?.id ?? "" : null
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const payload: TransactionInput = {
      ...draft,
      categoryId: draft.type === "transfer" ? null : draft.categoryId,
      transferAccountId: draft.type === "transfer" ? draft.transferAccountId : null,
      amount: Number(draft.amount)
    };
    await onSubmit(payload);
    setDraft((current) => ({
      ...current,
      amount: 0,
      note: "",
      occurredOn: formatDateInput(new Date())
    }));
  }

  return (
    <section className="panel">
      <PanelTitle icon={<Plus size={18} />} title="记一笔" />
      <form className="form-grid transaction-form" onSubmit={handleSubmit}>
        <div className="segmented" role="group" aria-label="交易类型">
          {TRANSACTION_TYPES.map((type) => (
            <button
              key={type}
              type="button"
              className={draft.type === type ? "active" : ""}
              onClick={() => updateType(type)}
            >
              {type === "expense" ? <ArrowUpRight size={16} /> : null}
              {type === "income" ? <ArrowDownLeft size={16} /> : null}
              {type === "transfer" ? <ArrowRightLeft size={16} /> : null}
              {transactionTypeLabels[type]}
            </button>
          ))}
        </div>

        <label>
          金额
          <input
            type="number"
            min="0.01"
            step="0.01"
            value={draft.amount || ""}
            onChange={(event) =>
              setDraft((current) => ({ ...current, amount: Number(event.target.value) }))
            }
            required
          />
        </label>

        <label>
          日期
          <input
            type="date"
            value={draft.occurredOn}
            onChange={(event) => setDraft((current) => ({ ...current, occurredOn: event.target.value }))}
            required
          />
        </label>

        <label>
          账户
          <Select
            value={draft.accountId}
            onChange={(accountId) => setDraft((current) => ({ ...current, accountId }))}
            options={activeAccounts.map((item) => ({ value: item.id, label: item.name }))}
          />
        </label>

        {draft.type === "transfer" ? (
          <label>
            转入
            <Select
              value={draft.transferAccountId ?? ""}
              onChange={(transferAccountId) =>
                setDraft((current) => ({ ...current, transferAccountId }))
              }
              options={[
                { value: "", label: "选择账户" },
                ...activeAccounts
                  .filter((item) => item.id !== draft.accountId)
                  .map((item) => ({ value: item.id, label: item.name }))
              ]}
            />
          </label>
        ) : (
          <label>
            分类
            <Select
              value={draft.categoryId ?? ""}
              onChange={(categoryId) => setDraft((current) => ({ ...current, categoryId }))}
              options={[
                { value: "", label: "选择分类" },
                ...activeCategories.map((item) => ({ value: item.id, label: item.name }))
              ]}
            />
          </label>
        )}

        <label className="wide">
          备注
          <input
            value={draft.note ?? ""}
            onChange={(event) => setDraft((current) => ({ ...current, note: event.target.value }))}
            placeholder="午餐、工资、基金赎回"
          />
        </label>

        <button className="primary-button wide" type="submit">
          <Plus size={17} />
          保存
        </button>
      </form>
    </section>
  );
}
