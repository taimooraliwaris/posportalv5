# POS Prototype

Lovable.dev Build Prompt — Velora POS Frontend Prototype

Copy everything below into a single Lovable.dev prompt to generate a frontend-only, mock-data clickable prototype for stakeholder review. No real backend, auth, or payment processing — everything is simulated with local mock data and component state so non-technical stakeholders can click through the real flow.

Prompt

Build a frontend-only web app prototype called "Velora POS" — a beautifully designed, simple, touch-first point-of-sale application for local market retailers (grocery stores, pharmacies, boutiques). This is a clickable prototype for stakeholder approval, not a production app: use mock/local data only, no backend, no real auth, no real payments, no real camera decoding logic required (simulate barcode "scans" with a button that randomly picks a mock product).

Brand & Visual Style

App name: Velora POS, tagline "Point of Sale, Simplified."

Sophisticated, modern, warm-neutral palette: deep navy (#1F2A44) for text/headers, muted plum/purple (#6B4A63) as the primary accent (buttons, active states), soft lavender-grey backgrounds (#F2EFF1), plus 3–4 pastel category colors (dusty pink, sand, sage, sky blue) used consistently for product categories.

Clean sans-serif typography (Inter or similar), generous spacing, rounded corners (12–16px), soft shadows — should feel premium and calm, not cluttered like a typical POS.

Full light and dark mode support with a toggle in the settings menu — dark mode should be a true, well-designed dark theme, not just an inverted filter.

Large touch targets everywhere (min 44px), icon + label combos for every primary action, minimal free text.

Fully responsive: primary target is a tablet (1024–1366px landscape) but must also work well on desktop browser and be usable on mobile.

App Structure / Screens to Build

1. Splash / Open Register screen

Live clock and date, store name "Velora Mart", logo placeholder.

Centered "Open Register" card with a basket icon; tapping it opens a simple modal to confirm/enter an opening cash amount, then proceeds to the Till screen.

A subtle "Backend" link/button at the bottom (can just show a "coming soon" toast/placeholder page).

2. Till (Main POS) screen — the core screen

Header bar: "Register" / "Orders" tab toggle on the left, a "+" button to start a new order tab, a row of open order tabs (e.g. "1001", "1002"), a product search bar in the center, and on the right: a barcode icon button (opens the camera scanner overlay), a network/status indicator, a round user-initial avatar, and a hamburger menu.

Left panel: current cart — list of line items (name, qty badge, price), running Subtotal/Taxes/Total at the bottom, "Customer" and "Note" quick-action chips, an upload icon, a "⋮" actions button, and a large primary "Payment" button pinned at the bottom.

Right panel: category tabs (pill buttons, color-coded: e.g., Misc = purple, Desks = white/outline, Chairs = sand) above a responsive grid of product tiles (image placeholder, name, price). Tapping a tile adds it to the cart with a small "+1" animation and a quantity badge on the tile.

A numeric keypad appears in the cart panel when a cart line is selected, with modes for Qty / Price / discount %, plus quick +10/+20/+50 style buttons where relevant, and a backspace/clear key.

3. Camera Barcode/QR Scanner overlay

Full-screen or large modal overlay simulating a live camera viewfinder (use a subtle animated scan-line and a rounded corner-bracket guide frame over a placeholder camera feed).

A "Stop" control in the header to close it.

Include a "Simulate Scan" button (for the prototype only) that randomly matches a mock product and adds it to the cart with a green success flash + checkmark animation and short toast ("Pedal Bin added"); occasionally simulate an "unrecognized barcode" state that offers a "Create Product from this code" action.

4. Orders list screen

List of orders grouped by "Today", each row showing order number, receipt number, time, total, and a status pill (Ongoing = teal, Payment = amber, Paid = green, Cancelled = grey).

Status filter dropdown (Active / Ongoing / Payment / Cancelled / Paid) and a search bar.

Tapping a row opens an "Order Details" modal (session, order reference, receipt number, served by, order time) with a Close button.

An info (ⓘ) icon and delete (trash) icon per row; delete asks for confirmation.

5. Customer flow

Tapping "Customer" chip in the cart opens a "Choose Customer" modal: search bar at top, a "Create" button, and a list of existing customers (name, country/location, email icon + email).

"Create" opens a "Create Partner" form: large Name field, Company/Employer, Email, Phone, Address (Street, Street 2, City, State, ZIP, Country), optional Tax/NTN number, Barcode field, Tags input — only Name required, everything else visually secondary/collapsible under "Add more details". Save / Discard buttons.

6. Payment screen

Big total amount displayed prominently (e.g., "Rs. 55.46").

Left column: payment method buttons (Cash, Card, Customer Account) each with an icon; tapping adds a payment line to a list on the right showing method, amount, and a remove (×) icon.

Numeric keypad below the payment methods with quick amount buttons (+10 / +20 / +50) styled in a soft green, plus a "Customer" and "Invoice" toggle row.

"Back" and "Validate" buttons at the bottom; Validate is disabled/greyed until the amount tendered covers the total.

On validate, show a success confirmation screen: green checkmark, "Amount Paid", the total, and three actions — Print, Send Receipt, Continue.

7. Print / Receipt

"Print" opens a small modal offering "Full Receipt" vs "Simplified Receipt" (two large tappable cards).

Show a realistic receipt preview: store logo placeholder, ticket number, date/time, served-by, store name, itemized lines, subtotal, tax, total, payment method, and a QR code placeholder with "Need an invoice?" text and a short code — styled clean and printable-looking.

"Send Receipt" opens a small modal to choose Email / SMS / WhatsApp (just UI, no real sending).

8. Order actions modal

Accessed via the "⋮" button in the cart panel: two large tiles, "Customer Note" and "Pricelist", plus a red "Cancel Order" button at the bottom.

"Customer Note" opens a modal with quick-tag pills (Wait, To Serve, Emergency, No Dressing — colored red/amber/yellow/blue) above a free-text textarea, with Apply/Discard.

"Pricelist" opens a simple modal listing pricelists (e.g., "Default Price" selected with a checkmark, plus 1–2 mock alternates like "Wholesale — 10% off" and "VIP — 15% off", each with a one-line description).

9. Header settings menu

Hamburger icon opens a dropdown: network name pill (e.g., "Wifi: VeloraNet"), then menu items with icons: Customer Display, Switch to Dark Mode (toggle), Install App, Cash In/Out, Reload Data, Create Product, Backend, Close Register.

"Cash In/Out" opens a modal with a Cash In / Cash Out toggle, an amount field with a currency prefix, a reason textarea, Confirm/Discard buttons, and a "Details" link.

"Create Product" opens a "New Product" modal: Product Name, Barcode (with a small barcode icon button), Track Inventory toggle (on by default), Sales Price, Sales Taxes (tag-style selector, e.g. "GST 18%") with a computed "incl. taxes" hint, POS Category, a Color swatch picker, and an image upload placeholder box. Save / Discard.

10. Close Register screen

A "Closing Register" modal/page showing a breakdown per payment method (Cash, Card, Customer Account) each with Opening, Payments, Cash In/Out (expandable), Counted, and Difference rows.

A "Cash Count" input (numeric, prefilled with expected value) with a calculator icon button, and a "Closing note" textarea.

Bottom bar: "Close Register" (primary), "Discard", and secondary "Cash In/Out" and "Daily Sale" (export) buttons.

On close, show a styled "Z Report" page: logo, "Z Report" title, "SOLD" section by category/product, "PAYMENTS" section, "TAXES" section, "TOTAL" section, store name/email, and timestamp — clean receipt-style typography, with a "Daily Sales Report" alternate detailed export view (session ID, sales table, taxes table, payments table, discounts, invoices, session control summary).

Interaction & Mock Data Requirements

Preload 15–20 mock products across 3 categories (Misc, Desks, Chairs) with names, prices, and placeholder images (use simple icon-style illustrations or colored placeholder boxes, not real product photos).

Preload 3–4 mock customers.

Cart, orders, and session state should persist in memory for the duration of the session (React state / context is fine) — no need for real persistence.

Currency format throughout: "Rs. 00.00".

Include tasteful micro-interactions: button press states, modal fade/slide transitions, success checkmarks, toast notifications — but keep everything fast and snappy (under 200ms transitions).

Make sure every screen described above is reachable through normal navigation (no dead-end buttons) so a non-technical stakeholder can click through the entire flow end-to-end: Open Register → add products (by tapping and by "scanning") → manage an order (note, customer, pricelist) → pay (split payment) → print/send receipt → view Orders list → close register → view Z Report.

Out of Scope for This Prototype

No real backend, database, authentication, or payment gateway integration.

No real barcode/QR decoding — the scanner overlay is a visual simulation only.

No real printing, emailing, or SMS/WhatsApp sending — these are UI-only confirmations/toasts.

Build this as a polished, cohesive, production-quality-looking design system (consistent spacing, color, and component styles across every screen) so it can be used directly in stakeholder review sessions.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/a3e949f4-267b-44bc-9c22-29297dc8f202).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
