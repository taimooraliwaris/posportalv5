# Velora POS — Production Readiness & Architecture Guide

## 1. Executive Summary & Architecture Blueprint

Velora POS is a touch-first, enterprise-grade Point of Sale (POS) and Back-Office retail management web application built for local market retailers, grocery stores, pharmacies, and boutiques.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                             Client Application                              │
│  React 19.2 • TanStack Router (File-Based) • TanStack Query v5 • Tailwind v4│
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
            ┌──────────────────────────┴──────────────────────────┐
            ▼                                                     ▼
┌─────────────────────────────┐                         ┌─────────────────────┐
│      Cashier Terminal       │                         │     Back-Office     │
│   (/till, /payment, etc.)   │                         │    (/backend/*)     │
│  • Touch-first register     │                         │  • Product CRUD     │
│  • Dynamic product taxes    │                         │  • Inventory audit  │
│  • Hardware/camera scanner  │                         │  • Purchase orders  │
│  • Returns & exchanges      │                         │  • Staff & Security │
└──────────────┬──────────────┘                         └──────────┬──────────┘
               │                                                   │
               │        Protected by AuthGate & PasscodeGate       │
               └──────────────────────────┬────────────────────────┘
                                          │
                                          ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                 Full-Stack Server & Edge Layer (TanStack Start)             │
│   • Nitro SSR Server Handler                                                │
│   • CSRF & Supabase Auth Middlewares                                        │
│   • Server Functions (e.g. inviteStaffMember with Service Role isolation)   │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                     Supabase Postgres Database Layer                        │
│   • Row Level Security (RLS) on all tables                                  │
│   • Security Definer RPCs (is_staff, is_manager, staff_exists)              │
│   • Real-time updates & append-only security_events audit trail             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Technology Stack

| Layer | Component | Version / Details |
|---|---|---|
| **Runtime & Language** | TypeScript | `^5.8.3` in strict mode |
| **Framework** | TanStack Start & React | React `^19.2.0`, `@tanstack/react-start` `1.168.48` |
| **Routing** | TanStack Router | `@tanstack/react-router` `1.170.31` (Type-safe file-based routes) |
| **Server Engine** | Nitro / H3 | Nitro `3.0.260603-beta` (Server-side rendering & API handlers) |
| **State & Cache** | TanStack Query | `@tanstack/react-query` `^5.101.1` (Optimistic mutations & write debouncing) |
| **UI Primitives** | Radix UI + Tailwind CSS | Tailwind CSS `^4.2.1`, Radix UI primitives, Lucide React icons |
| **Barcode & Hardware** | ZXing & HID Wedge | `@zxing/browser`, `@zxing/library`, global scanner router pipeline |
| **Database & Auth** | Supabase | `@supabase/supabase-js` `^2.112.3`, PostgreSQL 15+ with RLS |
| **Charts & Analytics** | Recharts | `^2.15.4` |
| **Notifications** | Sonner | `^2.0.7` |

---

## 3. Database Schema & Security (RLS)

All public tables are secured with Row Level Security (RLS) policies.

### Core Relational Tables:
1. **`products`**: Product catalog (`id`, `name`, `price`, `category_id`, `barcode`, `tone`, `icon`, `created_at`, `updated_at`).
2. **`categories`**: POS category taxonomy (`id`, `name`, `tone`).
3. **`customers`**: CRM directory (`id`, `name`, `email`, `phone`, `location`, `company`).
4. **`stock_items`**: Real-time inventory tracking (`product_id`, `on_hand`, `reserved`, `reorder_point`, `cost`, `supplier_id`, `sku`, `history`).
5. **`stock_adjustments`**: Append-only stock adjustments (`id`, `product_id`, `from_qty`, `to_qty`, `reason`, `actor`, `created_at`).
6. **`orders`**: POS transactions (`id`, `number`, `receipt`, `order_date`, `order_time`, `status`, `lines`, `payments`, `customer_id`, `note`, `cashier`).
7. **`return_records`**: Returns and exchanges (`id`, `number`, `kind`, `original_order_id`, `lines`, `replacements`, `refund_amount`, `difference`, `method`).
8. **`purchase_orders`**: Supplier purchasing workflow (`id`, `number`, `supplier_id`, `order_date`, `status`, `lines`). Receiving a PO automatically increments on-hand stock.
9. **`suppliers`**: Vendor registry and account balances (`id`, `name`, `contact`, `phone`, `product_ids`, `open_balance`).
10. **`pricelists`**: Dynamic pricing rules (`id`, `name`, `rule_type`, `applies_to`, `rules`, `customer_tag`).
11. **`tax_rates`**: Configurable store taxation rates (`id`, `name`, `percentage`, `applies_to`).
12. **`store_settings`**: Global store profile (`id="default"`, `name`, `brand`, `tagline`, `address`, `currency`, `receipt_footer`, `logo_name`, `cashier`, `network`).
13. **`security_events`**: Append-only security audit log (`id`, `kind`, `actor`, `detail`, `location`, `attempt`, `created_at`).
14. **`profiles` & `user_roles`**: User identity and role mapping (`Cashier`, `Manager`, `Admin`) synced automatically via PostgreSQL triggers on `auth.users`.

---

## 4. Role-Based Access Control & Dual-Layer Security

### Access Levels:
- **`Cashier`**: Operational access to POS register (`/till`, `/payment`, `/orders`, `/price-check`, `/close-register`, `/returns`, `/z-report`). Any attempt to access `/backend` is intercepted by `AuthGate` and redirected to `/till`.
- **`Manager`**: Full back-office and POS terminal capabilities; can invite new staff, adjust stock, manage purchase orders, and modify store configurations.
- **`Admin`**: Full privileges across all domains.

### Dual-Layer Back-Office Protection:
1. **First Gate (`AuthGate`)**: Session validation and role check.
2. **Second Gate (`PasscodeGate`)**: 6-digit numeric PIN requirement with 30-second lockout on 3 consecutive failed attempts and automatic audit event logging in `security_events`.

---

## 5. Dynamic Taxation Engine

The system resolves tax rates dynamically per product and category using `src/lib/tax-resolver.ts`:

### Resolution Priority Hierarchy:
```
1. Exact Product Match
   └─ tax_rates.applies_to matches product.id or product.name (case-insensitive)

2. Category Match
   └─ tax_rates.applies_to matches category.id or category.name (e.g. "Desks", "Essential goods")

3. General Store Rule
   └─ tax_rates.applies_to is "All products", "All", "*", or empty string

4. Default Fallback
   └─ First active tax rate in database (defaults to GST 18%)
```

### Financial Formulas:
$$\text{Line Subtotal} = \text{Unit Price} \times \text{Qty} \times (1 - \frac{\text{Line Discount}}{100}) \times (1 - \text{Order Discount})$$
$$\text{Line Tax} = \text{Line Subtotal} \times \text{Effective Tax Rate}$$
$$\text{Order Total} = \sum \text{Line Subtotals} + \sum \text{Line Taxes}$$

---

## 6. Order Lifecycle & Cash Settlement Protocol

```
[Open Register] -> Initial float counted (e.g., Rs. 500)
       │
       ▼
[Active Cart] -> Add items (Tiles / Barcode Scan) -> Apply customer & notes
       │
       ▼
[Payment Screen] -> Tender Split / Full (Cash, Card, Customer Account)
       │
       ▼
[Validate Order]
  ├── Status updated to "paid" and persisted to Supabase
  ├── Settled snapshot preserved in lastPaidOrder for receipts/reprints
  ├── Paid order removed from active till tabs
  └── Fresh sequential order initialized immediately (e.g., 1002)
       │
       ▼
[Close Register] -> Cash count, variance calculation, and Z-Report generation
```

---

## 7. Universal Barcode & Scanner Matrix

The application routes barcode events contextually through `src/lib/scanner-router.ts`:

| Mode | Active Surface | Event Behavior |
|---|---|---|
| **`"till"`** | `/till` | Finds item by barcode/SKU and rings it up in the active cart with audio confirmation. |
| **`"price-check"`** | `/price-check` | Instant lookup displaying shelf price, dynamic tax breakdown, and category. |
| **`"return"`** | `/returns` | Normalizes and matches receipt numbers (e.g. `RCP/1001`, `1001`) or scans replacement items. |
| **`"product-dialog"`**| New/Edit Product Dialogs | Directly populates product barcode input. |
| **`"purchases"`** | `/backend/purchases` | Scans product barcode to immediately create/add purchase order line. |
| **`"customers"`** | Customer Modals & `/backend/customers`| Matches customer member ID, phone, or email and assigns/selects customer. |
| **`"payment"`** | `/payment` | Scans customer card or loyalty account to associate payment. |
| **`"inventory"`** | `/backend/inventory` & `/backend/products`| Filters or selects product for stock adjustment. |

---

## 8. Error Handling, Resilience & Recovery

- **React Error Boundary (`src/components/ui/error-boundary.tsx`)**: Isolates runtime crashes to the affected view, offering user-friendly recovery ("Try again" or "Go to Till") without whole-page whiteouts.
- **Error Capture & Reporting (`src/lib/error-capture.ts`, `src/lib/lovable-error-reporting.ts`)**: Expands nested error causes up to 5 levels deep for observability.
- **Write Debouncing & Offline Fallbacks**: Zero-latency local optimistic state synced to Supabase via 400ms debouncing. Pre-auth rendering utilizes seeded mock data if the cloud connection is establishing.

---

## 9. Responsive Layout Specifications

- **Mobile Viewports (<640px)**: Compact cart item layouts, adaptive numeric keypad, drawer navigation, scrollable data tables.
- **Tablet / Touch Register (768px – 1366px landscape)**: Primary target with minimum 44px touch targets, split cart-and-catalog panels, and accessible keypad.
- **Desktop Browsers (>1366px)**: Multi-column product grids, detailed analytics charts, and sticky navigation.

---

## 10. Operational Runbook & Verification Checklist

- [x] Dependencies installed cleanly (`npm install`).
- [x] TypeScript types and modules validated.
- [x] Dynamic taxation resolves against back-office `tax_rates` table.
- [x] Paid order clears from active till tabs and generates fresh sequential order.
- [x] Universal scanner coverage verified across all 8 scan modes.
- [x] Error boundaries active on root layout and back-office views.
- [x] Receipts and Z-Reports format itemized tax breakdowns accurately.
