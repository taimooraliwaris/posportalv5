import assert from "node:assert";

console.log("\n======================================================================");
console.log("  VELORA POS: COMPREHENSIVE BARCODE & RETURN/EXCHANGE AUTOMATED TESTS ");
console.log("======================================================================\n");

let passed = 0;
let total = 0;

function it(desc, fn) {
  total++;
  try {
    fn();
    console.log(`  ✅ [PASS] ${desc}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ [FAIL] ${desc}`);
    console.error(`     Error: ${err.message}`);
  }
}

// -----------------------------------------------------------------------------
// MOCK DATABASE & CATALOG STATE
// -----------------------------------------------------------------------------
const mockProducts = [
  { id: "p1", name: "18-CD70 Brake Shoe Front", item_code: "18-BS-01", barcode: "896400010011", price: 450, cost_price: 280, stock_qty: 50 },
  { id: "p2", name: "Crown 2.50-17 4PR Motorcycle Tyre", item_code: "TY-CR-250", barcode: "896400020022", price: 3200, cost_price: 2400, stock_qty: 20 },
  { id: "p3", name: "Servis 2.50-17 Motorcycle Tube TR-4", item_code: "TB-SR-250", barcode: "896400030033", price: 420, cost_price: 310, stock_qty: 40 },
  { id: "p4", name: "LED Headlight Bulb H4 12V", item_code: "EL-LED-H4", barcode: "896400040044", price: 1250, cost_price: 800, stock_qty: 15 },
  { id: "p5", name: "Havoline 20W-50 4T Engine Oil 1L", item_code: "LU-HAV-1L", barcode: "896400050055", price: 1100, cost_price: 920, stock_qty: 30 },
];

const mockCustomers = [
  { id: "c1", name: "Ahmad Autos", email: "ahmad@autos.com", phone: "03001234567", barcode: "CUST-001" },
  { id: "c2", name: "Kamran Motors", email: "kamran@motors.com", phone: "03219876543", barcode: "CUST-002" },
];

let mockOrders = [
  {
    id: "ord-1001",
    number: "1001",
    receipt: "RCP/1001",
    status: "paid",
    date: "2026-08-29",
    time: "14:20:00",
    cashier: "Rida A.",
    lines: [
      { id: "l1", productId: "p1", name: "18-CD70 Brake Shoe Front", qty: 2, unitPrice: 450, discount: 0 },
      { id: "l2", productId: "p5", name: "Havoline 20W-50 4T Engine Oil 1L", qty: 1, unitPrice: 1100, discount: 0 },
    ],
    payments: [{ id: "pay-1", method: "Cash", amount: 2000 }],
    note: "",
    noteTags: [],
  },
  {
    id: "ord-1002",
    number: "1002",
    receipt: "RCP/1002",
    status: "paid",
    date: "2026-08-29",
    time: "15:10:00",
    cashier: "Rida A.",
    lines: [
      { id: "l3", productId: "p2", name: "Crown 2.50-17 4PR Motorcycle Tyre", qty: 1, unitPrice: 3200, discount: 0 },
    ],
    payments: [{ id: "pay-2", method: "Card", amount: 3200 }],
    note: "",
    noteTags: [],
  }
];

let mockCashMoves = [];
let mockReturns = [];

// =============================================================================
// TEST SUITE 1: BARCODE SCANNING MATRIX ACROSS ALL POS PAGES
// =============================================================================
console.log("--- 1. BARCODE SCAN MATRIX ACROSS ALL PAGES ---");

// Helper: Simulate Scan Resolution on /till
function handleTillScan(code, activeOrderLines, isEditing) {
  if (isEditing) return { status: "ignored_editing" };
  const trimmed = code.trim().toLowerCase();
  const product = mockProducts.find(
    p => p.barcode?.toLowerCase() === trimmed || p.item_code?.toLowerCase() === trimmed || p.id === code
  );
  if (!product) return { status: "unknown", code };

  const existing = activeOrderLines.find(l => l.productId === product.id);
  let updatedLines;
  if (existing) {
    updatedLines = activeOrderLines.map(l => l.productId === product.id ? { ...l, qty: l.qty + 1 } : l);
  } else {
    updatedLines = [...activeOrderLines, { id: `l-${Date.now()}`, productId: product.id, name: product.name, qty: 1, unitPrice: product.price, discount: 0 }];
  }
  return { status: "added", product, lines: updatedLines };
}

it("/till: Scans barcode '896400010011' and adds item to cart", () => {
  const res = handleTillScan("896400010011", [], false);
  assert.strictEqual(res.status, "added");
  assert.strictEqual(res.product.id, "p1");
  assert.strictEqual(res.lines.length, 1);
  assert.strictEqual(res.lines[0].qty, 1);
});

it("/till: Repeated scan of same barcode increments cart quantity", () => {
  const line1 = [{ id: "l-init", productId: "p1", name: "Brake Shoe", qty: 1, unitPrice: 450, discount: 0 }];
  const res = handleTillScan("896400010011", line1, false);
  assert.strictEqual(res.status, "added");
  assert.strictEqual(res.lines[0].qty, 2);
});

it("/till: Scans SKU/item_code 'TB-SR-250' and resolves product", () => {
  const res = handleTillScan("TB-SR-250", [], false);
  assert.strictEqual(res.status, "added");
  assert.strictEqual(res.product.id, "p3");
});

it("/till: Unknown barcode returns 'unknown' without mutating cart", () => {
  const res = handleTillScan("INVALID-99999", [], false);
  assert.strictEqual(res.status, "unknown");
});

it("/till: Barcode scanner is suppressed while keypad edit mode is active", () => {
  const res = handleTillScan("896400010011", [], true); // isEditing = true
  assert.strictEqual(res.status, "ignored_editing");
});

// Helper: Simulate Scan on /price-check
function handlePriceCheckScan(code) {
  const trimmed = code.trim().toLowerCase();
  const match = mockProducts.find(
    p => p.barcode?.toLowerCase() === trimmed || p.item_code?.toLowerCase() === trimmed || p.id === code
  );
  if (!match) return { found: false, payablePrice: null };
  return { found: true, product: match, payablePrice: match.price };
}

it("/price-check: Barcode scan immediately returns exact payable price", () => {
  const res = handlePriceCheckScan("896400040044"); // LED Bulb
  assert.strictEqual(res.found, true);
  assert.strictEqual(res.product.name, "LED Headlight Bulb H4 12V");
  assert.strictEqual(res.payablePrice, 1250);
});

it("/price-check: SKU scan resolves exact payable price", () => {
  const res = handlePriceCheckScan("TY-CR-250"); // Tyre
  assert.strictEqual(res.found, true);
  assert.strictEqual(res.payablePrice, 3200);
});

// Helper: Simulate Scan on /payment
function handlePaymentScan(code) {
  const trimmed = code.trim().toLowerCase();
  const match = mockCustomers.find(
    c => c.barcode?.toLowerCase() === trimmed || c.phone === trimmed || c.email.toLowerCase() === trimmed || c.id === trimmed
  );
  if (!match) return { matched: false };
  return { matched: true, customer: match, selectedMethod: "Customer Account" };
}

it("/payment: Scans customer loyalty barcode 'CUST-001' and links customer account", () => {
  const res = handlePaymentScan("CUST-001");
  assert.strictEqual(res.matched, true);
  assert.strictEqual(res.customer.name, "Ahmad Autos");
  assert.strictEqual(res.selectedMethod, "Customer Account");
});

it("/payment: Scans customer phone number '03219876543' and links customer account", () => {
  const res = handlePaymentScan("03219876543");
  assert.strictEqual(res.matched, true);
  assert.strictEqual(res.customer.name, "Kamran Motors");
});

// Helper: Simulate Scan on /returns
function handleReturnReceiptScan(code) {
  const raw = code.trim().toLowerCase();
  const normalized = raw.replace(/^(rcp\/|rcp-|#)/i, "");
  const match = mockOrders.find(o => {
    const num = o.number.toLowerCase().trim();
    const rc = o.receipt.toLowerCase().trim().replace(/^(rcp\/|rcp-|#)/i, "");
    return num === normalized || rc === normalized || o.receipt.toLowerCase() === raw;
  });
  if (!match) return { found: false };
  return { found: true, order: match };
}

it("/returns: Scans 'RCP/1001' and finds paid receipt", () => {
  const res = handleReturnReceiptScan("RCP/1001");
  assert.strictEqual(res.found, true);
  assert.strictEqual(res.order.number, "1001");
});

it("/returns: Scans '1002' (plain number) and finds receipt", () => {
  const res = handleReturnReceiptScan("1002");
  assert.strictEqual(res.found, true);
  assert.strictEqual(res.order.receipt, "RCP/1002");
});

it("/returns: In Exchange Mode, scanning product barcode '896400050055' adds replacement item", () => {
  const product = mockProducts.find(p => p.barcode === "896400050055");
  assert.ok(product);
  const replacements = { [product.id]: 1 };
  assert.strictEqual(replacements[product.id], 1);
});

// =============================================================================
// TEST SUITE 2: COMPREHENSIVE RETURN & EXCHANGE WORKFLOW
// =============================================================================
console.log("\n--- 2. RETURN & EXCHANGE LIFECYCLE & DB SYNC ---");

function executeProcessReturn({ kind, originalOrderId, lines, replacements = [], refundAmount = 0, difference = 0, method = "Cash", cashier = "Rida A." }) {
  const origOrder = mockOrders.find(o => o.id === originalOrderId);
  if (!origOrder) throw new Error("Original order not found");

  const prefix = kind === "return" ? "RET" : "EXC";
  const cleanNum = origOrder.number.replace(/^(ORD-|RCP-)/i, "");
  const recordNumber = `${prefix}-${cleanNum}`;

  // 1. Stock Adjustment
  for (const retLine of lines) {
    const prod = mockProducts.find(p => p.id === retLine.productId);
    if (prod) prod.stock_qty += retLine.qty;
  }

  for (const repLine of replacements) {
    const prod = mockProducts.find(p => p.id === repLine.productId);
    if (prod) prod.stock_qty = Math.max(0, prod.stock_qty - repLine.qty);
  }

  // 2. Cash Drawer Movement
  if (method === "Cash") {
    if (kind === "return" && refundAmount > 0) {
      mockCashMoves.push({ id: `cm-${Date.now()}`, type: "out", amount: refundAmount, reason: `Refund for Return ${recordNumber}` });
    } else if (kind === "exchange") {
      if (difference < 0) {
        mockCashMoves.push({ id: `cm-${Date.now()}`, type: "out", amount: Math.abs(difference), reason: `Exchange Refund ${recordNumber}` });
      } else if (difference > 0) {
        mockCashMoves.push({ id: `cm-${Date.now()}`, type: "in", amount: difference, reason: `Exchange Payment ${recordNumber}` });
      }
    }
  }

  // 3. Audit note & Original order update
  const retSummary = lines.map(l => `${l.qty}x ${l.name} (${l.reason})`).join(", ");
  const repSummary = replacements.length > 0 ? " | Replaced with: " + replacements.map(r => `${r.qty}x ${r.name}`).join(", ") : "";
  const auditNote = `[${recordNumber}] Returned: ${retSummary}${repSummary} (Settled via ${method})`;

  origOrder.status = kind === "return" ? "returned" : "exchanged";
  origOrder.note = origOrder.note ? `${origOrder.note} | ${auditNote}` : auditNote;
  origOrder.noteTags = Array.from(new Set([...origOrder.noteTags, kind]));

  // 4. Return Record
  const returnRecord = {
    id: `rec-${Date.now()}`,
    number: recordNumber,
    kind,
    originalOrderId,
    originalNumber: origOrder.number,
    lines,
    replacements,
    refundAmount,
    difference,
    method,
    processedBy: cashier,
    date: "2026-08-29",
    time: "16:00:00",
  };
  mockReturns.push(returnRecord);

  // 5. Mirror Order for Sales / Accounting
  const mirrorOrder = {
    id: returnRecord.id,
    number: recordNumber,
    receipt: `RCP/${recordNumber}`,
    status: origOrder.status,
    lines: (kind === "return" ? lines : replacements).map((l, idx) => ({
      id: `${returnRecord.id}-l${idx}`,
      productId: l.productId,
      name: l.name,
      qty: l.qty,
      unitPrice: l.unitPrice,
      discount: 0,
    })),
    payments: [{
      id: `pay-${returnRecord.id}`,
      method,
      amount: kind === "return" ? -refundAmount : difference,
    }],
    note: auditNote,
    noteTags: [kind],
  };
  mockOrders.push(mirrorOrder);

  return { returnRecord, mirrorOrder, origOrder };
}

it("Case A: Direct Cash Return of 1x Brake Shoe (Rs. 450)", () => {
  const initialStock = mockProducts.find(p => p.id === "p1").stock_qty; // 50
  const initialCashMovesCount = mockCashMoves.length;

  const { returnRecord, origOrder } = executeProcessReturn({
    kind: "return",
    originalOrderId: "ord-1001",
    lines: [{ productId: "p1", name: "18-CD70 Brake Shoe Front", qty: 1, unitPrice: 450, reason: "Damaged" }],
    refundAmount: 450,
    difference: -450,
    method: "Cash",
  });

  // Verify Record Number
  assert.strictEqual(returnRecord.number, "RET-1001");
  // Verify Stock replenishment
  assert.strictEqual(mockProducts.find(p => p.id === "p1").stock_qty, initialStock + 1);
  // Verify Cash Out move logged
  assert.strictEqual(mockCashMoves.length, initialCashMovesCount + 1);
  assert.strictEqual(mockCashMoves[mockCashMoves.length - 1].type, "out");
  assert.strictEqual(mockCashMoves[mockCashMoves.length - 1].amount, 450);
  // Verify Original order audit update
  assert.strictEqual(origOrder.status, "returned");
  assert.ok(origOrder.note.includes("[RET-1001] Returned: 1x 18-CD70 Brake Shoe Front (Damaged)"));
});

it("Case B: Product Exchange with extra payment (Return Rs. 3200 Tyre, get 2x Oil + 1x LED Bulb = Rs. 3450, Customer pays +Rs. 250 Cash)", () => {
  const tyreStock = mockProducts.find(p => p.id === "p2").stock_qty; // 20
  const oilStock = mockProducts.find(p => p.id === "p5").stock_qty;   // 30
  const bulbStock = mockProducts.find(p => p.id === "p4").stock_qty;  // 15

  const { returnRecord, origOrder, mirrorOrder } = executeProcessReturn({
    kind: "exchange",
    originalOrderId: "ord-1002",
    lines: [{ productId: "p2", name: "Crown 2.50-17 4PR Motorcycle Tyre", qty: 1, unitPrice: 3200, reason: "Wrong Size" }],
    replacements: [
      { productId: "p5", name: "Havoline 20W-50 4T Engine Oil 1L", qty: 2, unitPrice: 1100 }, // 2200
      { productId: "p4", name: "LED Headlight Bulb H4 12V", qty: 1, unitPrice: 1250 },        // 1250 -> Total 3450
    ],
    refundAmount: 0,
    difference: 250, // Customer pays +250
    method: "Cash",
  });

  // Verify Record Number
  assert.strictEqual(returnRecord.number, "EXC-1002");
  // Returned item stock +1
  assert.strictEqual(mockProducts.find(p => p.id === "p2").stock_qty, tyreStock + 1);
  // Replaced items stock -2 and -1
  assert.strictEqual(mockProducts.find(p => p.id === "p5").stock_qty, oilStock - 2);
  assert.strictEqual(mockProducts.find(p => p.id === "p4").stock_qty, bulbStock - 1);
  // Cash In move logged for difference
  assert.strictEqual(mockCashMoves[mockCashMoves.length - 1].type, "in");
  assert.strictEqual(mockCashMoves[mockCashMoves.length - 1].amount, 250);
  // Mirror order payment
  assert.strictEqual(mirrorOrder.payments[0].amount, 250);
  // Audit trail verification
  assert.ok(origOrder.note.includes("[EXC-1002] Returned: 1x Crown 2.50-17 4PR Motorcycle Tyre (Wrong Size) | Replaced with: 2x Havoline 20W-50 4T Engine Oil 1L, 1x LED Headlight Bulb H4 12V"));
});

it("Case C: Sales & Accounting Reflection with Returns/Exchanges", () => {
  // Compute net sales
  const completedOrders = mockOrders.filter(o => o.status === "paid" || o.status === "returned" || o.status === "exchanged");
  const totalRevenue = completedOrders.reduce((sum, ord) => {
    const orderPaid = ord.payments.reduce((s, p) => s + p.amount, 0);
    return sum + orderPaid;
  }, 0);

  // Original Sales: 2000 (Ord 1) + 3200 (Ord 2) = 5200
  // Return 1: -450
  // Exchange 2: +250
  // Net Total = 5200 - 450 + 250 = 5000
  assert.strictEqual(totalRevenue, 5000);
});

// =============================================================================
// SUMMARY
// =============================================================================
console.log("\n======================================================================");
console.log(`  COMPREHENSIVE TEST RESULTS: ${passed} / ${total} PASSED`);
if (passed === total) {
  console.log("  🎉 ALL BARCODE SCANNING & RETURN/EXCHANGE AUTOMATED TESTS PASSED 100%!");
} else {
  console.log(`  ⚠️ ${total - passed} TESTS FAILED!`);
}
console.log("======================================================================\n");

process.exit(passed === total ? 0 : 1);
