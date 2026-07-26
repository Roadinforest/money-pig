import { Check, X } from "lucide-react";
import { FormEvent, useState } from "react";
import type {
  Account,
  Category,
  TransactionType,
  TransactionUpdateInput,
  TransactionView
} from "../../../shared/types";
import { Select } from "../../components/Select";
import { transactionTypeLabels } from "../../lib/labels";

const TRANSACTION_TYPES: TransactionType[] = ["expense", "income", "transfer"];

export function TransactionEditForm({
  transaction,
  accounts,
  categories,
  onSubmit,
  onCancel
}: {
  transaction: TransactionView;
  accounts: Account[];
  categories: Category[];
  onSubmit(input: TransactionUpdateInput): Promise<void>;
  onCancel(): void;
}) {
  const [draft, setDraft] = useState<TransactionUpdateInput>({
    id: transaction.id,
    type: transaction.type,
    accountId: transaction.accountId,
    transferAccountId: transaction.transferAccountId,
    categoryId: transaction.categoryId,
    amount: transaction.amount,
    occurredOn: transaction.occurredOn,
    note: transaction.note
  });

  const sourceAccounts = accounts.filter(
    (item) => !item.archived || item.id === transaction.accountId
  );
  const targetAccounts = accounts.filter(
    (item) => !item.archived || item.id === transaction.transferAccountId
  );
  const selectableCategories = categories.filter(
    (item) =>
      item.type === draft.type && (!item.archived || item.id === transaction.categoryId)
  );
  const sourceAccount = sourceAccounts.find((item) => item.id === draft.accountId);

  function updateType(type: TransactionType) {
    if (type === draft.type) return;
    const firstCategory = categories.find((item) => item.type === type && !item.archived);
    const secondAccount = accounts.find(
      (item) => !item.archived && item.id !== draft.accountId
    );

    setDraft((current) => ({
      ...current,
      type,
      categoryId: type === "transfer" ? null : firstCategory?.id ?? "",
      transferAccountId: type === "transfer" ? secondAccount?.id ?? "" : null
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onSubmit({
      ...draft,
      amount: Number(draft.amount),
      categoryId: draft.type === "transfer" ? null : draft.categoryId,
      transferAccountId: draft.type === "transfer" ? draft.transferAccountId : null
    });
  }

  return (
    <form className="transaction-edit-row" onSubmit={handleSubmit}>
      <div className="segmented wide" role="group" aria-label="交易类型">
        {TRANSACTION_TYPES.map((type) => (
          <button
            key={type}
            type="button"
            className={draft.type === type ? "active" : ""}
            onClick={() => updateType(type)}
          >
            {transactionTypeLabels[type]}
          </button>
        ))}
      </div>

      <label>
        金额{sourceAccount ? `（${sourceAccount.currency}）` : ""}
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
          onChange={(event) =>
            setDraft((current) => ({ ...current, occurredOn: event.target.value }))
          }
          required
        />
      </label>
      <label>
        账户
        <Select
          value={draft.accountId}
          onChange={(accountId) =>
            setDraft((current) => {
              const transferAccountId =
                current.type === "transfer" && current.transferAccountId === accountId
                  ? targetAccounts.find((item) => item.id !== accountId)?.id ?? ""
                  : current.transferAccountId;
              return { ...current, accountId, transferAccountId };
            })
          }
          options={sourceAccounts.map((item) => ({
            value: item.id,
            label: `${item.name} · ${item.currency}${item.archived ? "（已归档）" : ""}`
          }))}
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
              ...targetAccounts
                .filter((item) => item.id !== draft.accountId)
                .map((item) => ({
                  value: item.id,
                  label: `${item.name} · ${item.currency}${item.archived ? "（已归档）" : ""}`
                }))
            ]}
          />
        </label>
      ) : (
        <label>
          分类
          <Select
            value={draft.categoryId ?? ""}
            onChange={(categoryId) =>
              setDraft((current) => ({ ...current, categoryId }))
            }
            options={[
              { value: "", label: "选择分类" },
              ...selectableCategories.map((item) => ({
                value: item.id,
                label: item.name + (item.archived ? "（已归档）" : "")
              }))
            ]}
          />
        </label>
      )}

      <label className="wide">
        备注
        <input
          value={draft.note ?? ""}
          onChange={(event) =>
            setDraft((current) => ({ ...current, note: event.target.value }))
          }
        />
      </label>

      <div className="transaction-edit-actions wide">
        <button className="primary-button fit" type="submit">
          <Check size={16} />
          保存修改
        </button>
        <button className="secondary-button fit" type="button" onClick={onCancel}>
          <X size={16} />
          取消
        </button>
      </div>
    </form>
  );
}
