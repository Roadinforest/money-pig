// Accounts tab — metric tiles, new-account form, balance chart, full management list.

import { BarChart3 } from "lucide-react";
import type { Account, AccountInput, AccountUpdateInput } from "../../../shared/types";
import { MetricCard } from "../../components/MetricCard";
import { PanelTitle } from "../../components/PanelTitle";
import { formatMoney } from "../../lib/format";
import { buildAccountStats } from "./accountStats";
import { AccountForm } from "./AccountForm";
import { AccountManagementList } from "./AccountManagementList";

export function AccountsTab({
  accounts,
  onCreateAccount,
  onUpdateAccount,
  onDeleteAccount
}: {
  accounts: Account[];
  onCreateAccount(input: AccountInput): Promise<void>;
  onUpdateAccount(input: AccountUpdateInput): Promise<void>;
  onDeleteAccount(id: string): Promise<void>;
}) {
  const stats = buildAccountStats(accounts);

  return (
    <section className="accounts-page">
      <section className="summary-grid account-summary-grid">
        <MetricCard label="活跃账户" value={stats.activeCount} tone="ink" format="number" />
        <MetricCard label="资产账户" value={stats.assetCount} tone="green" format="number" />
        <MetricCard label="负债账户" value={stats.liabilityCount} tone="red" format="number" />
        <MetricCard label="平均余额" value={stats.averageBalance} tone="blue" />
      </section>

      <section className="accounts-workspace">
        <AccountForm onSubmit={onCreateAccount} />

        <section className="panel accounts-chart-panel">
          <PanelTitle icon={<BarChart3 size={18} />} title="账户统计" />
          <div className="account-balance-chart">
            {stats.chartAccounts.length === 0 ? (
              <div className="empty-row">暂无账户</div>
            ) : (
              stats.chartAccounts.map((item) => (
                <div className="account-bar-row" key={item.id}>
                  <span>{item.name}</span>
                  <div>
                    <i style={{ width: `${item.ratio}%` }} />
                  </div>
                  <strong>{formatMoney(item.currentBalance, item.currency)}</strong>
                </div>
              ))
            )}
          </div>
        </section>
      </section>

      <AccountManagementList
        accounts={accounts}
        onUpdate={onUpdateAccount}
        onDelete={onDeleteAccount}
      />
    </section>
  );
}
