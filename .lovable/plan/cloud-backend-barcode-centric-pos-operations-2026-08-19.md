# Cloud backend + barcode-centric POS operations

Two connected pieces of work: move the back office onto a real cloud database, then rebuild scanning into a single, mode-aware engine with audio feedback.

## Phase 1 — Enable Lovable Cloud and move the back office onto it

Today every back-office screen (products, inventory, suppliers, purchases, pricelists, customers, sales, sessions, settings, staff, security events) reads and writes browser localStorage through `backend-context` and `pos-context`. Data disappears per browser and cannot be shared between the till and the manager's device.

- Enable Lovable Cloud (database, auth, storage, server functions).
- Create tables mirroring the existing data shapes: products, categories, suppliers, stock items, purchase orders and lines, pricelists and rules, customers, tax rates, staff users and roles, store settings, register sessions, sales and sale lines, payments, returns, security events.
- Row Level Security on every table, with roles kept in a dedicated `user_roles` table (never on a profile row) and a `has_role` security-definer function. Cashiers read catalog and write their own sales; managers and admins get full access.
- Seed the current demo catalog, suppliers, customers and historical sales through the migration so the app opens with realistic Pakistani retail data.
- Replace the mock passcode/login with real cloud authentication: staff sign in with email + password, the manager passcode gate stays as a second, local check for back-office entry.
- Rewrite `backend-context` and `pos-context` to read and write through TanStack Query against server functions, keeping their existing public API so screens change as little as possible. Cart edits stay optimistic — the UI updates immediately and the sale syncs in the background.

## Phase 2 — Barcode engine

### Global keyboard-wedge listener

Replace `use-hardware-scanner` with `useBarcodeScanner`:

- Window-level `keydown` capture, buffering keystrokes with a tight inter-key gap so ordinary typing is never captured.
- A burst ending in Enter with at least 4 characters is treated as a scan.
- Repeat-scan guard so a held trigger cannot double-add the same code.
- Works with no field focused, and does not steal input from a genuinely focused search box being typed into by hand.

### Camera scanner

- Keep ZXing, but reworked into a fast overlay: high frame rate, autofocus, continuous decode.
- A floating scan button available on till, price check, returns and product screens opens the camera overlay.
- A successful decode closes the overlay automatically and feeds the same scan event as the physical scanner.

### Audio feedback

An `AudioService` built on the Web Audio API (no audio files, no bundle cost):

- Success — short high beep: item found and added.
- Error — low harsh buzz: unknown barcode, out of stock, invalid code.
- Alert — two-tone chime: price check result, low stock, manual check required.
- Action — soft click: line removed, quantity changed, mode switched.

Sound can be muted from settings.

### Context-aware scan routing

A `ScannerRouter` fed by a scan-mode store decides what a scan does:

- **Till (default)** — increment the matching cart line, success beep. Unknown code: error buzz, then the Add Product modal opens with the barcode pre-filled.
- **Price check** — a toggle on the till; scanning shows a large product panel with name, price and live stock, alert chime, and does not touch the cart. It clears on the next scan or keypress.
- **Refund / replace** — scanning a product adds it as a negative refund line; scanning a receipt barcode loads that whole past transaction for return or exchange.
- **Inventory / add product** — in the back office, a scan fills the barcode/SKU field of the row or form being edited, and jumps to the matching stock row when one exists.

Every mode gives a clear on-screen message plus its matching sound; nothing fails silently.

## Technical notes

- New modules: `src/lib/use-barcode-scanner.ts` (listener), `src/lib/audio-service.ts` (Web Audio beeps), `src/lib/scanner-router.ts` (mode dispatch), plus a small scan-mode context.
- Existing `use-hardware-scanner` call sites on till, price check, returns and inventory are migrated to the new hook; the old hook is removed.
- Cloud access goes through server functions with the authenticated client so RLS applies as the signed-in staff member; no service-role access from app screens.
- Audio and camera code stays client-only so server rendering is unaffected.
- Currency stays PKR with comma separators and dates DD/MM/YYYY.

## Sequencing

Phase 1 lands first (database, auth, back office on cloud), then Phase 2 on top of it so scans query real product data.
