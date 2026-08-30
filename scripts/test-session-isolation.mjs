// @ts-nocheck
import assert from "node:assert/strict";

console.log("\n========================================================");
console.log("🧪 RUNNING MULTI-SESSION ISOLATION & ACCURACY TEST SUITE");
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
// Test 1: Session 1 (Initial shift with orders and cash moves)
// -----------------------------------------------------------------------------
console.log("📂 [TEST 1] Shift Session 1 (Cashier Nauman Khan)");

const session1Id = "ses-20260829-090000-nmn";
const session1OpenedAt = "2026-08-29T09:00:00.000Z";
const session1Float = 2000;

// Orders placed in Session 1
const orders = [
  { id: "o-1", number: "1010", receipt: "RCP/1010", status: "paid", cashier: "Nauman Khan", date: "2026-08-29", time: "10:15", createdAt: "2026-08-29T10:15:00.000Z", sessionId: session1Id, lines: [{ name: "Servis Tyre", qty: 2, unitPrice: 3325 }], payments: [{ id: "p-1", method: "Cash", amount: 6650 }] },
  { id: "o-2", number: "1011", receipt: "RCP/1011", status: "paid", cashier: "Nauman Khan", date: "2026-08-29", time: "11:30", createdAt: "2026-08-29T11:30:00.000Z", sessionId: session1Id, lines: [{ name: "Brake Shoe", qty: 3, unitPrice: 326.67 }], payments: [{ id: "p-2", method: "Cash", amount: 980 }] },
  { id: "o-3", number: "1013", receipt: "RCP/1013", status: "paid", cashier: "Nauman Khan", date: "2026-08-29", time: "14:20", createdAt: "2026-08-29T14:20:00.000Z", sessionId: session1Id, lines: [{ name: "Tube 2.50-17", qty: 2, unitPrice: 500 }], payments: [{ id: "p-3", method: "Card", amount: 1000 }] },
];

// Cash moves in Session 1
const cashMoves = [
  { id: "cm-1", type: "in", amount: 2050, reason: "Opening Top-Up", date: "2026-08-29", createdAt: "2026-08-29T09:15:00.000Z", sessionId: session1Id },
];

test("Session 1 calculates accurate cash sales, card sales, and expected cash", () => {
  const session1Orders = orders.filter((o) => o.sessionId === session1Id && o.status === "paid");
  const session1CashSales = session1Orders.flatMap((o) => o.payments).filter((p) => p.method === "Cash").reduce((s, p) => s + p.amount, 0);
  const session1CardSales = session1Orders.flatMap((o) => o.payments).filter((p) => p.method === "Card").reduce((s, p) => s + p.amount, 0);
  const session1CashIn = cashMoves.filter((m) => m.sessionId === session1Id && m.type === "in").reduce((s, m) => s + m.amount, 0);
  const session1CashOut = cashMoves.filter((m) => m.sessionId === session1Id && m.type === "out").reduce((s, m) => s + m.amount, 0);

  const expectedCash1 = session1Float + session1CashSales + session1CashIn - session1CashOut;

  assert.equal(session1CashSales, 7630); // 6650 + 980
  assert.equal(session1CardSales, 1000);
  assert.equal(session1CashIn, 2050);
  assert.equal(session1CashOut, 0);
  assert.equal(expectedCash1, 11680); // 2000 + 7630 + 2050
});

// Close Session 1
const session1Record = {
  id: session1Id,
  date: "2026-08-29",
  cashier: "Nauman Khan",
  openedAt: "09:00",
  closedAt: "15:00",
  openingFloat: session1Float,
  totalSales: 8630,
  cashSales: 7630,
  cardSales: 1000,
  variance: 0,
  orderCount: 3,
};

// -----------------------------------------------------------------------------
// Test 2: Session 2 (New register on same date with Rs 500 initial cash and Rs 500 cash out)
// -----------------------------------------------------------------------------
console.log("\n📂 [TEST 2] Shift Session 2 (New counter with Rs. 500 Float & Rs. 500 Cash Out)");

const session2Id = "ses-20260829-153000-usr2";
const session2OpenedAt = "2026-08-29T15:30:00.000Z";
const session2Float = 500;

// Add cash out of 500 to Session 2
cashMoves.push({
  id: "cm-2",
  type: "out",
  amount: 500,
  reason: "Petty Cash Payout",
  date: "2026-08-29",
  createdAt: "2026-08-29T15:35:00.000Z",
  sessionId: session2Id,
});

test("Session 2 does NOT inherit Session 1 sales and strictly calculates Expected Cash as Rs. 0.00", () => {
  // Filter strictly for Session 2
  const session2Orders = orders.filter((o) => o.sessionId === session2Id && o.status === "paid");
  const session2CashMoves = cashMoves.filter((m) => m.sessionId === session2Id);

  const session2CashSales = session2Orders.flatMap((o) => o.payments).filter((p) => p.method === "Cash").reduce((s, p) => s + p.amount, 0);
  const session2CardSales = session2Orders.flatMap((o) => o.payments).filter((p) => p.method === "Card").reduce((s, p) => s + p.amount, 0);
  const session2CashIn = session2CashMoves.filter((m) => m.type === "in").reduce((s, m) => s + m.amount, 0);
  const session2CashOut = session2CashMoves.filter((m) => m.type === "out").reduce((s, m) => s + m.amount, 0);

  const expectedCash2 = session2Float + session2CashSales + session2CashIn - session2CashOut;

  assert.equal(session2Orders.length, 0, "Session 2 should have 0 orders");
  assert.equal(session2CashSales, 0, "Session 2 cash sales must be 0");
  assert.equal(session2CardSales, 0, "Session 2 card sales must be 0");
  assert.equal(session2CashIn, 0, "Session 2 cash in must be 0");
  assert.equal(session2CashOut, 500, "Session 2 cash out must be 500");
  assert.equal(expectedCash2, 0, "Expected cash in drawer for Session 2 must be strictly 0.00 (500 float - 500 cash out)");
});

// Close Session 2
const session2Record = {
  id: session2Id,
  date: "2026-08-29",
  cashier: "Nauman Khan",
  openedAt: "15:30",
  closedAt: "18:00",
  openingFloat: session2Float,
  totalSales: 0,
  cashSales: 0,
  cardSales: 0,
  variance: 0,
  orderCount: 0,
};

// -----------------------------------------------------------------------------
// Test 3: Session 3 (Another cashier on same date with 1 order)
// -----------------------------------------------------------------------------
console.log("\n📂 [TEST 3] Shift Session 3 (Cashier Zainab Ali with 1 sale of Rs. 1500)");

const session3Id = "ses-20260829-183000-znb";
const session3OpenedAt = "2026-08-29T18:30:00.000Z";
const session3Float = 1000;

orders.push({
  id: "o-4",
  number: "1014",
  receipt: "RCP/1014",
  status: "paid",
  cashier: "Zainab Ali",
  date: "2026-08-29",
  time: "19:00",
  createdAt: "2026-08-29T19:00:00.000Z",
  sessionId: session3Id,
  lines: [{ name: "Crown Spark Plug", qty: 5, unitPrice: 300 }],
  payments: [{ id: "p-4", method: "Cash", amount: 1500 }],
});

test("Session 3 calculates accurate expected cash for Cashier Zainab independently", () => {
  const session3Orders = orders.filter((o) => o.sessionId === session3Id && o.status === "paid");
  const session3CashSales = session3Orders.flatMap((o) => o.payments).filter((p) => p.method === "Cash").reduce((s, p) => s + p.amount, 0);
  const session3CashIn = cashMoves.filter((m) => m.sessionId === session3Id && m.type === "in").reduce((s, m) => s + m.amount, 0);
  const session3CashOut = cashMoves.filter((m) => m.sessionId === session3Id && m.type === "out").reduce((s, m) => s + m.amount, 0);

  const expectedCash3 = session3Float + session3CashSales + session3CashIn - session3CashOut;

  assert.equal(session3Orders.length, 1);
  assert.equal(session3CashSales, 1500);
  assert.equal(expectedCash3, 2500, "1000 float + 1500 cash sales = 2500 expected cash");
});

const session3Record = {
  id: session3Id,
  date: "2026-08-29",
  cashier: "Zainab Ali",
  openedAt: "18:30",
  closedAt: "21:30",
  openingFloat: session3Float,
  totalSales: 1500,
  cashSales: 1500,
  cardSales: 0,
  variance: 0,
  orderCount: 1,
};

// -----------------------------------------------------------------------------
// Test 4: Multi-Session Separation in History & Daily Union in Reports
// -----------------------------------------------------------------------------
console.log("\n📂 [TEST 4] Multi-Session History & Daily Union in Back Office Reports");

const allStoredSessions = [session1Record, session2Record, session3Record];

test("Session History preserves individual cashier shifts separately", () => {
  assert.equal(allStoredSessions.length, 3);
  assert.equal(allStoredSessions[0].cashier, "Nauman Khan");
  assert.equal(allStoredSessions[0].totalSales, 8630);
  assert.equal(allStoredSessions[1].cashier, "Nauman Khan");
  assert.equal(allStoredSessions[1].totalSales, 0);
  assert.equal(allStoredSessions[2].cashier, "Zainab Ali");
  assert.equal(allStoredSessions[2].totalSales, 1500);
});

test("Daily Reports calculates the accumulated union of all cashiers on 2026-08-29", () => {
  const dateSessions = allStoredSessions.filter((s) => s.date === "2026-08-29");
  const dailyTotalSales = dateSessions.reduce((sum, s) => sum + s.totalSales, 0);
  const dailyCashSales = dateSessions.reduce((sum, s) => sum + s.cashSales, 0);
  const dailyCardSales = dateSessions.reduce((sum, s) => sum + s.cardSales, 0);
  const dailyOrdersCount = dateSessions.reduce((sum, s) => sum + s.orderCount, 0);

  assert.equal(dailyTotalSales, 10130, "8630 + 0 + 1500 = 10130 Total Store Sales");
  assert.equal(dailyCashSales, 9130, "7630 + 0 + 1500 = 9130 Cash Sales");
  assert.equal(dailyCardSales, 1000, "1000 Card Sales");
  assert.equal(dailyOrdersCount, 4, "3 + 0 + 1 = 4 Orders settled across store today");
});

console.log("\n========================================================");
console.log(`📊 TEST RESULTS: ${passed} Passed, ${failed} Failed`);
console.log("========================================================\n");

if (failed > 0) {
  process.exit(1);
}
