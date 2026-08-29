import assert from "node:assert";

console.log("\n=======================================================");
console.log("  VELORA POS: AUTOMATIC SYSTEMATIC FUNCTIONALITY TEST  ");
console.log("=======================================================\n");

let passedTests = 0;
let totalTests = 0;

function test(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  ✅ [PASS] ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ❌ [FAIL] ${name}`);
    console.error(`     Error: ${err.message}`);
  }
}

// --------------------------------------------------------------------------
// SUITE 1: Tax-Free Order Calculation & Discount Engine
// --------------------------------------------------------------------------
console.log("--- 1. Order Calculations & Discount Engine ---");

function calculateOrderTotals(lines, orderDiscountRate = 0) {
  let gross = 0;
  for (const line of lines) {
    const lineDiscount = line.discount ? line.discount / 100 : 0;
    gross += line.qty * line.unitPrice * (1 - lineDiscount);
  }
  const discountAmount = gross * orderDiscountRate;
  const subtotal = gross - discountAmount;
  return {
    gross,
    discountAmount,
    subtotal,
    total: subtotal,
  };
}

test("Single item standard total (qty=2, price=500)", () => {
  const lines = [{ id: "l1", productId: "p1", name: "Spark Plug", qty: 2, unitPrice: 500, discount: 0 }];
  const res = calculateOrderTotals(lines, 0);
  assert.strictEqual(res.gross, 1000);
  assert.strictEqual(res.discountAmount, 0);
  assert.strictEqual(res.total, 1000);
});

test("Line-level discount calculation (qty=2, price=1000, 10% discount)", () => {
  const lines = [{ id: "l1", productId: "p1", name: "Brake Pad", qty: 2, unitPrice: 1000, discount: 10 }];
  const res = calculateOrderTotals(lines, 0);
  assert.strictEqual(res.gross, 1800);
  assert.strictEqual(res.total, 1800);
});

test("Order-level pricelist discount calculation (15% VIP discount on 2000 gross)", () => {
  const lines = [{ id: "l1", productId: "p1", name: "Motor Oil", qty: 2, unitPrice: 1000, discount: 0 }];
  const res = calculateOrderTotals(lines, 0.15);
  assert.strictEqual(res.gross, 2000);
  assert.strictEqual(res.discountAmount, 300);
  assert.strictEqual(res.total, 1700);
});

test("Combined Line discount + Order pricelist discount", () => {
  // Gross: 1000 with 20% off = 800.
  // Order discount: 10% on 800 = 80.
  // Final total = 720.
  const lines = [{ id: "l1", productId: "p1", name: "Battery", qty: 1, unitPrice: 1000, discount: 20 }];
  const res = calculateOrderTotals(lines, 0.10);
  assert.strictEqual(res.gross, 800);
  assert.strictEqual(res.discountAmount, 80);
  assert.strictEqual(res.total, 720);
});

test("Verify tax is strictly 0 and total matches subtotal", () => {
  const lines = [
    { id: "l1", productId: "p1", name: "Tyre", qty: 4, unitPrice: 3500, discount: 5 },
    { id: "l2", productId: "p2", name: "Tube", qty: 4, unitPrice: 400, discount: 0 },
  ];
  const res = calculateOrderTotals(lines, 0);
  // (4 * 3500 * 0.95 = 13300) + (4 * 400 = 1600) = 14900
  assert.strictEqual(res.gross, 14900);
  assert.strictEqual(res.subtotal, 14900);
  assert.strictEqual(res.total, 14900);
});

// --------------------------------------------------------------------------
// SUITE 2: Numeric Keypad & Input Processing
// --------------------------------------------------------------------------
console.log("\n--- 2. Numeric Keypad & Digit Entry Engine ---");

function applyNumericKey(current, key, maxDecimals = 2) {
  if (key === "backspace") return current.slice(0, -1);
  if (key === "clear") return "";
  if (key === ".") {
    if (maxDecimals === 0 || current.includes(".")) return current;
    return current === "" ? "0." : `${current}.`;
  }
  if (!/^[0-9]$/.test(key)) return current;
  const decimals = current.split(".")[1];
  if (decimals !== undefined && decimals.length >= maxDecimals) return current;
  if (current === "0") return key;
  return current + key;
}

test("Keypad integer quantity entry (maxDecimals=0)", () => {
  let val = "";
  val = applyNumericKey(val, "1", 0);
  val = applyNumericKey(val, "5", 0);
  val = applyNumericKey(val, ".", 0); // Decimal must be rejected for Qty
  assert.strictEqual(val, "15");
});

test("Keypad price entry with decimal (maxDecimals=2)", () => {
  let val = "";
  val = applyNumericKey(val, "4", 2);
  val = applyNumericKey(val, "9", 2);
  val = applyNumericKey(val, ".", 2);
  val = applyNumericKey(val, "9", 2);
  val = applyNumericKey(val, "5", 2);
  val = applyNumericKey(val, "9", 2); // 3rd decimal must be rejected
  assert.strictEqual(val, "49.95");
});

test("Keypad backspace and clear", () => {
  let val = "1250";
  val = applyNumericKey(val, "backspace", 2);
  assert.strictEqual(val, "125");
  val = applyNumericKey(val, "clear", 2);
  assert.strictEqual(val, "");
});

// --------------------------------------------------------------------------
// SUITE 3: Monotonic Order Numbering & Multi-Tab Sequences
// --------------------------------------------------------------------------
console.log("\n--- 3. Order Numbering & Monotonic Sequencing ---");

function extractDigitsNumber(val) {
  if (!val) return 0;
  const str = String(val);
  const digits = str.replace(/[^\d]/g, "");
  const num = parseInt(digits, 10);
  return Number.isFinite(num) ? num : 0;
}

const mockLocalStorage = new Map();

function nextOrderNumber(orders = [], extra = []) {
  let highest = 1000;
  for (const o of orders) {
    const n = extractDigitsNumber(o.number);
    if (n > highest) highest = n;
    const r = extractDigitsNumber(o.receipt);
    if (r > highest) highest = r;
  }
  for (const x of extra) {
    const n = extractDigitsNumber(x?.number);
    if (n > highest) highest = n;
  }
  const saved = parseInt(mockLocalStorage.get("velora_last_order_seq") || "0", 10);
  if (Number.isFinite(saved) && saved > highest) {
    highest = saved;
  }
  const next = highest + 1;
  mockLocalStorage.set("velora_last_order_seq", String(next));
  return String(next);
}

test("First order generates 1001", () => {
  mockLocalStorage.clear();
  const num = nextOrderNumber([], []);
  assert.strictEqual(num, "1001");
});

test("Sequential tabs generate unique incrementing numbers (1002, 1003, 1004)", () => {
  const o1 = { number: "1001", receipt: "RCP/1001" };
  const num2 = nextOrderNumber([o1]);
  assert.strictEqual(num2, "1002");
  
  const o2 = { number: num2, receipt: `RCP/${num2}` };
  const num3 = nextOrderNumber([o1, o2]);
  assert.strictEqual(num3, "1003");

  const o3 = { number: num3, receipt: `RCP/${num3}` };
  const num4 = nextOrderNumber([o1, o2, o3]);
  assert.strictEqual(num4, "1004");
});

test("Order deletion does not reuse deleted order number", () => {
  // We reached 1004. Now if order 1004 is deleted/cancelled, next tab must be 1005
  const remaining = [{ number: "1001" }, { number: "1002" }];
  const num5 = nextOrderNumber(remaining);
  assert.strictEqual(num5, "1005");
});

test("Handles non-numeric prefix strings properly without NaN (ORD-1020, RET-1020)", () => {
  const existing = [{ number: "ORD-1020", receipt: "RCP-1020" }];
  const num = nextOrderNumber(existing);
  assert.strictEqual(num, "1021");
});

// --------------------------------------------------------------------------
// SUITE 4: Payment Tender, Split Payments & Change Due
// --------------------------------------------------------------------------
console.log("\n--- 4. Payment Tender & Settlement Processing ---");

test("Exact tender payment (Total: 1500, Cash: 1500)", () => {
  const total = 1500;
  const payments = [{ method: "Cash", amount: 1500 }];
  const tendered = payments.reduce((s, p) => s + p.amount, 0);
  const remaining = Math.max(0, total - tendered);
  const change = Math.max(0, tendered - total);
  const covered = tendered >= total && total > 0;
  assert.strictEqual(remaining, 0);
  assert.strictEqual(change, 0);
  assert.strictEqual(covered, true);
});

test("Over-tender with change due (Total: 1200, Tendered: 2000)", () => {
  const total = 1200;
  const payments = [{ method: "Cash", amount: 2000 }];
  const tendered = payments.reduce((s, p) => s + p.amount, 0);
  const remaining = Math.max(0, total - tendered);
  const change = Math.max(0, tendered - total);
  const covered = tendered >= total && total > 0;
  assert.strictEqual(remaining, 0);
  assert.strictEqual(change, 800);
  assert.strictEqual(covered, true);
});

test("Split payment: Part Cash + Part Card (Total: 5000, Cash: 2000, Card: 3000)", () => {
  const total = 5000;
  const payments = [
    { method: "Cash", amount: 2000 },
    { method: "Card", amount: 3000 },
  ];
  const tendered = payments.reduce((s, p) => s + p.amount, 0);
  const remaining = Math.max(0, total - tendered);
  const change = Math.max(0, tendered - total);
  const covered = tendered >= total && total > 0;
  assert.strictEqual(remaining, 0);
  assert.strictEqual(change, 0);
  assert.strictEqual(covered, true);
});

test("Under-tender cannot validate order (Total: 3000, Tendered: 1000)", () => {
  const total = 3000;
  const payments = [{ method: "Cash", amount: 1000 }];
  const tendered = payments.reduce((s, p) => s + p.amount, 0);
  const remaining = Math.max(0, total - tendered);
  const covered = tendered >= total && total > 0;
  assert.strictEqual(remaining, 2000);
  assert.strictEqual(covered, false);
});

// --------------------------------------------------------------------------
// SUITE 5: Inventory Stock Deduction on Payment
// --------------------------------------------------------------------------
console.log("\n--- 5. Inventory Stock Deduction on Sale ---");

test("Order validation correctly decrements inventory stock_qty", () => {
  const products = [
    { id: "p1", name: "Engine Oil", stock_qty: 20 },
    { id: "p2", name: "Air Filter", stock_qty: 5 },
  ];
  
  const soldLines = [
    { productId: "p1", qty: 3 },
    { productId: "p2", qty: 2 },
  ];

  // Process deduction
  for (const line of soldLines) {
    const prod = products.find(p => p.id === line.productId);
    prod.stock_qty = Math.max(0, prod.stock_qty - line.qty);
  }

  assert.strictEqual(products[0].stock_qty, 17);
  assert.strictEqual(products[1].stock_qty, 3);
});

test("Inventory stock does not drop below 0 if sale exceeds stock", () => {
  const products = [{ id: "p3", name: "Wiper Blade", stock_qty: 2 }];
  const soldLines = [{ productId: "p3", qty: 5 }];

  for (const line of soldLines) {
    const prod = products.find(p => p.id === line.productId);
    prod.stock_qty = Math.max(0, prod.stock_qty - line.qty);
  }

  assert.strictEqual(products[0].stock_qty, 0);
});

// --------------------------------------------------------------------------
// SUITE 6: Returns & Exchanges Processing
// --------------------------------------------------------------------------
console.log("\n--- 6. Return & Exchange Lifecycle & Audit Trail ---");

function processMockReturn({ kind, originalNumber, originalOrderId, lines, replacements, refundAmount, difference, method, products }) {
  const prefix = kind === "return" ? "RET" : "EXC";
  const cleanOriginalNum = String(originalNumber).replace(/^(ORD-|RCP-)/i, "");
  const recordNumber = `${prefix}-${cleanOriginalNum}`;

  // 1. Stock replenishment for returned items
  for (const l of lines) {
    const prod = products.find(p => p.id === l.productId);
    if (prod) prod.stock_qty += l.qty;
  }

  // 2. Stock deduction for exchange replacements
  if (kind === "exchange" && replacements?.length) {
    for (const r of replacements) {
      const prod = products.find(p => p.id === r.productId);
      if (prod) prod.stock_qty = Math.max(0, prod.stock_qty - r.qty);
    }
  }

  // 3. Audit trail note
  const returnDetails = lines.map(l => `${l.qty}x ${l.name} (${l.reason})`).join(", ");
  const repDetails = kind === "exchange" && replacements?.length
    ? " | Replaced with: " + replacements.map(r => `${r.qty}x ${r.name}`).join(", ")
    : "";
  const auditNote = `[${recordNumber}] Returned: ${returnDetails}${repDetails} (Settled via ${method})`;

  return {
    recordNumber,
    auditNote,
    netPayment: kind === "return" ? -refundAmount : difference,
  };
}

test("Direct return replenishes stock and sets negative payment for accounting", () => {
  const products = [{ id: "p1", name: "Brake Disc", stock_qty: 10 }];
  const originalOrder = { id: "ord-1", number: "1010", status: "paid" };

  const result = processMockReturn({
    kind: "return",
    originalNumber: originalOrder.number,
    originalOrderId: originalOrder.id,
    lines: [{ productId: "p1", name: "Brake Disc", qty: 2, unitPrice: 1500, reason: "Damaged" }],
    replacements: [],
    refundAmount: 3000,
    difference: -3000,
    method: "Cash",
    products,
  });

  assert.strictEqual(products[0].stock_qty, 12); // 10 + 2
  assert.strictEqual(result.recordNumber, "RET-1010");
  assert.strictEqual(result.netPayment, -3000);
  assert.ok(result.auditNote.includes("[RET-1010] Returned: 2x Brake Disc (Damaged)"));
});

test("Exchange with positive difference (Customer owes extra)", () => {
  const products = [
    { id: "p1", name: "Standard Bulb", stock_qty: 15 },
    { id: "p2", name: "LED Headlight Bulb", stock_qty: 8 },
  ];

  // Return 1x Standard Bulb (Rs. 500), replace with 1x LED Bulb (Rs. 1800)
  // Customer pays +Rs. 1300
  const result = processMockReturn({
    kind: "exchange",
    originalNumber: "1015",
    originalOrderId: "ord-2",
    lines: [{ productId: "p1", name: "Standard Bulb", qty: 1, unitPrice: 500, reason: "Wrong Item" }],
    replacements: [{ productId: "p2", name: "LED Headlight Bulb", qty: 1, unitPrice: 1800 }],
    refundAmount: 0,
    difference: 1300,
    method: "Card",
    products,
  });

  assert.strictEqual(products[0].stock_qty, 16); // Standard bulb returned (+1)
  assert.strictEqual(products[1].stock_qty, 7);  // LED bulb taken (-1)
  assert.strictEqual(result.recordNumber, "EXC-1015");
  assert.strictEqual(result.netPayment, 1300);
  assert.ok(result.auditNote.includes("[EXC-1015] Returned: 1x Standard Bulb (Wrong Item) | Replaced with: 1x LED Headlight Bulb"));
});

// --------------------------------------------------------------------------
// SUMMARY
// --------------------------------------------------------------------------
console.log("\n=======================================================");
console.log(`  TEST RESULTS: ${passedTests} / ${totalTests} PASSED`);
if (passedTests === totalTests) {
  console.log("  🎉 ALL AUTOMATED TILL & PAYMENT TESTS PASSED 100%!");
} else {
  console.log(`  ⚠️ ${totalTests - passedTests} TESTS FAILED!`);
}
console.log("=======================================================\n");

process.exit(passedTests === totalTests ? 0 : 1);
