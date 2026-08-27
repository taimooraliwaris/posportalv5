# Velora POS — finish the build + till fixes

## 0. Fix the current build break, then review recent changes

Two type errors in the till: clearing the assigned customer passes `customerId: undefined`, which the strict optional-property setting rejects. The POS context already treats an empty value as "clear" (it deletes the key), so both call sites pass an empty string instead. Also remove the stray leftover code comment next to the clear-customer button.

Then read through the files touched in the last few commits (POS context, back-office context, auth context, auth screens, passcode gate, header, scanner overlay) and confirm nothing regressed: session-gated cloud reads still fall back to seed data before sign-in, the order bootstrap no longer writes before sign-in, the passcode gate still unlocks, and sign-out still clears cached data. Fix anything broken while keeping the intent of those changes.


## 1. Floating camera scan button (single global overlay)

- Extend the scan provider with `cameraOpen`, `openCamera(mode)`, `closeCamera()` so exactly one camera overlay exists in the app.
- Mount one `ScannerOverlay` globally, driven by that state; Till's existing barcode button and Returns/Price-check triggers call `openCamera` instead of keeping their own local scanning flag.
- Add the floating button: bottom-right, above the keypad safe area, 56px touch target, aria-label, keyboard focusable. Hidden on `/auth` and `/reset-password`, hidden while any dialog/overlay is open, and hidden on screens with no scan target claimed.
- Till opens in batch mode (scan many, review, add all at once); price check, returns and inventory open in single mode with auto-close on decode.

## 2. Scan coverage in the remaining screens and dialogs

Claim a scan target (and suspend the underlying screen's handler while open) in:

- Add/Edit product dialog — a scan fills the barcode field.
- Purchase order lines — a scan adds/increments the matching product line.
- Customer lookup — a scan matches a customer code, otherwise shows "not found".
- Payment screen — a scan is accepted as a voucher/gift-style code entry.
- Returns order search — a scan looks up the receipt/order number.

Unknown codes play the error tone and show a clear "not found" message with an "add product?" action where that makes sense.

## 3. After opening cash, land straight on the till

Entering the opening amount and pressing Open navigates directly to `/till`. The "Register is open → Go to till" interstitial stays only as the fallback when someone returns to `/` with the register already open.

## 4. Taxes come from the tax rates, not a fixed 18%

Today totals use a hard-coded `TAX_RATE`. Change to per-line tax resolved from the configured tax rates: a rate whose "applies to" matches the line's product category wins, otherwise the "All products" rate, otherwise zero. Totals become the sum of per-line tax, so mixed-rate carts are correct.

Every place that shows totals (till, payment, orders, returns, receipt, reports) uses the same shared calculation so the receipt and the till never disagree. The seeded rates keep the current behaviour for products with no specific rate.

## 5. Completed sale clears the cart and the order bar

When a payment is validated: the paid order is saved, then removed from the on-screen order list and cart, and a fresh empty order becomes active. The success screen and receipt still read the paid order, so printing and sending a receipt keeps working. Paid orders remain visible in Orders/history.

## 6. Responsive + error boundary pass

- Route-level error boundaries so a failed read shows a retry card instead of a blank screen (till, back office, each report).
- Layout check at phone, tablet and desktop-terminal widths for till, back office, payment and the overlays.

## 7. PRODUCTION-READINESS.md

New markdown file at the project root: access control and roles, staff onboarding, auth hardening, data integrity, inventory and cash controls, receipts/tax compliance, hardware (scanner, printer, drawer), reporting and audit trail, backups, monitoring, performance, accessibility, browser/device support, and a severity-ranked launch checklist.

## 8. Verification

Typecheck and build, then a browser pass: sign in → open register (lands on till) → scan/add items → mixed-tax totals check → payment → receipt → cart cleared → Z report.

## Technical notes

- `orderTotals` gains an optional tax-resolution argument; a small hook supplies the configured rates plus category lookup so components keep their current call shape where possible.
- Camera state lives in the scan provider; the global overlay renders inside the existing providers so it can reach cart actions and the scan router.
- No schema changes required — tax rates, products and categories already exist in the database.
