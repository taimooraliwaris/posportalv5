# Velora POS — Fix pass + production readiness

## What's actually broken

**1. "Could not save order 1001: new row violates row-level security policy"**
Confirmed cause: the POS data providers sit *above* the sign-in gate in the app shell, so the catalog/orders queries and the order bootstrap run while nobody is signed in — including while the sign-in screen itself is on screen. The cloud read returns nothing (correctly blocked), the provider concludes "no open order exists", creates order 1001 and tries to save it as an anonymous visitor, which the access rules reject. Your only account does have the Admin role, so this is not a role problem.

Fix: make every cloud read and write in the POS and back-office providers wait for a signed-in session, and don't bootstrap/save a new order until then. Once signed in, saving works normally.

**2. "Unsupported provider: missing OAuth secret" on Continue with Google**
Google sign-in is called but the Google provider was never configured on the backend. Fix: configure the Google provider, and route the sign-in through the Lovable auth broker so it also works inside the editor preview. The error message on screen becomes a plain "Google sign-in isn't available yet" rather than raw backend text.

**3. Review of the recent changes (kept intact)**
Recent work — invite-only staff (no automatic role on sign-up), disabled public sign-up, cloud-backed contexts, unified scanning — stays as is. The review checks the pieces that were left mid-flight: the `/auth` and `/reset-password` screens, the sign-in gate, the security tab's async flows, and the order/return/cash write paths, fixing only what is genuinely broken.

## Physical keyboard on numeric keypads

Shared keypad logic already exists and is wired into the till and back-office numeric fields. Extend the same behaviour to the places that are still click-only:
- Back-office passcode gate: type digits, Backspace, Enter to submit, Escape to clear.
- Payment screen amount + quick-cash entry.
- Price check and return/exchange quantity entry.
- Modal dialogs: Enter confirms, Escape closes, digits reach the focused numeric field.
Rules kept: keystrokes typed into a real text input are never hijacked, and barcode-scanner bursts still go to the scan router, not the keypad.

## Floating scan button (without hurting the UI)

A single small circular camera button, bottom-right, above the keypad safe area:
- Only on screens where scanning means something (till, price check, returns, back-office inventory) — it reads the current scan mode, so one button serves all of them.
- Hidden on the sign-in screen and when a modal or the scanner overlay is already open.
- Hidden when a physical scanner is detected in the session (no redundant control), and hidden on desktop widths where the camera is rarely used — configurable.
- Tap opens the existing camera overlay: batch mode on the till (review scanned items, confirm once), single-shot elsewhere with auto-close on decode. Decoded codes go through the existing scan router.
- Keyboard reachable, labelled, respects reduced-motion; it never covers cart totals or the keypad.

## Production readiness document

A detailed `PRODUCTION-READINESS.md` at the project root, covering: access-control model and remaining gaps, staff onboarding/invite flow, auth hardening (password policy, reset, session), data integrity (order numbering, offline/duplicate writes), stock and cash accuracy, receipts/tax/rounding, hardware (scanners, cash drawer, printers), reporting and audit, backups, monitoring, performance, accessibility, device/browser matrix, and a launch checklist with severity per item.

## Technical notes

- Gate `useQuery` calls in `pos-context.tsx` and `backend-context.tsx` on the auth session, and short-circuit the debounced order upsert and cash/return writes when there is no session; keep the seed-data fallback for the pre-auth render so the UI never flashes empty.
- Order bootstrap effect runs only after the first authenticated orders fetch settles, preventing phantom order 1001 rows.
- Configure the Google provider on the backend and switch `signInWithGoogle` to the Lovable broker with a same-origin redirect.
- Reuse `applyNumericKey` / `useNumericKeyboard` for the new keyboard call sites — no second implementation.
- New `ScanFab` component mounted once in the app shell, driven by scan-mode context plus route; no changes to `ScannerOverlay` behaviour beyond how it is opened.
- Verify with typecheck, lint, and a browser pass through sign-in → till → cart → payment → receipt.
