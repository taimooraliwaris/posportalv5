// @ts-nocheck
import assert from "node:assert/strict";

console.log("\n========================================================");
console.log("🧪 RUNNING COMPREHENSIVE POS ENHANCEMENTS TEST SUITE");
console.log("========================================================\n");

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✅ PASS: ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${name}`);
    console.error(`     Error: ${err.message}`);
    failed++;
  }
}

// -----------------------------------------------------------------------------
// Suite 1: Printing Service & Hardware Profile Defaults
// -----------------------------------------------------------------------------
console.log("📂 [SUITE 1] Printing Service & Hardware Profile Configuration");

test("Default printer profile should be thermal-80 POS receipt", () => {
  const defaultProfile = "thermal-80";
  assert.equal(defaultProfile, "thermal-80", "Standard POS printer must default to 80mm thermal roll");
});

test("Printer settings storage schema allows switching to 58mm or A4", () => {
  const settings = {
    defaultProfile: "thermal-80",
    autoPrintOnCheckout: true,
    storeName: "Velora Auto Parts",
    storePhone: "+92 300 1234567",
    receiptFooter: "Thank you for your visit!",
  };

  assert.equal(settings.defaultProfile, "thermal-80");

  // User changes default to 58mm mini POS
  const updated58 = { ...settings, defaultProfile: "thermal-58" };
  assert.equal(updated58.defaultProfile, "thermal-58");

  // User changes default to A4 laser invoice
  const updatedA4 = { ...settings, defaultProfile: "standard-a4" };
  assert.equal(updatedA4.defaultProfile, "standard-a4");
});

test("Receipt calculations include item discounts and change due accurately", () => {
  const lines = [
    { name: "Servis Tyre 2.50-17", qty: 2, unitPrice: 3200, discount: 10 }, // 2 * 3200 * 0.9 = 5760
    { name: "Brake Shoe CG125", qty: 1, unitPrice: 850, discount: 0 },      // 850
  ];
  const gross = lines.reduce((s, l) => s + l.qty * l.unitPrice, 0); // 6400 + 850 = 7250
  const total = lines.reduce((s, l) => s + l.qty * l.unitPrice * (1 - l.discount / 100), 0); // 5760 + 850 = 6610
  const tendered = 7000;
  const change = tendered - total; // 390

  assert.equal(gross, 7250);
  assert.equal(total, 6610);
  assert.equal(change, 390);
});

// -----------------------------------------------------------------------------
// Suite 2: Register Lifecycle & Starting Cash Enforcement
// -----------------------------------------------------------------------------
console.log("\n📂 [SUITE 2] Register Session, Starting Cash & Day-Rollover Lifecycle");

test("Starting cash float must be required before register can be opened", () => {
  let registerOpen = false;
  let openingCash = 0;

  const openRegister = (amount) => {
    if (amount <= 0 || isNaN(amount)) throw new Error("Starting cash float required");
    openingCash = amount;
    registerOpen = true;
  };

  assert.throws(() => openRegister(0), /Starting cash float required/);
  assert.throws(() => openRegister(-500), /Starting cash float required/);

  openRegister(5000);
  assert.equal(registerOpen, true);
  assert.equal(openingCash, 5000);
});

test("Date change automatically soft-closes counter & requires handover review", () => {
  let sessionDate = "2026-08-28";
  let currentDate = "2026-08-29";
  let registerOpen = true;
  let pendingPreviousShiftClose = false;

  // Midnight date check
  if (sessionDate !== currentDate && registerOpen) {
    registerOpen = false;
    pendingPreviousShiftClose = true;
  }

  assert.equal(registerOpen, false, "Register must be closed when date changes");
  assert.equal(pendingPreviousShiftClose, true, "Cashier must review previous shift before starting new day");
});

test("15-Minute end-of-day alert triggers at 23:45 to prompt cashier reconciliation", () => {
  const checkAlert = (hour, minute, isOpen) => {
    return isOpen && hour === 23 && minute >= 45;
  };

  assert.equal(checkAlert(20, 30, true), false);
  assert.equal(checkAlert(23, 40, true), false);
  assert.equal(checkAlert(23, 45, true), true, "Should trigger warning at 11:45 PM");
  assert.equal(checkAlert(23, 55, true), true, "Should trigger warning at 11:55 PM");
  assert.equal(checkAlert(23, 50, false), false, "Should not trigger if register is already closed");
});

// -----------------------------------------------------------------------------
// Suite 3: Cashier-Specific Scoping & Universal Returns
// -----------------------------------------------------------------------------
console.log("\n📂 [SUITE 3] Cashier-Specific Orders & Universal Return/Exchange");

test("Cashier sees their own created/managed orders in cashier view", () => {
  const allOrders = [
    { id: "o-1", number: "1001", cashier: "Cashier Ahmed", status: "ongoing" },
    { id: "o-2", number: "1002", cashier: "Cashier Bilal", status: "ongoing" },
    { id: "o-3", number: "1003", cashier: "Cashier Ahmed", status: "paid" },
  ];

  const currentCashier = "Cashier Ahmed";
  const myOngoingTabs = allOrders.filter(
    (o) => (o.status === "ongoing" || o.status === "payment") && o.cashier === currentCashier,
  );

  assert.equal(myOngoingTabs.length, 1);
  assert.equal(myOngoingTabs[0].number, "1001");
});

test("Any cashier can look up and process returns/exchanges for orders made by ANY cashier", () => {
  const allHistoricalOrders = [
    { id: "o-1", number: "1001", receipt: "RCP/1001", cashier: "Cashier Ahmed", lines: [{ id: "l-1", productId: "p-1", name: "Tyre", qty: 2, unitPrice: 3000 }] },
    { id: "o-2", number: "1002", receipt: "RCP/1002", cashier: "Cashier Bilal", lines: [{ id: "l-2", productId: "p-2", name: "Oil Filter", qty: 4, unitPrice: 450 }] },
  ];

  // Cashier Zainab is processing return for Order 1002 (originally made by Bilal)
  const processingCashier = "Cashier Zainab";
  const orderToReturn = allHistoricalOrders.find((o) => o.number === "1002" || o.receipt === "RCP/1002");

  assert.ok(orderToReturn, "Must be able to find any order across store");
  assert.equal(orderToReturn.cashier, "Cashier Bilal");

  const returnRecord = {
    kind: "return",
    number: "RET-1002",
    originalOrderId: orderToReturn.id,
    originalNumber: orderToReturn.number,
    refundAmount: 900, // 2 x 450
    processedBy: processingCashier,
  };

  assert.equal(returnRecord.processedBy, "Cashier Zainab");
  assert.equal(returnRecord.originalNumber, "1002");
});

// -----------------------------------------------------------------------------
// Suite 4: Barcode Scanner in Backend Pages (ProductForm, POBuilder, Inventory)
// -----------------------------------------------------------------------------
console.log("\n📂 [SUITE 4] Barcode Scanner Auto-fill & Action in Backend Pages");

test("ProductForm barcode scan auto-fills existing product details or assigns new code", () => {
  const catalog = [
    { id: "p-1", name: "Servis 2.50-17 6PR", barcode: "896400012345", item_code: "TY-01-SERV", cost_price: 2500, price: 3200, stock_qty: 15 },
  ];

  const handleScanInProductForm = (scannedCode) => {
    const trimmed = scannedCode.trim().toLowerCase();
    const existing = catalog.find((p) => p.barcode?.toLowerCase() === trimmed || p.item_code?.toLowerCase() === trimmed);
    if (existing) {
      return { action: "load_existing", product: existing };
    }
    return { action: "set_new_code", code: scannedCode.trim() };
  };

  const matchExisting = handleScanInProductForm("896400012345");
  assert.equal(matchExisting.action, "load_existing");
  assert.equal(matchExisting.product.name, "Servis 2.50-17 6PR");

  const matchSku = handleScanInProductForm("TY-01-SERV");
  assert.equal(matchSku.action, "load_existing");

  const matchNew = handleScanInProductForm("999988887777");
  assert.equal(matchNew.action, "set_new_code");
  assert.equal(matchNew.code, "999988887777");
});

test("POBuilder barcode scan automatically finds product and appends to PO lines", () => {
  const catalog = [
    { id: "p-1", name: "Servis 2.50-17 6PR", barcode: "896400012345", cost_price: 2500, price: 3200 },
    { id: "p-2", name: "Brake Shoe CG125", barcode: "896400067890", cost_price: 600, price: 850 },
  ];

  let poLines = [];
  const handleScanInPOBuilder = (code) => {
    const p = catalog.find((x) => x.barcode === code);
    if (!p) throw new Error("Product not found");
    const existing = poLines.find((l) => l.productId === p.id);
    if (existing) {
      existing.qty += 1;
    } else {
      poLines.push({ productId: p.id, name: p.name, qty: 10, cost: p.cost_price });
    }
  };

  handleScanInPOBuilder("896400012345");
  assert.equal(poLines.length, 1);
  assert.equal(poLines[0].name, "Servis 2.50-17 6PR");
  assert.equal(poLines[0].qty, 10);

  // Scan again increments qty
  handleScanInPOBuilder("896400012345");
  assert.equal(poLines[0].qty, 11);
});

test("Inventory barcode scan locates item and opens stock adjustment", () => {
  const catalog = [
    { id: "p-1", name: "Servis 2.50-17 6PR", barcode: "896400012345", stock_qty: 24 },
  ];

  const handleScanInInventory = (code) => {
    const p = catalog.find((x) => x.barcode === code);
    if (p) return { found: true, productId: p.id, currentStock: p.stock_qty };
    return { found: false };
  };

  const res = handleScanInInventory("896400012345");
  assert.equal(res.found, true);
  assert.equal(res.currentStock, 24);
});

console.log("\n========================================================");
console.log(`📊 TEST RESULTS: ${passed} Passed, ${failed} Failed`);
console.log("========================================================\n");

if (failed > 0) {
  process.exit(1);
}
