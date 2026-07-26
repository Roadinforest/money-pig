// Single source of truth for the top-level navigation tabs.
// Importing the type keeps the tabbar buttons, App state and tab components aligned.

import { Landmark, List, WalletCards, BarChart3, Bot, type LucideIcon } from "lucide-react";

export type AppTab = "ledger" | "transactions" | "accounts" | "stats" | "agent";

export interface TabDescriptor {
  id: AppTab;
  label: string;
  icon: LucideIcon;
}

export const TABS: TabDescriptor[] = [
  { id: "ledger", label: "记账", icon: Landmark },
  { id: "transactions", label: "流水", icon: List },
  { id: "accounts", label: "账户", icon: WalletCards },
  { id: "stats", label: "统计", icon: BarChart3 },
  { id: "agent", label: "Agent", icon: Bot }
];
