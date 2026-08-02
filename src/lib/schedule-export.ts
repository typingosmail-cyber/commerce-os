// Export a BNPL repayment schedule as CSV or a print-ready PDF (browser print dialog).
// Frontend-only: no server round-trip, no extra dependencies.

import type { CreditLine, ScheduleInstallment } from "./bnpl";

const fmtInr = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;

const STATUS_LABEL: Record<ScheduleInstallment["status"], string> = {
  paid: "Paid",
  partial: "Partially paid",
  due: "Due",
  upcoming: "Upcoming",
  overdue: "Overdue",
};

export function scheduleFileName(line: CreditLine, ext: "csv" | "pdf") {
  const safe = line.orderRef.replace(/[^a-z0-9]+/gi, "-");
  return `repayment-schedule-${safe}-${new Date().toISOString().slice(0, 10)}.${ext}`;
}

function totals(schedule: ScheduleInstallment[]) {
  const sum = (k: keyof ScheduleInstallment) =>
    schedule.reduce((a, i) => a + (Number(i[k]) || 0), 0);
  return {
    principal: sum("principal"),
    interest: sum("interest"),
    fee: sum("fee"),
    total: sum("total"),
    paid: sum("paidAmount"),
    remaining: sum("remainingAmount"),
  };
}

const csvCell = (v: string | number) => {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** Build the CSV text for a credit line's schedule, including a header block and totals row. */
export function buildScheduleCsv(line: CreditLine, schedule: ScheduleInstallment[]): string {
  const t = totals(schedule);
  const meta: string[][] = [
    ["Repayment Schedule"],
    ["Order reference", line.orderRef],
    ["Supplier", line.supplierName],
    ["Principal", String(Math.round(line.principal))],
    ["Outstanding", String(Math.round(line.outstanding))],
    ["Tenure (days)", String(line.tenureDays)],
    ["APR (%)", String(line.apr)],
    ["Disbursed on", line.disbursedAt],
    ["Final due date", line.dueDate],
    ["Line status", line.status],
    ["Exported at", new Date().toISOString()],
    [],
  ];
  const header = ["Installment", "Due date", "Principal", "Interest", "Fee", "Total EMI", "Paid", "Remaining", "Days until due", "Status"];
  const rows = schedule.map((i) => [
    i.installmentNo,
    i.dueDate,
    Math.round(i.principal),
    Math.round(i.interest),
    Math.round(i.fee),
    Math.round(i.total),
    Math.round(i.paidAmount),
    Math.round(i.remainingAmount),
    i.daysUntilDue,
    STATUS_LABEL[i.status],
  ]);
  const totalRow = ["Total", "", Math.round(t.principal), Math.round(t.interest), Math.round(t.fee), Math.round(t.total), Math.round(t.paid), Math.round(t.remaining), "", ""];

  return [...meta, header, ...rows, totalRow]
    .map((r) => r.map(csvCell).join(","))
    .join("\n");
}

export function downloadScheduleCsv(line: CreditLine, schedule: ScheduleInstallment[]) {
  const blob = new Blob(["\uFEFF" + buildScheduleCsv(line, schedule)], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = scheduleFileName(line, "csv");
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const esc = (s: string) => s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c] as string));

/** Print-ready HTML statement — the browser print dialog saves it as PDF. */
export function buildSchedulePrintHtml(line: CreditLine, schedule: ScheduleInstallment[]): string {
  const t = totals(schedule);
  const rows = schedule.map((i) => `
    <tr class="${i.status}">
      <td>${i.installmentNo}</td>
      <td>${esc(i.dueDate)}</td>
      <td class="n">${fmtInr(i.principal)}</td>
      <td class="n">${fmtInr(i.interest)}</td>
      <td class="n">${fmtInr(i.fee)}</td>
      <td class="n b">${fmtInr(i.total)}</td>
      <td class="n">${i.paidAmount > 0 ? fmtInr(i.paidAmount) : "—"}</td>
      <td class="n">${fmtInr(i.remainingAmount)}</td>
      <td>${STATUS_LABEL[i.status]}</td>
    </tr>`).join("");

  return `<!doctype html><html><head><meta charset="utf-8" />
<title>${esc(scheduleFileName(line, "pdf"))}</title>
<style>
  @page { size: A4 landscape; margin: 14mm; }
  body { font-family: -apple-system, "Segoe UI", Arial, sans-serif; color: #10203a; font-size: 12px; }
  h1 { font-size: 18px; margin: 0 0 2px; letter-spacing: -0.2px; }
  .sub { color: #6b7a90; font-size: 11px; margin-bottom: 14px; }
  .meta { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px 16px; margin-bottom: 16px; }
  .meta div span { display: block; color: #6b7a90; font-size: 10px; text-transform: uppercase; letter-spacing: .4px; }
  .meta div strong { font-size: 13px; }
  table { width: 100%; border-collapse: collapse; }
  th, td { border-bottom: 1px solid #e3e8ef; padding: 6px 8px; text-align: left; }
  th { background: #10203a; color: #fff; font-size: 10px; text-transform: uppercase; letter-spacing: .5px; }
  td.n { text-align: right; font-variant-numeric: tabular-nums; }
  td.b { font-weight: 600; }
  tr.overdue td { background: #fdecec; }
  tr.paid td { color: #52627a; }
  tfoot td { font-weight: 700; border-top: 2px solid #10203a; background: #f6f8fb; }
  footer { margin-top: 16px; color: #8b97a8; font-size: 10px; }
</style></head><body>
<h1>Repayment Schedule — ${esc(line.orderRef)}</h1>
<div class="sub">${esc(line.supplierName)} · generated ${new Date().toLocaleString("en-IN")}</div>
<div class="meta">
  <div><span>Principal</span><strong>${fmtInr(line.principal)}</strong></div>
  <div><span>Outstanding</span><strong>${fmtInr(line.outstanding)}</strong></div>
  <div><span>Tenure</span><strong>${line.tenureDays} days</strong></div>
  <div><span>APR</span><strong>${line.apr}%</strong></div>
  <div><span>Disbursed</span><strong>${esc(line.disbursedAt)}</strong></div>
  <div><span>Final due</span><strong>${esc(line.dueDate)}</strong></div>
  <div><span>Status</span><strong style="text-transform:capitalize">${esc(line.status)}</strong></div>
  <div><span>Installments</span><strong>${schedule.length}</strong></div>
</div>
<table>
  <thead><tr>
    <th>#</th><th>Due date</th><th>Principal</th><th>Interest</th><th>Fee</th><th>Total EMI</th><th>Paid</th><th>Remaining</th><th>Status</th>
  </tr></thead>
  <tbody>${rows}</tbody>
  <tfoot><tr>
    <td colspan="2">Total</td>
    <td class="n">${fmtInr(t.principal)}</td>
    <td class="n">${fmtInr(t.interest)}</td>
    <td class="n">${fmtInr(t.fee)}</td>
    <td class="n">${fmtInr(t.total)}</td>
    <td class="n">${fmtInr(t.paid)}</td>
    <td class="n">${fmtInr(t.remaining)}</td>
    <td></td>
  </tr></tfoot>
</table>
<footer>This statement is generated from your Vyapar credit line records. Amounts are rounded to the nearest rupee.</footer>
</body></html>`;
}

/** Opens a print window with the statement; the user saves it as PDF. Returns false if blocked. */
export function downloadSchedulePdf(line: CreditLine, schedule: ScheduleInstallment[]): boolean {
  const w = window.open("", "_blank", "width=1100,height=800");
  if (!w) return false;
  w.document.write(buildSchedulePrintHtml(line, schedule));
  w.document.close();
  w.focus();
  setTimeout(() => { try { w.print(); } catch { /* noop */ } }, 350);
  return true;
}
