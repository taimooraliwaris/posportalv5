# Velora POS — Full-Stack Upgrade

Six workstreams: unify scanning, move all business data to Cloud, real staff accounts, faster camera scanning, keyboard support everywhere, and code hygiene.

## 1. One scanning pipeline

- Mount the scan provider globally so every screen shares one keyboard-wedge listener and one audio feedback path.
- Convert Till, Price Check, Returns and Back-Office Inventory to claim their scan mode through the shared hook; each keeps its current behaviour (ring up / look up / refund / fill barcode field).
- Delete the old per-screen scanner hook once nothing imports it.

## 2. Cloud-backed data

Catalog, categories, inventory, suppliers, purchase orders, pricelists, taxes, store settings and customers all read and write to the Cloud database through cached queries with optimistic updates, so edits appear instantly and survive refresh across devices.

Orders now persist too: sales orders with their lines and payments, returns/exchanges, and cash movements get new Cloud tables, so receipts, order history and Z-reports survive a refresh and are visible to other terminals.

The public shape of both contexts stays identical, so no screen needs rewriting. Where a screen previously assumed instant local data, it gains loading and error states.

## 3. Real staff accounts (manager-invited)

- New `/auth` route: email + password sign-in and Google sign-in. No public sign-up.
- New staff are created by a Manager/Admin from the back-office Security tab (name, email, role). The invitee receives an email, confirms it, then sets a password and signs in. Email confirmation is required.
- Bootstrap: while the store has no staff at all, the first account created from the sign-in screen becomes Admin. Once one Admin exists, that path closes and only managers can add staff.
- Sign-in screen and Security tab become asynchronous: pending states, real error messages, no silent failures.
- Header shows the signed-in staff member with a proper sign-out that cancels in-flight requests, clears cached data and returns to `/auth` without leaving the app restorable via Back.
- The 6-digit manager passcode stays exactly as it is: a local gate in front of the back office, on top of being signed in.
- Password reset is included: request link from `/auth`, set a new password on `/reset-password`.
- Security event log (failed passcode, sign-ins, credential changes) writes to the Cloud table instead of local storage.

## 4. Faster camera scanning + batch add

- Floating quick-toggle camera button on scanning screens; the overlay auto-closes after a successful decode when in single-scan mode.
- New batch mode: keep scanning, each decode appends to an on-screen review list (name, price, quantity, with de-duplication and quantity bump for repeats, plus an unknown-barcode row that offers product creation). Cashier adjusts quantities, removes mistakes, then confirms once to add everything to the cart in a single action.
- All decodes route through the shared scan router so audio feedback and mode awareness are consistent.

## 5. Keyboard support everywhere

Every numeric keypad, passcode entry, cash/bills payment field and modal dialog accepts physical keyboard input (digits, decimal, backspace, Enter to confirm, Escape to cancel) in addition to on-screen taps, with visible focus and correct tab order. The global wedge listener is suppressed while a text field is focused so typing never gets swallowed.

## 6. Quality pass

- Strict TypeScript, no `any` in the touched files, generated database types used throughout.
- Error boundaries on every data route so a failed read shows a retry card instead of a blank screen.
- Responsive review at phone, tablet and desktop-terminal widths for the till, back office and all new overlays.

## Technical notes

- Data access goes through TanStack Query hooks over the Cloud client; mutations use `onMutate` cache patching with rollback on error, keyed per entity.
- New tables (`orders`, `order_lines`, `order_payments`, `returns`, `cash_moves`) get row-level security limited to signed-in staff, explicit grants, and a store-scoped id scheme matching the existing tables.
- Staff invites run through a server function using privileged access, gated on the caller holding Manager/Admin — never trusting a client-supplied role.
- Google sign-in is configured for the provider in the same change so the first attempt works.
- Protected screens move under the authenticated route layout; `/auth` and `/reset-password` stay public.
