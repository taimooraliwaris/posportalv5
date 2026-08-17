# Returns/Exchanges + Backend Admin

Two parts: a Return / Exchange flow at the till, and a full mock back-office under `/backend/*`. Everything stays frontend-only with mock data, except QR generation which will be real (`qrcode.react`).

## Part 1 — Return / Exchange at the till

Settings (hamburger) menu changes:
- Remove Customer Display, Wifi row, Install App, Reload Data.
- Add **Return / Exchange Order** in the position Customer Display occupied.

New route `/returns`:
1. Search field ("Search by order number or receipt number") plus a barcode/QR button that reuses the existing scanner overlay to simulate scanning a receipt QR.
2. Selecting a paid order lists its lines, each with a quantity stepper (0 → original qty) and a reason dropdown (Damaged, Wrong Item, Customer Changed Mind, Other).
3. Two paths:
   - **Refund** — refund total, method choice (Cash / Card / Customer Account), Confirm Refund.
   - **Exchange** — the same product grid used on the till for replacements, with a running difference (refund due / amount owed), Confirm Exchange.
4. Success screen ("Return Processed" / "Exchange Processed") with a receipt-styled summary, Print, and back to Till.

Processed returns/exchanges are written into the shared order state and show in Orders with new status pills **Returned** and **Exchanged**, using palette colors not already taken by ongoing/payment/paid/cancelled.

## Part 2 — Backend admin (`/backend/*`)

Shared layout route: collapsible left sidebar (Dashboard, Products, Inventory, Pricelists, Customers, Sales, Purchases, Reports, Settings), top bar with page title, global search, store name, avatar, dark-mode toggle, and "Back to Till". List screens follow: filter bar → table/grid → row click opens a right-side detail drawer.

- **Dashboard** — stat cards (Today's Sales, Orders Today, Average Basket, Low Stock) with trend vs yesterday, 7-day sales chart, Top Selling Products, quick-action tiles.
- **Products** — table/grid toggle, filters (category, stock status, active/archived), product form matching the till's form plus Description, Reorder Point, Preferred Supplier. Products without a barcode get **Generate Code** → real scannable QR of a store SKU → printable label preview. Detail drawer with stock sparkline and Pricelists / Purchase History tabs.
- **Inventory** — stock table with color-coded status pills, Adjust Stock modal (keypad quantity + required reason), Stock Transfer tab, valuation summary card (cost, retail, margin).
- **Pricelists** — card list, New Pricelist form (rule type, applies-to, date range, customer tag), detail view with inline-editable rules.
- **Customers** — table with lifetime spend and color-coded account balance; drawer with the till's partner fields, order history, account ledger, notes.
- **Sales** — Orders tab and Returns & Exchanges tab (fed by Part 1), date-range filter, receipt-styled read-only detail.
- **Purchases** — Suppliers tab and Purchase Orders tab with a New PO flow; marking a PO Received bumps mock inventory.
- **Reports**
  - Profit & Loss: date range, Revenue / COGS / Gross Profit / Margin cards, by-category table, profit trend chart.
  - Sales Analytics: best sellers, sales by category, sales by payment method.
  - X & Z Report Browser: month calendar heatmap (daily total + sessions, shaded on the existing teal/purple ramp), prev/next month and Jump to today, three month stat cards, day click → session list, session click → the existing Z Report component plus an X-style detailed view, both with Print/Export.
- **Settings** — Users & Roles (UI only), Taxes, Store Details, Register/Session History audit list.

## Consistency rules applied throughout

Same fonts, spacing, 12–16px card radius, and shadow weight as the till. Status pill colors extended from the existing set for Low Stock, Out of Stock, Draft, Received, Returned, Exchanged. Every monetary input uses the existing keypad component. Destructive actions reuse the Cancel Order confirmation pattern. Full light/dark parity. Charts use flat solid palette colors only.

## Mock data

Extend the current product/customer/order data rather than replacing it, and generate ~30 days of historical sessions and orders — mostly clean closes, a couple of zero-variance days, one or two with a small cash variance.

## Technical notes

- New dependency: `qrcode.react`. Charts use the already-installed `recharts` with palette colors passed explicitly.
- Routes: `src/routes/returns.tsx`, `src/routes/backend.tsx` (layout) and `backend.*.tsx` leaves, each with its own `head()` metadata.
- Mock domain data moves into `src/lib/backend-data.ts` (suppliers, POs, sessions, stock, tax rates, users) alongside the existing `pos-data.ts`; return/exchange records extend the order type in `pos-context.tsx`.
- Also fixing a hydration warning on the splash clock (server/client time mismatch) while in these files.

## Suggested build order

1. Part 1 (menu changes + returns flow + new order statuses).
2. Backend shell, mock data, Dashboard, Products (incl. QR), Inventory.
3. Pricelists, Customers, Sales, Purchases.
4. Reports (all three) and Settings.
