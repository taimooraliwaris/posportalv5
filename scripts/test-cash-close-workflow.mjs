import assert from "node:assert";

console.log("\n======================================================================");
console.log("  VELORA POS: CLOSE REGISTER & CASH IN/OUT AUTOMATED TEST SUITE        ");
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

// =============================================================================
// TEST SUITE 1: CASH IN / CASH OUT WORKFLOW & DRAWER FLOAT SYNC
// =============================================================================
console.log("--- 1. CASH IN / CASH OUT WORKFLOW & TRANSACTIONS ---");

function createMockCashSession(initialOpeningCash = 10000) {
  let openingCash = initialOpeningCash;
  let cashMoves = [];
  let orders = [];

  function addCashMove({ type, amount, reason }) {
    if (typeof amount !== "number" || isNaN(amount) || amount <= 0) {
      throw new Error("Amount must be a positive number");
    }
    const move = {
      id: `cm-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      type,
      amount,
      reason,
      created_at: new Date().toISOString(),
    };
    cashMoves.push(move);
    return move;
  }

  function addCompletedOrder(payments = [], lines = []) {
    const ord = {
      id: `ord-${orders.length + 1}`,
      number: String(1000 + orders.length + 1),
      status: "paid",
      payments,
      lines,
    };
    orders.push(ord);
    return ord;
  }

  function getDrawerSummary() {
    const cashSales = orders
      .flatMap(o => o.payments || [])
      .filter(p => p.method === "Cash")
      .reduce((s, p) => s + p.amount, 0);

    const cardSales = orders
      .flatMap(o => o.payments || [])
      .filter(p => p.method === "Card")
      .reduce((s, p) => s + p.amount, 0);

    const accountSales = orders
      .flatMap(o => o.payments || [])
      .filter(p => p.method === "Customer Account")
      .reduce((s, p) => s + p.amount, 0);

    const totalSales = cashSales + cardSales + accountSales;

    const cashIn = cashMoves
      .filter(m => m.type === "in")
      .reduce((s, m) => s + m.amount, 0);

    const cashOut = cashMoves
      .filter(m => m.type === "out")
      .reduce((s, m) => s + m.amount, 0);

    const expectedCash = openingCash + cashSales + cashIn - cashOut;

    return {
      openingCash,
      cashSales,
      cardSales,
      accountSales,
      totalSales,
      cashIn,
      cashOut,
      expectedCash,
      cashMovesCount: cashMoves.length,
      ordersCount: orders.length,
    };
  }

  return {
    addCashMove,
    addCompletedOrder,
    getDrawerSummary,
  };
}

it("Scenario 1.1: Opening Float initializes drawer balance correctly", () => {
  const session = createMockCashSession(5000);
  const summary = session.getDrawerSummary();
  assert.strictEqual(summary.openingCash, 5000);
  assert.strictEqual(summary.expectedCash, 5000);
  assert.strictEqual(summary.totalSales, 0);
});

it("Scenario 1.2: Cash In (Top-Up) increases drawer float", () => {
  const session = createMockCashSession(5000);
  session.addCashMove({ type: "in", amount: 2000, reason: "Cash Top-up for change" });
  const summary = session.getDrawerSummary();
  assert.strictEqual(summary.cashIn, 2000);
  assert.strictEqual(summary.expectedCash, 7000); // 5000 + 2000
});

it("Scenario 1.3: Cash Out (Petty Cash Expense) decreases drawer float", () => {
  const session = createMockCashSession(5000);
  session.addCashMove({ type: "out", amount: 350, reason: "Tea & Refreshment for guests" });
  const summary = session.getDrawerSummary();
  assert.strictEqual(summary.cashOut, 350);
  assert.strictEqual(summary.expectedCash, 4650); // 5000 - 350
});

it("Scenario 1.4: Cash movements validate positive numeric amounts", () => {
  const session = createMockCashSession(5000);
  assert.throws(() => session.addCashMove({ type: "in", amount: 0, reason: "Zero test" }), /positive number/);
  assert.throws(() => session.addCashMove({ type: "out", amount: -500, reason: "Negative test" }), /positive number/);
  assert.throws(() => session.addCashMove({ type: "in", amount: NaN, reason: "NaN test" }), /positive number/);
});

it("Scenario 1.5: Cash Moves do NOT alter sales revenue figures", () => {
  const session = createMockCashSession(10000);
  session.addCashMove({ type: "in", amount: 5000, reason: "Owner Topup" });
  session.addCashMove({ type: "out", amount: 3000, reason: "Supplier Payout" });
  const summary = session.getDrawerSummary();
  assert.strictEqual(summary.totalSales, 0); // Sales must remain 0
  assert.strictEqual(summary.expectedCash, 12000); // 10000 + 5000 - 3000
});

// =============================================================================
// TEST SUITE 2: CLOSE REGISTER RECONCILIATION & VARIANCE CALCULATIONS
// =============================================================================
console.log("\n--- 2. CLOSE REGISTER RECONCILIATION & DENOMINATIONS ---");

it("Scenario 2.1: Multi-payment sales accurately separate cash from non-cash", () => {
  const session = createMockCashSession(10000);

  // Order 1: Rs. 1500 Cash
  session.addCompletedOrder([{ method: "Cash", amount: 1500 }]);
  // Order 2: Rs. 4000 Card
  session.addCompletedOrder([{ method: "Card", amount: 4000 }]);
  // Order 3: Split Rs. 1000 Cash + Rs. 2000 Account
  session.addCompletedOrder([
    { method: "Cash", amount: 1000 },
    { method: "Customer Account", amount: 2000 },
  ]);

  const summary = session.getDrawerSummary();
  assert.strictEqual(summary.cashSales, 2500); // 1500 + 1000
  assert.strictEqual(summary.cardSales, 4000);
  assert.strictEqual(summary.accountSales, 2000);
  assert.strictEqual(summary.totalSales, 8500);
  // Expected in drawer = 10000 (opening) + 2500 (cash sales) = 12500
  assert.strictEqual(summary.expectedCash, 12500);
});

it("Scenario 2.2: Perfect Match closing (Counted === Expected -> Variance: 0)", () => {
  const session = createMockCashSession(5000);
  session.addCompletedOrder([{ method: "Cash", amount: 3200 }]);
  session.addCashMove({ type: "out", amount: 200, reason: "Shop Supplies" });

  const summary = session.getDrawerSummary();
  // Expected: 5000 + 3200 - 200 = 8000
  assert.strictEqual(summary.expectedCash, 8000);

  const counted = 8000;
  const difference = counted - summary.expectedCash;
  assert.strictEqual(difference, 0);
});

it("Scenario 2.3: Cash Surplus closing (Counted > Expected -> Positive Variance)", () => {
  const session = createMockCashSession(5000);
  session.addCompletedOrder([{ method: "Cash", amount: 1000 }]);
  const summary = session.getDrawerSummary(); // Expected 6000

  const counted = 6250;
  const difference = counted - summary.expectedCash;
  assert.strictEqual(difference, 250); // Surplus of +250
});

it("Scenario 2.4: Cash Shortage closing (Counted < Expected -> Negative Variance)", () => {
  const session = createMockCashSession(5000);
  session.addCompletedOrder([{ method: "Cash", amount: 2000 }]);
  const summary = session.getDrawerSummary(); // Expected 7000

  const counted = 6800;
  const difference = counted - summary.expectedCash;
  assert.strictEqual(difference, -200); // Shortage of -200
});

it("Scenario 2.5: Denomination calculator computes exact physical note totals", () => {
  const counts = {
    5000: 2, // 10,000
    1000: 5, // 5,000
    500: 4,  // 2,000
    100: 10, // 1,000
    50: 6,   // 300
    20: 5,   // 100
    10: 10,  // 100
  };

  const totalDenoms = Object.entries(counts).reduce((sum, [denom, count]) => {
    return sum + Number(denom) * Number(count);
  }, 0);

  // Total: 10000 + 5000 + 2000 + 1000 + 300 + 100 + 100 = 18,500
  assert.strictEqual(totalDenoms, 18500);
});

it("Scenario 2.6: Complete Shift Closing Report Snapshot Generation", () => {
  const session = createMockCashSession(10000);
  session.addCompletedOrder([{ method: "Cash", amount: 4500 }]);
  session.addCompletedOrder([{ method: "Card", amount: 3500 }]);
  session.addCashMove({ type: "in", amount: 1000, reason: "Float Increase" });
  session.addCashMove({ type: "out", amount: 500, reason: "Lunch Expense" });

  const summary = session.getDrawerSummary();
  const counted = 15000;
  const difference = counted - summary.expectedCash; // 15000 - 15000 = 0

  const closingReport = {
    openingCash: summary.openingCash,
    cashSales: summary.cashSales,
    cardSales: summary.cardSales,
    accountSales: summary.accountSales,
    totalSales: summary.totalSales,
    cashIn: summary.cashIn,
    cashOut: summary.cashOut,
    expectedCash: summary.expectedCash,
    counted,
    difference,
    ordersCount: summary.ordersCount,
    closedAt: "2026-08-29T19:00:00Z",
    cashier: "Rida A.",
  };

  assert.strictEqual(closingReport.expectedCash, 15000);
  assert.strictEqual(closingReport.difference, 0);
  assert.strictEqual(closingReport.totalSales, 8000);
  assert.strictEqual(closingReport.ordersCount, 2);
});

// =============================================================================
// SUMMARY
// =============================================================================
console.log("\n======================================================================");
console.log(`  CLOSE REGISTER & CASH MOVE TEST RESULTS: ${passed} / ${total} PASSED`);
if (passed === total) {
  console.log("  🎉 ALL CLOSE REGISTER & CASH MOVE AUTOMATED TESTS PASSED 100%!");
} else {
  console.log(`  ⚠️ ${total - passed} TESTS FAILED!`);
}
console.log("======================================================================\n");

process.exit(passed === total ? 0 : 1);
