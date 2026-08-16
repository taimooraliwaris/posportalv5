# Velora POS — Clickable Frontend Prototype

A front-end only, mock-data POS prototype for stakeholder review. No backend, no auth, no real payments, no real barcode decoding.

## Design system

- Palette: deep navy `#1F2A44` text, muted plum `#6B4A63` primary, soft lavender-grey `#F2EFF1` background, pastel category colors (dusty pink, sand, sage, sky).
- Inter typography, 12–16px radii, soft shadows, generous spacing, min 44px touch targets.
- Full light/dark theme with a real dark palette, toggled from the hamburger menu.
- All colors defined as semantic tokens in `src/styles.css`; no hardcoded color classes in components.
- Tablet-first (1024–1366 landscape), works on desktop and mobile.

## Screens and flows

1. **Open Register** (`/`) — live clock/date, "Velora Mart" branding, centered Open Register card, opening-cash modal, "Backend" placeholder toast.
2. **Till** (`/till`) — header (Register/Orders tabs, `+` new order tab, order tab pills, product search, barcode button, network pill, avatar, hamburger menu); left cart panel (line items with qty badges, subtotal/taxes/total, Customer + Note chips, upload and `⋮` buttons, big Payment button, numeric keypad with Qty / Price / % modes); right panel (color-coded category pills + product tile grid with +1 animation and qty badge).
3. **Scanner overlay** — simulated viewfinder with animated scan line and corner brackets, Stop control, "Simulate Scan" that adds a random mock product with success flash + toast, and an occasional "unrecognized barcode" state offering "Create Product from this code".
4. **Orders** (`/orders`) — today-grouped rows (order no, receipt no, time, total, status pill), status filter + search, details modal, info and delete-with-confirm icons.
5. **Customer flow** — Choose Customer modal (search, Create, customer list) and Create Partner form (Name required; the rest under "Add more details").
6. **Payment** (`/payment`) — large total, Cash / Card / Customer Account buttons adding removable payment lines, keypad with green +10/+20/+50, Customer + Invoice toggles, Back/Validate (disabled until covered), then success screen with Print / Send Receipt / Continue.
7. **Print & receipt** — Full vs Simplified choice modal, printable-looking receipt preview with QR placeholder; Send Receipt modal with Email / SMS / WhatsApp (UI only).
8. **Order actions** — `⋮` modal with Customer Note and Pricelist tiles plus red Cancel Order; note modal with colored quick tags + textarea; pricelist modal with Default / Wholesale −10% / VIP −15%.
9. **Settings menu** — wifi pill, Customer Display, dark-mode toggle, Install App, Cash In/Out (modal with in/out toggle, amount, reason), Reload Data, Create Product (full New Product modal), Backend, Close Register.
10. **Close Register** — per-method breakdown (Opening, Payments, Cash In/Out expandable, Counted, Difference), Cash Count input, closing note, action bar; on close a styled **Z Report** page with SOLD / PAYMENTS / TAXES / TOTAL sections plus a detailed **Daily Sales Report** alternate view.

## Mock data

- 18 products across Misc / Desks / Chairs with prices and icon-style colored placeholder tiles (no photos).
- 4 customers, 3 pricelists, several seeded orders in mixed statuses.
- Currency formatted as `Rs. 00.00` everywhere.

## Technical notes

- TanStack Start routes: `index`, `till`, `orders`, `payment`, `receipt`, `close-register`, `z-report`; each gets its own `head()` metadata.
- A single `PosProvider` React context holds order tabs, cart lines, customers, payments, session and register state in memory for the session.
- Shared UI built on shadcn primitives (Dialog, Sheet, Tabs, Input, Toggle) restyled to the Velora system; sonner for toasts, mounted in `__root.tsx`.
- Micro-interactions kept under 200ms; success checkmarks, press states, modal fade/slide.
- Every screen is reachable end-to-end: Open Register → add items (tap + simulated scan) → note/customer/pricelist → split payment → receipt → Orders → close register → Z Report.
