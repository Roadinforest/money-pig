<claude-mem-context>
# Memory Context

# [Money-pig] recent context, 2026-07-17 8:10pm GMT+8

Legend: 🎯session 🔴bugfix 🟣feature 🔄refactor ✅change 🔵discovery ⚖️decision 🚨security_alert 🔐security_note
Format: ID TIME TYPE TITLE
Fetch details: get_observations([IDs]) | Search: mem-search skill

Stats: 50 obs (24,403t read) | 0t work

### Jul 17, 2026
S975 Resolve pnpm "ERROR packages field missing or empty" error in Money-pig Electron project by migrating onlyBuiltDependencies out of misconfigured pnpm-workspace.yaml (Jul 17, 8:10 AM)
S974 Diagnose and resolve pnpm "ERROR packages field missing or empty" error when running pnpm start in Money-pig Electron project (Jul 17, 8:10 AM)
1663 8:36a 🔵 Existing CSS already has responsive breakpoints at 1160px and 720px
1664 " 🔵 Primary session is in re-read phase after first image-bill patch landed
1665 " 🟣 AgentParseRequest gains imageDataUrls array field
1666 " 🔄 buildUserMessage now spreads multiple image_url blocks per request
1667 " 🟣 Renderer switched to multi-image agentImages array with stable IDs
1668 " ✅ Preview markup swapped to thumbnail figure grid per ChatGPT-style ask
1669 8:37a 🔵 body { min-width: 980px } hard-pins layout minimum width
1670 " ✅ App.tsx multi-image patch confirmed applied (twice — idempotent)
1671 " 🟣 Paste and drop now also accept image URLs as text
1672 " 🔵 Multi-image patch references undefined helpers — typecheck risk
1673 " 🟣 URL-to-data-URL and file:// URL detection helpers added to App.tsx
1674 " ✅ Multi-image + URL paste surface area now consistent end-to-end in App.tsx
1675 8:38a 🟣 Image preview rewritten as ChatGPT-style auto-fill thumbnail grid
1676 " 🔴 Overflow fix: draft-row min-width:0 plus new 1280px breakpoint
1677 " 🔄 Media query cascade reordered: 1280px now precedes 1160px
1678 " 🔵 Final typecheck + cross-file grep confirm clean multi-image migration
1679 " 🟣 Auto-strip image file URLs from agentText after promotion to attachment
1680 " ✅ Typecheck re-confirmed after stripImageFileUrls addition
1682 " 🔴 User reports multi-image input shows only one of two
1681 8:39a 🔵 Final post-stripImageFileUrls typecheck passes cleanly
1683 9:20a 🔄 appendAgentImages and removeAgentImage helpers consolidate state-update logic
1684 " 🔴 Image count note now reflects total after append, not just the batch size
1685 9:32a ⚖️ Planned refactor of Money-pig monolith into feature-based structure
1686 " 🔵 Money-pig repo state confirmed: clean main, 1 commit ahead, standard Electron+Vite layout
1687 " 🔵 Money-pig src/ has only 12 flat files, no feature folders yet
1688 " 🔵 Money-pig IPC surface and Electron bootstrap architecture mapped
1689 9:33a 🔵 Inventory of App.tsx, database.ts, styles.css, agent.ts functions for refactor planning
1690 " ✅ Created refactor branch refactor/split-modules off main
1691 " 🔵 Preload/IPC/settings modules are small and already cleanly split; one minor IPC_CHANNELS duplication noted
1692 9:34a 🔵 App.tsx state model and tab sections mapped for split refactor
1693 " 🔄 Step 1 of refactor: extracted renderer pure functions to src/renderer/lib/
1694 9:35a 🔄 Extracted stats computation to features/stats/monthlyStats.ts with new typed interfaces
1695 " 🔄 Extracted agent draft validation to features/agent/draftValidation.ts
1696 " 🔄 Added shared label maps and reusable UI components: PanelTitle, MetricCard, IconButton
1697 9:36a 🔄 Extracted TransactionRow to features/ledger/ using new shared components and lib helpers
1698 " 🔄 Extracted TransactionForm to features/ledger with self-contained state
1699 " 🔵 LedgerTab.tsx introduced with broken controlled-state pattern: form inputs silently discard edits
1700 " 🟣 Statistics dashboard tab committed
1701 " ⚖️ Plan feature-oriented refactor on a new branch
1702 7:40p 🔄 App reduced to top-level orchestration
1703 " 🔄 Renderer CSS split into responsibility-specific files
1704 " 🔵 New CSS modules are not yet connected
1705 " 🔵 Agent draft commit validation was weakened
1706 7:41p 🔄 Renderer stylesheet split completed and activated
1707 " 🔄 Database infrastructure concerns extracted into modules
1708 " 🔵 Database extraction is not yet wired into repository
1709 7:53p 🔄 LedgerRepository migration to modular database layer completed
1720 7:54p ⚖️ Primary session handed off mid-refactor with user request to continue unfinished tasks
1721 8:09p 🔄 Refactor committed: App/database/agent decomposed into focused modules with full build verification
1722 " ✅ Refactor commit verified as HEAD with clean post-commit typecheck
S976 Structural refactor of Money-pig Electron+React+sql.js app to address file bloat — split renderer into feature tabs, decompose CSS by feature, split src/main/database.ts and src/main/agent.ts into focused modules, preserve back-compat via re-export shims. (Jul 17, 8:09 PM)
**Investigated**: App.tsx (1595 lines), styles.css (1015 lines), database.ts (581 lines), agent.ts (517 lines) — examined composition and identified extraction seams; ran pnpm typecheck to surface cascading import-path errors in 12 feature files; ran pnpm build to confirm bundle size unchanged after refactor (185.08 kB pre/post); git diff --stat to verify net deletions.

**Learned**: Back-compat shim pattern (1-line `export { X } from "./new/path"`) preserves old import surface so main.ts/ipc.ts require zero changes; composition-root pattern works well for agent.ts (ledger-agent composes minimax-client + local-parser + date-parser); relative path depth changes when moving files deeper — features/X/Y.ts needs `../../../shared/types` not `../../shared/types`; `import type` fails for lucide-react icons when used as values in arrays (need plain `import { Icon }` with `type LucideIcon`); `git add -A` pollutes staging with .claude/ session config — must `git reset HEAD .claude/` before commit.

**Completed**: Single commit b010341 on branch refactor/split-modules with detailed message; 48 files changed (+4031 / −3390); App.tsx 1595→452 lines (now shell+IPC+tab routing only); styles.css 1015 lines split into 9 feature CSS files (base/layout/forms/ledger/accounts/stats/agent/responsive + index entry); database.ts 581→5-line shim + db/ directory (connection, migrations, seed, mappers, money, ledger-repository); agent.ts 517→4-line shim + agent/ directory (ledger-agent, minimax-client, local-parser, date-parser); renderer pure helpers extracted to lib/ (format, files, errors, labels); shared UI extracted to components/ (PanelTitle, MetricCard, IconButton); per-tab feature directories created (ledger, accounts, stats, agent) with chart components (MonthlyLineChart, CategoryPieChart) and stats modules (monthlyStats, accountStats, draftValidation) extracted as pure functions; .claude/settings.json correctly excluded from commit via git reset; pnpm typecheck and pnpm build both pass cleanly post-commit.

**Next Steps**: Active follow-ups pending after commit: (1) fix `isDraftReadyLocal` validation regression in App.tsx — current implementation only checks `accountId && occurredOn && amount > 0` but lost original `isDraftReady` checks for finite amount, category requirement on non-transfer, and distinct destination account on transfer; (2) add Vitest unit tests for pure functions now extracted (date parser relative-date handling, monthlyStats, accountStats, draftValidation, image file URL cleanup); (3) extract IPC registration module at `src/main/ipc/register-ledger-ipc.ts` to slim down the 50-line ipc.ts; (4) once all consumers migrate to new paths, delete the back-compat shims at src/main/agent.ts and src/main/database.ts.
</claude-mem-context>