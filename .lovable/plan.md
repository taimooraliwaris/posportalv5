# Full-Codebase Audit and Correctness Refactor

Goal: make the POS behave predictably end to end — orders, returns, exchanges, customer accounts, register sessions, cash flow and back-office reporting all agree with each other — without changing intended features. Work happens in ordered iterations so each one is verifiable on its own.

## Confirmed problems (verified in the code today)

1. **Register sessions are never saved.** The app tracks `sessionId` in browser state, but nothing writes it to the database — `orders` and `cash_moves` have no session column and the cloud mapper never sends one. Close Register therefore falls back to "anything after the open time", so a second or third session on the same day picks up the earlier session's sales. This is the direct cause of the multi-session mismatch.
2. **Reports invent one session per calendar day.** The back-office layer synthesises a session id of `sess-<date>`, so per-shift history, opening/closing and cash breakdown can never tally with what the cashier actually did.
3. **Returns and exchanges are counted as sales.** Report rows are built from all settled orders, including returns and exchanges, using the sum of payments — so a return shows up as an extra order, and the dashboard falls back to guessing by checking whether the order number starts with `RET-`.
4. **Exchange stock movement is wrong.** Exchange handling adjusts stock through a net-change path separate from the sale path, which double-counts quantity for one-for-one swaps.
5. **Type safety is switched off in the highest-risk files.** 18 files carry `@ts-nocheck`, including the POS context, till, returns, close register, Z report, reports and print service — real type errors (and the bugs behind them) are hidden.
6. **Customer account figures** are derived from the same payment-sum logic as above, so returns and account payments distort a customer's balance.

## Iterations

**Iteration 1 — Baseline and truth table (no behaviour change)**
Full file-by-file inventory of `src/`, plus a diff review of your recent commits/PRs. Produce `AUDIT.md`: per file, what it owns, the bugs found, dead code and unused variables, and which iteration fixes it. Nothing else is touched, so you can review the findings before any code moves.

**Iteration 2 — Money and document model**
One shared module becomes the single source of truth for line totals, discounts, tax from configured tax rates, refunds and exchange differences, plus rounding to 2 decimals. Every screen (till, payment, returns, receipts, reports, Z report) is switched to it. Orders gain an explicit document kind — sale / return / exchange — instead of number-prefix guessing, so a return is never counted as a new order.

**Iteration 3 — Register sessions made real**
A register-session record is persisted in the database (open time, close time, cashier, opening float, counted cash, variance, notes), and every order, return and cash move stores the session it belongs to. Close Register, Z report and back-office session history all read those stored links, so multiple sessions in one day reconcile independently and the day total is their sum.

**Iteration 4 — Inventory movement correctness**
Every stock change goes through one ledger-style path: sale deducts, return restores, exchange applies only the net difference, purchase receipt adds, manual adjustment records reason and actor. Fixes the exchange double-deduction and makes inventory match order history.

**Iteration 5 — Customer accounts**
Account balance, credit and statement views are recomputed from the corrected document model, so charges, payments, refunds and store credit tally.

**Iteration 6 — Back office pass**
Dashboard, sales, inventory, purchases, pricelists, customers, suppliers, reports, audit statements and settings each get a correctness pass against the corrected data layer, including empty and negative states.

**Iteration 7 — Type safety and dead-code cleanup**
Remove `@ts-nocheck` file by file, fix the errors it was hiding, delete unused variables, unreachable branches and leftover mock fallbacks. Ends with a clean typecheck and lint.

**Iteration 8 — Verification**
Scripted end-to-end runs in a real browser: open register with a float, sell, return, exchange, cash in/out, attach a customer, close register, second session on the same day, then confirm dashboard, sales, Z report and customer statement all agree. Reconciliation results recorded in `AUDIT.md`.

## Technical notes

- New migrations: a `register_sessions` table with grants and staff/manager RLS, plus `session_id` columns on `orders`, `return_records` and `cash_moves`; existing rows are backfilled by date so history stays visible.
- Order documents get an explicit `kind` field so returns/exchanges stop relying on the `RET-` prefix heuristic.
- Shared calculation module replaces the duplicated arithmetic in `src/lib/tax-resolver.ts`, `pos-context.tsx`, `close-register.tsx`, `z-report.tsx`, `backend.reports.tsx` and `print-service.ts`.
- Session synthesis in `backend-context.tsx` (`sess-<date>`) is replaced by reads of the stored sessions.
- Public APIs of `usePos()` and `useStore()` are preserved where possible; where a signature must change, all call sites are updated in the same iteration.
- Each iteration ends with typecheck, lint, the existing scripts under `scripts/`, and a browser pass before moving on.

## Scope guard

No feature is added or removed and no screen is redesigned. Changes are limited to making existing flows compute and persist correctly.
