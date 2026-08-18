/**
 * Renders a report into a hidden iframe and opens the browser print dialog,
 * which is also how the user saves it as a PDF. An iframe is used instead of a
 * popup window so pop-up blockers never swallow the report.
 */
const printStyles = `
  * { box-sizing: border-box; }
  body {
    margin: 0;
    padding: 24px;
    font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
    color: #111827;
    font-size: 12px;
  }
  h1 { font-size: 18px; margin: 0 0 2px; }
  h2 { font-size: 13px; margin: 18px 0 6px; text-transform: uppercase; letter-spacing: 0.06em; }
  .meta { color: #6b7280; font-size: 11px; margin-bottom: 4px; }
  .head { text-align: center; border-bottom: 2px solid #111827; padding-bottom: 10px; margin-bottom: 12px; }
  table { width: 100%; border-collapse: collapse; margin-top: 4px; }
  th, td { padding: 5px 6px; text-align: left; border-bottom: 1px solid #e5e7eb; }
  th { font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; color: #6b7280; }
  td.num, th.num { text-align: right; font-variant-numeric: tabular-nums; }
  tr.total td { font-weight: 700; border-top: 2px solid #111827; border-bottom: none; }
  .row { display: flex; justify-content: space-between; padding: 3px 0; }
  .row.strong { font-weight: 700; border-top: 1px solid #111827; margin-top: 4px; padding-top: 6px; }
  .foot { margin-top: 24px; border-top: 1px solid #e5e7eb; padding-top: 8px; color: #6b7280; font-size: 10px; text-align: center; }
  @page { margin: 14mm; }
`;

export function printReport(title: string, bodyHtml: string) {
  if (typeof document === "undefined") return;

  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  frame.style.position = "fixed";
  frame.style.right = "0";
  frame.style.bottom = "0";
  frame.style.width = "0";
  frame.style.height = "0";
  frame.style.border = "0";
  document.body.appendChild(frame);

  const doc = frame.contentDocument;
  if (!doc) {
    frame.remove();
    return;
  }

  doc.open();
  doc.write(
    `<!doctype html><html><head><meta charset="utf-8" /><title>${escapeHtml(title)}</title><style>${printStyles}</style></head><body>${bodyHtml}</body></html>`,
  );
  doc.close();

  const run = () => {
    frame.contentWindow?.focus();
    frame.contentWindow?.print();
    window.setTimeout(() => frame.remove(), 1000);
  };

  if (doc.readyState === "complete") window.setTimeout(run, 50);
  else frame.onload = run;
}

export function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** DD/MM/YYYY, the Pakistan standard used across the app. */
export function formatDmy(input: string | Date) {
  const date = typeof input === "string" ? new Date(`${input}T00:00:00`) : input;
  if (Number.isNaN(date.getTime())) return String(input);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${day}/${month}/${date.getFullYear()}`;
}

export function summaryRow(label: string, value: string, strong = false) {
  return `<div class="row${strong ? " strong" : ""}"><span>${escapeHtml(label)}</span><span>${escapeHtml(value)}</span></div>`;
}
