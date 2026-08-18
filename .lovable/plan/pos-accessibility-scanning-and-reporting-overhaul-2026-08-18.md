# POS accessibility, scanning and reporting overhaul

Six areas of work across the till, payment screen, product tiles and back-office reports. All of it stays in the existing client-side prototype — no backend changes.

## 1. Payment screen overhaul

The payment screen currently adds a **separate payment card for every single keystroke** — pressing 5, then 0, then 0 creates three payments of Rs. 5, Rs. 0 and Rs. 0 instead of one Rs. 500 payment. This is the core defect to fix.

Rebuild the screen around a single tender amount field:

- One focused amount input that accumulates digits as you type, on-screen or on a physical keyboard.
- Pick a method (Cash / Card / Customer Account), then confirm to add that tendered amount as one payment line.
- Physical keyboard: number keys type, Backspace deletes, Escape clears, Enter adds the tender, and completes the sale once the order is fully covered.
- Split payments: add several tenders of different methods to one order, shown in a single consolidated list with a remove control on each.
- A clear totals panel that always shows **Amount due**, **Amount tendered**, **Remaining**, and — when the customer overpays — a large, prominent **Change due** figure.
- The Validate / Complete action becomes a large high-contrast primary button, disabled until the order is covered.
- Remove the +10 / +20 / +50 quick-add column from the payment keypad.

## 2. Simplified keypad

The shared keypad is used by the till, the payment screen and the back-office stock adjustment field. Clean it up to a standard calculator layout:

- Keys 0-9 and a decimal point, plus backspace and clear.
- Remove the +/- sign toggle and the coloured decorative key styling.
- Remove the +10 / +100 quick-add keys from the back-office amount field.
- Keep the till's Qty / Price / % selectors, since those choose what is being edited rather than modifying a number.
- Every keypad accepts physical keyboard input at the same time as on-screen clicks.

## 3. Active edit state

When a Price or Quantity is actively being edited on the till, the affected cart line and the keypad target get a distinctive state — highlighted border, tinted background and a glowing focus ring — plus a label naming what is being edited, so it is never ambiguous which value the next keypress will change.

## 4. Focus-free barcode scanning

A hardware-scanner hook already exists and buffers fast keystroke bursts, but it is wired into the till only. Extend it into a shared, focus-free scanning behaviour and apply it to:

- **Price check** — a scan instantly selects and displays the product, with no need to click the search box.
- **Till** — already working; folded into the shared behaviour.
- **Product restocking** — scanning in the back office jumps to the matching stock row and opens its adjustment dialog.
- **Returns** — scanning a receipt barcode loads that receipt for return or exchange.
- **Adding or replacing products** — scanning while creating a product fills the barcode field; scanning a code already in use offers to open that product instead.

Unrecognised codes give a clear, actionable message rather than failing silently.

## 5. Order management tweaks

- The **Note** button on the till opens the customer note modal directly, instead of routing through the Actions modal.
- The **Customer Note** tile is removed from the Actions modal, which then offers only **Pricelist** and the Cancel Order action.

## 6. Stock on product tiles

Till product tiles currently show only name and price. Add:

- The current on-hand quantity displayed on every tile.
- A warning badge — icon plus amber or red colouring — when available stock is at or below the product's reorder point, and a distinct out-of-stock treatment at zero.

The existing cart-quantity badge stays, positioned so the two never collide.

## 7. X and Z reports

The back office has per-session Z reports, but no X report, no date-range selection, and its Print / export button only shows a toast — it does not produce anything.

- Add a **date-range selector** covering both reports.
- Add an **X report**: running totals for any selected date range — orders, net sales, payments by method, taxes and gross total — without closing a session.
- Keep the **Z report** as the closing report, with the range selector applied so multiple sessions can be summarised together.
- Make **Print / PDF** work for real: a clean, print-styled report view that opens the browser print dialog so it can be saved as a PDF. Applies to both the back-office reports and the Z report screen at the end of a shift.

## Technical notes

- Shared keypad component reworked; a small shared hook handles simultaneous physical-keyboard and on-screen input, reused by the till, payment screen and back-office amount fields.
- The hardware-scanner hook is extended and mounted on the price-check, returns, inventory and product routes; buffering thresholds stay as they are so ordinary typing is never captured.
- Stock levels come from the existing backend context, read on the till tiles via the product identifier.
- Printing uses a dedicated print stylesheet and a print-only report layout rather than a PDF library, keeping the bundle unchanged.
- Currency stays in the PKR comma format and dates in DD/MM/YYYY throughout the new report views.
