# Velora POS — Cloud wiring, real auth, and scan-anywhere

## Status note

The two JSON cast errors in the cloud data layer are already resolved — a full typecheck of the project currently passes with no errors, so that item needs no work. The scanner provider is also already mounted globally and all four screens (till, price check, returns, back-office inventory) already use the shared scan target hook, so physical keyboard-wedge scanners already fire without touching the top-bar icon. What remains is extending that coverage to the screens and dialogs that still ignore scans, plus the four larger workstreams below.

## 1. Move the data onto the cloud

Rewrite the two state containers (`pos-context`, `backend-context`) so catalog, inventory, suppliers, purchase orders, pricelists, taxes, store settings, customers, orders, returns and cash moves come from the cloud database through the existing `cloud-data` layer instead of seeded local storage.

- Reads via cached queries keyed per entity; writes via mutations that update the cache immediately (optimistic) and roll back on failure with a toast.
- Public shape of both contexts stays byte-identical, so every existing screen keeps working with no edits.
- Loading and error states handled in the layout so a slow first load shows a skeleton rather than an empty till.

## 2. Real cloud sign-in

- New `/auth` route (public): email + password, Google sign-in, and a "forgot password" path with a `/reset-password` route.
- Google is configured as a provider in the same change so first sign-in works.
- Existing login screen and the Security tab become async (pending state, real error messages).
- Staff creation moves to manager-invited: a manager creates a staff account from the back office, the new user gets a set-password link. No open self sign-up.
- Header becomes session-aware (real user name/role, sign-out that cancels in-flight requests, clears cached data, and returns to `/auth` without leaving the till on the back stack).
- The 6-digit manager passcode stays exactly as it is — a local gate in front of the back office, on top of being signed in.

## 3. Camera scanning: quick toggle + batch confirm

- Floating scan button on till, inventory, price check and return screens; opens the camera overlay, closes itself on a successful decode.
- New batch mode: keep the camera open, collect every decode into an on-screen preview list (with quantity, duplicate merge, and per-line remove), then one "Add all" press pushes the whole batch into the cart at once.
- Both camera and hardware decodes go through the same single scan pipeline, so behaviour and beeps are identical.

## 4. Scan everywhere

Audit every screen and dialog for scan coverage and add the missing targets:

- Add/Edit product dialog — scanning fills the barcode field instead of being swallowed.
- Purchase order lines, stock receive/adjust, customer lookup, payment screen (gift/voucher style codes), order search on the returns screen.
- While a dialog owns the scan, the underlying screen's handler is suspended so a scan never lands in two places.
- Unknown barcode gives the error tone plus a clear "not found — add product?" prompt.

## 5. Keyboard and responsiveness pass

- Every on-screen keypad (quantity, price, discount, passcode, cash tendered, bills) also accepts physical typing, Enter to confirm, Escape to cancel, and Backspace.
- Dialogs get focus trapping, a sensible initial focus, and Enter-to-submit.
- Layout check at phone, tablet and desktop terminal widths; error boundaries around the till, back office and each report so one failure never blanks the app.

## Technical notes

- TanStack Query for all server state; mutation `onMutate`/`onError`/`onSettled` for optimistic cache handling; query keys already defined in `cloud-data`.
- Auth uses the cloud client in the browser and the auth middleware for any server function that touches private data; row-level security policies already restrict every business table to signed-in staff.
- Staff invite + password set use privileged server-side calls, never the browser client.
- Strict TypeScript throughout; no `any`, no non-null assertions on cloud responses.

## Suggested order

1. Cloud-backed contexts (everything else depends on real data)
2. Real auth + session-aware header
3. Scan-everywhere coverage
4. Camera quick toggle + batch add
5. Keyboard/responsive/error-boundary cleanup
