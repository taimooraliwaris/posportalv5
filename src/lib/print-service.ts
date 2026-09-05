// @ts-nocheck
import { formatRs, type Product } from "./pos-data";
import { type Order, type ReturnRecord, orderTotals } from "./pos-context";
import { calculateOrderTotals } from "./tax-resolver";

export type PrinterProfile = "thermal-80" | "thermal-58" | "standard-a4";

export interface PrinterSettings {
  defaultProfile: PrinterProfile;
  autoPrintOnCheckout: boolean;
}

const STORAGE_KEY = "velora_printer_settings";

export const defaultPrinterSettings: PrinterSettings = {
  defaultProfile: "thermal-80",
  autoPrintOnCheckout: false,
};

export function getPrinterSettings(): PrinterSettings {
  if (typeof window === "undefined") return defaultPrinterSettings;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return { ...defaultPrinterSettings, ...JSON.parse(raw) };
    }
  } catch {}
  return defaultPrinterSettings;
}

export function savePrinterSettings(patch: Partial<PrinterSettings>): PrinterSettings {
  const current = getPrinterSettings();
  const next = { ...current, ...patch };
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {}
  }
  return next;
}

export function escapeHtml(value: any): string {
  if (value === null || value === undefined) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function getCssStyles(profile: PrinterProfile): string {
  if (profile === "thermal-58") {
    return `
      * { box-sizing: border-box; margin: 0; padding: 0; }
      @page { size: 58mm auto; margin: 0; }
      body {
        width: 54mm;
        margin: 0 auto;
        padding: 4mm 1mm;
        font-family: 'Courier New', Courier, monospace, ui-monospace;
        font-size: 10px;
        line-height: 1.2;
        color: #000;
        background: #fff;
      }
      .center { text-align: center; }
      .right { text-align: right; }
      .bold { font-weight: bold; }
      .title { font-size: 13px; font-weight: bold; margin-bottom: 2px; }
      .subtitle { font-size: 9px; margin-bottom: 4px; }
      .divider { border-top: 1px dashed #000; margin: 4px 0; }
      .double-divider { border-top: 1px double #000; margin: 5px 0; }
      table { width: 100%; border-collapse: collapse; margin: 3px 0; font-size: 10px; }
      th, td { padding: 2px 0; text-align: left; vertical-align: top; }
      th.num, td.num { text-align: right; }
      .row { display: flex; justify-content: space-between; padding: 1.5px 0; }
      .total-row { font-size: 12px; font-weight: bold; }
      .footer { margin-top: 6px; font-size: 8.5px; text-align: center; }
    `;
  }

  if (profile === "standard-a4") {
    return `
      * { box-sizing: border-box; margin: 0; padding: 0; }
      @page { size: A4 portrait; margin: 12mm; }
      body {
        font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        font-size: 12px;
        color: #111827;
        padding: 10px;
        background: #fff;
      }
      .header-box { display: flex; justify-content: space-between; border-bottom: 2px solid #111827; padding-bottom: 12px; margin-bottom: 16px; }
      .title { font-size: 22px; font-weight: 800; color: #111827; }
      .subtitle { font-size: 12px; color: #4b5563; }
      .invoice-badge { text-align: right; }
      .invoice-badge h2 { font-size: 18px; font-weight: bold; color: #111827; margin: 0; }
      .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px; font-size: 11px; }
      table { width: 100%; border-collapse: collapse; margin: 12px 0; }
      th { background-color: #f3f4f6; color: #374151; font-weight: 700; text-transform: uppercase; font-size: 10px; padding: 8px; border: 1px solid #e5e7eb; }
      td { padding: 8px; border: 1px solid #e5e7eb; }
      td.num, th.num { text-align: right; font-family: monospace; }
      .summary-box { width: 300px; margin-left: auto; margin-top: 12px; border: 1px solid #e5e7eb; padding: 10px; border-radius: 4px; }
      .row { display: flex; justify-content: space-between; padding: 3px 0; font-size: 11px; }
      .row.strong { font-weight: 700; border-top: 1px solid #111827; padding-top: 6px; font-size: 13px; }
      .footer { margin-top: 30px; text-align: center; font-size: 10px; color: #6b7280; border-top: 1px solid #e5e7eb; padding-top: 10px; }
    `;
  }

  // Default: Thermal 80mm POS Receipt
  return `
    * { box-sizing: border-box; margin: 0; padding: 0; }
    @page { size: 80mm auto; margin: 0; }
    body {
      width: 72mm;
      margin: 0 auto;
      padding: 5mm 2mm;
      font-family: 'Courier New', Courier, monospace, ui-monospace;
      font-size: 11.5px;
      line-height: 1.25;
      color: #000;
      background: #fff;
    }
    .center { text-align: center; }
    .right { text-align: right; }
    .bold { font-weight: bold; }
    .title { font-size: 16px; font-weight: 900; margin-bottom: 3px; letter-spacing: 0.05em; }
    .subtitle { font-size: 10.5px; margin-bottom: 4px; color: #222; }
    .divider { border-top: 1px dashed #000; margin: 5px 0; }
    .double-divider { border-top: 2px dashed #000; margin: 6px 0; }
    table { width: 100%; border-collapse: collapse; margin: 4px 0; font-size: 11px; }
    th { padding: 3px 0; border-bottom: 1px dashed #000; text-align: left; font-size: 10px; text-transform: uppercase; }
    td { padding: 3px 0; text-align: left; vertical-align: top; }
    th.num, td.num { text-align: right; }
    .row { display: flex; justify-content: space-between; padding: 2px 0; font-size: 11px; }
    .row.bold { font-weight: bold; }
    .total-row { font-size: 14px; font-weight: 900; border-top: 1px dashed #000; border-bottom: 1px dashed #000; padding: 4px 0; margin: 4px 0; }
    .footer { margin-top: 10px; font-size: 9.5px; text-align: center; line-height: 1.3; }
    .barcode-box { margin-top: 8px; text-align: center; font-size: 10px; letter-spacing: 2px; }
  `;
}

/**
 * Universal print document runner using hidden iframe with instant automatic cleanup
 */
export function printDocument(title: string, htmlContent: string, profileOverride?: PrinterProfile) {
  if (typeof document === "undefined") return;

  const settings = getPrinterSettings();
  const profile = profileOverride || settings.defaultProfile || "thermal-80";
  const styles = getCssStyles(profile);

  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument;
  if (!doc) {
    iframe.remove();
    return;
  }

  doc.open();
  doc.write(`
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>${escapeHtml(title)}</title>
        <style>${styles}</style>
      </head>
      <body>
        ${htmlContent}
      </body>
    </html>
  `);
  doc.close();

  const executePrint = () => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch (e) {
      console.error("Print error:", e);
    } finally {
      setTimeout(() => iframe.remove(), 1200);
    }
  };

  if (doc.readyState === "complete") {
    setTimeout(executePrint, 60);
  } else {
    iframe.onload = executePrint;
  }
}

/**
 * Format and print a customer sales order receipt
 */
export function printOrderReceipt(
  order: Order | null,
  options?: {
    store?: import("./backend-data").StoreSettings;
    change?: number;
    cashier?: string;
    profile?: PrinterProfile;
    simplified?: boolean;
    discountRate?: number;
    pricing?: import("./tax-resolver").PricingContext;
  },
) {
  if (!order) return;
  const settings = getPrinterSettings();
  const profile = options?.profile || settings.defaultProfile;
  const cashier = options?.cashier || order.cashier || "Cashier";
  const { total, subtotal, gross, discountAmount, taxAmount } = calculateOrderTotals(
    order.lines ?? [],
    options?.discountRate ?? 0,
    options?.pricing,
  );
  const store = options?.store;
  const storeName = store?.name || "Velora POS";
  const storeTagline = store?.tagline || "";
  const storeAddress = store?.address || "";
  const storePhone = store?.phone || "";
  const storeFooter = store?.receiptFooter || "Thank you for your business! Please visit again.";

  const linesHtml = (order.lines || [])
    .map((l) => {
      const lineTotal = l.qty * l.unitPrice * (1 - (l.discount || 0) / 100);
      const discText = l.discount ? ` (-${l.discount}%)` : "";
      return `
        <tr>
          <td>
            <div class="bold">${escapeHtml(l.name)}</div>
            <div style="font-size: 9px; opacity: 0.8;">${l.qty} x ${formatRs(l.unitPrice)}${discText}</div>
          </td>
          <td class="num bold">${formatRs(lineTotal)}</td>
        </tr>
      `;
    })
    .join("");

  const paymentsHtml = (order.payments || [])
    .map(
      (p) => `
        <div class="row">
          <span>${escapeHtml(p.method)} Tender:</span>
          <span class="bold">${formatRs(p.amount)}</span>
        </div>
      `,
    )
    .join("");

  const bodyHtml = `
    <div class="center">
      <div class="title">${escapeHtml(storeName)}</div>
      <div class="subtitle">${escapeHtml(storeTagline)}</div>
      <div class="subtitle">${escapeHtml(storeAddress)} ${storePhone ? `· Tel: ${escapeHtml(storePhone)}` : ''}</div>
      <div class="divider"></div>
      <div class="bold" style="font-size: 12px;">SALES RECEIPT</div>
      <div class="subtitle">Receipt #${escapeHtml(order.receipt || `RCP/${order.number}`)} · Order #${escapeHtml(order.number)}</div>
      <div class="subtitle">${escapeHtml(order.date || new Date().toISOString().slice(0, 10))} ${escapeHtml(order.time || new Date().toLocaleTimeString())}</div>
      <div class="subtitle">Cashier: ${escapeHtml(cashier)}</div>
    </div>

    <div class="double-divider"></div>

    <table>
      <thead>
        <tr>
          <th>Item / Description</th>
          <th class="num">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${linesHtml}
      </tbody>
    </table>

    <div class="divider"></div>

    ${
      discountAmount > 0
        ? `
      <div class="row">
        <span>Gross Amount:</span>
        <span>${formatRs(gross)}</span>
      </div>
      <div class="row">
        <span>Discount:</span>
        <span>-${formatRs(discountAmount)}</span>
      </div>
    `
        : ""
    }

    <div class="row">
      <span>Subtotal:</span>
      <span>${formatRs(subtotal)}</span>
    </div>
    ${
      taxAmount > 0
        ? `
    <div class="row">
      <span>Tax:</span>
      <span>${formatRs(taxAmount)}</span>
    </div>
    `
        : ""
    }


    <div class="total-row row">
      <span>TOTAL PAYABLE:</span>
      <span>${formatRs(total)}</span>
    </div>

    <div style="margin-top: 4px;">
      ${paymentsHtml}
      ${
        options?.change && options.change > 0
          ? `
        <div class="row bold" style="margin-top: 2px;">
          <span>Change Due:</span>
          <span>${formatRs(options.change)}</span>
        </div>
      `
          : ""
      }
    </div>

    <div class="double-divider"></div>

    <div class="footer">
      <p class="bold">${escapeHtml(storeFooter)}</p>
      <div class="barcode-box">
        *${escapeHtml(order.number)}-VLR*
      </div>
      <p style="margin-top: 4px; font-size: 8px;">Software by Velora POS v5</p>
    </div>
  `;

  printDocument(`Receipt #${order.receipt || order.number}`, bodyHtml, profile);
}

/**
 * Format and print a return / exchange voucher
 */
export function printReturnReceipt(
  record: ReturnRecord,
  options?: {
    store?: import("./backend-data").StoreSettings;
    cashier?: string;
    profile?: PrinterProfile;
  },
) {
  const settings = getPrinterSettings();
  const profile = options?.profile || settings.defaultProfile;
  const cashier = options?.cashier || record.processedBy || "Cashier";
  const store = options?.store;
  const storeName = store?.name || "Velora POS";
  const storeAddress = store?.address || "";
  const storeFooter = store?.receiptFooter || "Thank you for your business! Please visit again.";

  const retLinesHtml = record.lines
    .map(
      (l) => `
      <tr>
        <td>
          <div class="bold">${escapeHtml(l.name)}</div>
          <div style="font-size: 9px; color: #b91c1c;">(Return: ${escapeHtml(l.reason)})</div>
        </td>
        <td class="num" style="color: #b91c1c;">-${l.qty} x ${formatRs(l.unitPrice)} = -${formatRs(l.qty * l.unitPrice)}</td>
      </tr>
    `,
    )
    .join("");

  const repLinesHtml = (record.replacements || [])
    .map(
      (r) => `
      <tr>
        <td>
          <div class="bold">${escapeHtml(r.name)}</div>
          <div style="font-size: 9px; color: #047857;">(Exchange Replacement)</div>
        </td>
        <td class="num" style="color: #047857;">+${r.qty} x ${formatRs(r.unitPrice)} = +${formatRs(r.qty * r.unitPrice)}</td>
      </tr>
    `,
    )
    .join("");

  const retCredit = record.lines.reduce((s, l) => s + l.qty * l.unitPrice, 0);
  const repTotal = (record.replacements || []).reduce((s, r) => s + r.qty * r.unitPrice, 0);

  const bodyHtml = `
    <div class="center">
      <div class="title">${escapeHtml(storeName)}</div>
      <div class="subtitle">${escapeHtml(storeAddress)}</div>
      <div class="divider"></div>
      <div class="bold" style="font-size: 13px;">${record.kind === "return" ? "RETURN / REFUND VOUCHER" : "EXCHANGE VOUCHER"}</div>
      <div class="subtitle">Voucher #${escapeHtml(record.number)} · Orig Order #${escapeHtml(record.originalNumber)}</div>
      <div class="subtitle">${escapeHtml(record.date)} ${escapeHtml(record.time)} · Cashier: ${escapeHtml(cashier)}</div>
    </div>

    <div class="double-divider"></div>

    <table>
      <thead>
        <tr>
          <th>Items Breakdown</th>
          <th class="num">Credit / Price</th>
        </tr>
      </thead>
      <tbody>
        ${retLinesHtml}
        ${repLinesHtml}
      </tbody>
    </table>

    <div class="divider"></div>

    <div class="row">
      <span>Returned Credit Value:</span>
      <span class="bold">-${formatRs(Math.abs(retCredit))}</span>
    </div>

    ${
      record.kind === "exchange"
        ? `
      <div class="row">
        <span>Replacement Items Total:</span>
        <span class="bold">+${formatRs(repTotal)}</span>
      </div>
      <div class="total-row row">
        <span>${record.difference >= 0 ? "AMOUNT COLLECTED:" : "REFUND PAID TO CUSTOMER:"}</span>
        <span>${formatRs(Math.abs(record.difference))}</span>
      </div>
    `
        : `
      <div class="total-row row">
        <span>REFUND PAID TO CUSTOMER:</span>
        <span>${formatRs(record.refundAmount)}</span>
      </div>
    `
    }

    <div class="row" style="margin-top: 4px;">
      <span>Settlement Method:</span>
      <span class="bold">${escapeHtml(record.method)}</span>
    </div>

    <div class="double-divider"></div>

    <div class="footer">
      <p class="bold">Goods returned in acceptable condition.</p>
      <p>${escapeHtml(storeFooter)}</p>
    </div>
  `;

  printDocument(`${record.kind === "return" ? "Return" : "Exchange"} #${record.number}`, bodyHtml, profile);
}

/**
 * Format and print shift Z-Report
 */
export function printZReportDocument(
  data: {
    openingCash: number;
    cashSales: number;
    cardSales: number;
    accountSales: number;
    totalSales: number;
    cashIn: number;
    cashOut: number;
    expectedCash: number;
    counted: number;
    difference: number;
    ordersCount: number;
    cashier?: string;
    note?: string;
  },
  store?: import("./backend-data").StoreSettings,
  profileOverride?: PrinterProfile,
) {
  const settings = getPrinterSettings();
  const profile = profileOverride || settings.defaultProfile;
  const storeName = store?.name || "Velora POS";
  const storeAddress = store?.address || "";

  const bodyHtml = `
    <div class="center">
      <div class="title">${escapeHtml(storeName)}</div>
      <div class="subtitle">${escapeHtml(storeAddress)}</div>
      <div class="divider"></div>
      <div class="bold" style="font-size: 13px;">OFFICIAL Z-REPORT</div>
      <div class="subtitle">End of Shift Reconciliation</div>
      <div class="subtitle">${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}</div>
      <div class="subtitle">Cashier: ${escapeHtml(data.cashier || "Cashier")}</div>
    </div>

    <div class="double-divider"></div>

    <div class="bold" style="margin-bottom: 2px;">REVENUE SUMMARY (${data.ordersCount} Orders)</div>
    <div class="row"><span>Cash Sales:</span><span>${formatRs(data.cashSales)}</span></div>
    <div class="row"><span>Card Sales:</span><span>${formatRs(data.cardSales)}</span></div>
    <div class="row"><span>Customer Account:</span><span>${formatRs(data.accountSales)}</span></div>
    <div class="total-row row">
      <span>GROSS REVENUE:</span>
      <span>${formatRs(data.totalSales)}</span>
    </div>

    <div class="divider"></div>

    <div class="bold" style="margin-bottom: 2px;">DRAWER RECONCILIATION</div>
    <div class="row"><span>Opening Float:</span><span>${formatRs(data.openingCash)}</span></div>
    <div class="row"><span>Cash Sales (+):</span><span>+${formatRs(data.cashSales)}</span></div>
    <div class="row"><span>Cash Inflows (+):</span><span>+${formatRs(data.cashIn)}</span></div>
    <div class="row"><span>Cash Outflows (-):</span><span>-${formatRs(data.cashOut)}</span></div>
    
    <div class="row bold" style="border-top: 1px dashed #000; padding-top: 3px; margin-top: 3px;">
      <span>EXPECTED DRAWER CASH:</span>
      <span>${formatRs(data.expectedCash)}</span>
    </div>
    <div class="row bold">
      <span>ACTUAL COUNTED CASH:</span>
      <span>${formatRs(data.counted)}</span>
    </div>
    <div class="total-row row">
      <span>VARIANCE / DISCREPANCY:</span>
      <span>${data.difference > 0 ? "+" : ""}${formatRs(data.difference)}</span>
    </div>

    ${data.note ? `<div style="font-size: 10px; margin-top: 4px;"><strong>Closing Note:</strong> ${escapeHtml(data.note)}</div>` : ""}

    <div class="double-divider"></div>

    <div class="footer">
      <p class="bold">Daily Shift Report Finalized</p>
      <p style="font-size: 8.5px;">Velora POS Reporting Service</p>
    </div>
  `;

  printDocument(`Z-Report - ${new Date().toISOString().slice(0, 10)}`, bodyHtml, profile);
}
