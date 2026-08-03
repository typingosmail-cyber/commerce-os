// Repayment posting & reconciliation ledger (frontend prototype, localStorage-backed).
//
// Every repayment — manual partial payment or successful gateway auto-debit —
// is *posted* as a balanced batch of double-entry ledger lines and allocated
// across installments using the standard waterfall (fee → interest → principal,
// earliest installment first). The resulting postings drive the BNPL
// outstanding balance and are reconciled against the gateway debit ledger.

import {
  addPartialRepayment,
  generateSchedule,
  getPartialRepayments,
  type CreditLine,
  type ScheduleInstallment,
} from "./bnpl";
import { listAttempts, type AutoDebitAttempt } from "./payment-gateway";

// ------------------------------------------------------------------
// Model
// ------------------------------------------------------------------

export type LedgerAccount =
  | "cash_clearing"        // money received from buyer (asset, debit on receipt)
  | "buyer_receivable"     // principal owed by buyer (asset, credit on repay)
  | "interest_income"      // interest earned (income, credit)
  | "fee_income"           // platform fee earned (income, credit)
  | "writeoff";            // rounding / adjustment

export type LedgerComponent = "principal" | "interest" | "fee" | "cash" | "adjustment";

export type PostingSource = "manual" | "autopay" | "adjustment" | "backfill";

export interface LedgerEntry {
  id: string;
  batchId: string;
  creditLineId: string;
  orderRef: string;
  installmentNo: number | null;
  postedAt: string;        // ISO
  valueDate: string;       // YYYY-MM-DD
  account: LedgerAccount;
  component: LedgerComponent;
  debit: number;
  credit: number;
  narration: string;
}

export interface Allocation {
  installmentNo: number;
  dueDate: string;
  fee: number;
  interest: number;
  principal: number;
  total: number;
  closesInstallment: boolean;
}

export interface PostingBatch {
  id: string;
  creditLineId: string;
  orderRef: string;
  supplierName: string;
  amount: number;
  postedAt: string;
  valueDate: string;
  source: PostingSource;
  reference: string;        // gateway ref / receipt no
  gatewayAttemptId?: string;
  allocations: Allocation[];
  totals: { principal: number; interest: number; fee: number };
  outstandingBefore: number;
  outstandingAfter: number;
  balanced: boolean;
  note?: string;
}

const STORE = {
  batches: "vyapar_repay_batches_v1",
  entries: "vyapar_repay_entries_v1",
};

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch { return fallback; }
}
function save<T>(key: string, val: T) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch { /* noop */ }
}
function uid(p: string) {
  return `${p}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}
const r0 = (n: number) => Math.round(n);

export const ACCOUNT_LABEL: Record<LedgerAccount, string> = {
  cash_clearing: "Cash / Clearing",
  buyer_receivable: "Buyer Receivable",
  interest_income: "Interest Income",
  fee_income: "Platform Fee Income",
  writeoff: "Rounding / Write-off",
};

export const SOURCE_LABEL: Record<PostingSource, string> = {
  manual: "Manual repayment",
  autopay: "Gateway auto-debit",
  adjustment: "Adjustment",
  backfill: "Reconciliation backfill",
};

// ------------------------------------------------------------------
// Storage accessors
// ------------------------------------------------------------------

export function listBatches(creditLineId?: string): PostingBatch[] {
  const all = load<PostingBatch[]>(STORE.batches, []);
  return creditLineId ? all.filter((b) => b.creditLineId === creditLineId) : all;
}

export function listEntries(filter?: { creditLineId?: string; batchId?: string }): LedgerEntry[] {
  const all = load<LedgerEntry[]>(STORE.entries, []);
  return all.filter((e) =>
    (!filter?.creditLineId || e.creditLineId === filter.creditLineId) &&
    (!filter?.batchId || e.batchId === filter.batchId));
}

export function clearLedger() {
  save(STORE.batches, []);
  save(STORE.entries, []);
}

// ------------------------------------------------------------------
// Allocation waterfall
// ------------------------------------------------------------------

/**
 * Allocate `amount` across the unpaid installments: earliest first, and within
 * each installment fee → interest → principal.
 */
export function allocatePayment(schedule: ScheduleInstallment[], amount: number): Allocation[] {
  let left = Math.max(0, r0(amount));
  const out: Allocation[] = [];

  for (const inst of schedule) {
    if (left <= 0) break;
    const owed = Math.max(0, inst.remainingAmount);
    if (owed <= 0) continue;

    // How much of each component is still outstanding on this installment:
    // paidAmount was itself applied fee → interest → principal.
    let alreadyPaid = inst.paidAmount;
    const takePaid = (bucket: number) => {
      const used = Math.min(alreadyPaid, bucket);
      alreadyPaid -= used;
      return bucket - used;
    };
    const feeDue = takePaid(inst.fee);
    const interestDue = takePaid(inst.interest);
    const principalDue = takePaid(inst.principal);

    const fee = Math.min(left, feeDue); left -= fee;
    const interest = Math.min(left, interestDue); left -= interest;
    const principal = Math.min(left, principalDue); left -= principal;

    const total = fee + interest + principal;
    if (total <= 0) continue;

    out.push({
      installmentNo: inst.installmentNo,
      dueDate: inst.dueDate,
      fee,
      interest,
      principal,
      total,
      closesInstallment: total >= owed - 1,
    });
  }

  return out;
}

// ------------------------------------------------------------------
// Posting
// ------------------------------------------------------------------

function buildEntries(batch: PostingBatch): LedgerEntry[] {
  const entries: LedgerEntry[] = [];
  const push = (
    account: LedgerAccount, component: LedgerComponent,
    debit: number, credit: number, installmentNo: number | null, narration: string,
  ) => {
    if (debit === 0 && credit === 0) return;
    entries.push({
      id: uid("le"),
      batchId: batch.id,
      creditLineId: batch.creditLineId,
      orderRef: batch.orderRef,
      installmentNo,
      postedAt: batch.postedAt,
      valueDate: batch.valueDate,
      account, component, debit, credit, narration,
    });
  };

  // Debit cash for the full receipt.
  push("cash_clearing", "cash", batch.amount, 0, null,
    `${SOURCE_LABEL[batch.source]} received · ${batch.reference}`);

  // Credit each component per installment.
  for (const a of batch.allocations) {
    push("fee_income", "fee", 0, a.fee, a.installmentNo, `Platform fee · EMI ${a.installmentNo}`);
    push("interest_income", "interest", 0, a.interest, a.installmentNo, `Interest · EMI ${a.installmentNo}`);
    push("buyer_receivable", "principal", 0, a.principal, a.installmentNo, `Principal recovery · EMI ${a.installmentNo}`);
  }

  // Any unallocated residue (over-payment beyond schedule) → write-off bucket.
  const allocated = batch.allocations.reduce((s, a) => s + a.total, 0);
  const residue = batch.amount - allocated;
  if (residue !== 0) {
    push("writeoff", "adjustment", residue < 0 ? -residue : 0, residue > 0 ? residue : 0, null,
      residue > 0 ? "Unallocated over-payment held in suspense" : "Rounding adjustment");
  }

  return entries;
}

export interface PostRepaymentInput {
  line: CreditLine;
  amount: number;
  source: PostingSource;
  reference?: string;
  gatewayAttemptId?: string;
  note?: string;
  valueDate?: string;
  /** When false, the schedule-side partial repayment is assumed to already exist. */
  recordPartial?: boolean;
}

/**
 * Post a repayment: allocate it, record it against the schedule, write balanced
 * ledger entries, and return the batch with the outstanding movement.
 */
export function postRepayment(input: PostRepaymentInput): PostingBatch {
  const { line, source } = input;
  const amount = Math.max(0, r0(input.amount));
  const scheduleBefore = generateSchedule(line);
  const outstandingBefore = scheduleBefore.reduce((s, i) => s + i.remainingAmount, 0);
  const allocations = allocatePayment(scheduleBefore, amount);

  if (input.recordPartial !== false) {
    addPartialRepayment(line.id, amount, input.note ?? `${SOURCE_LABEL[source]} · ${line.orderRef}`);
  }

  const totals = allocations.reduce(
    (acc, a) => ({
      principal: acc.principal + a.principal,
      interest: acc.interest + a.interest,
      fee: acc.fee + a.fee,
    }),
    { principal: 0, interest: 0, fee: 0 },
  );

  const now = new Date();
  const batch: PostingBatch = {
    id: uid("bat"),
    creditLineId: line.id,
    orderRef: line.orderRef,
    supplierName: line.supplierName,
    amount,
    postedAt: now.toISOString(),
    valueDate: input.valueDate ?? now.toISOString().slice(0, 10),
    source,
    reference: input.reference ?? `RCPT-${now.getTime().toString().slice(-8)}`,
    gatewayAttemptId: input.gatewayAttemptId,
    allocations,
    totals,
    outstandingBefore: r0(outstandingBefore),
    outstandingAfter: Math.max(0, r0(outstandingBefore - amount)),
    balanced: true,
    note: input.note,
  };

  const entries = buildEntries(batch);
  const debits = entries.reduce((s, e) => s + e.debit, 0);
  const credits = entries.reduce((s, e) => s + e.credit, 0);
  batch.balanced = Math.abs(debits - credits) < 1;

  const batches = load<PostingBatch[]>(STORE.batches, []);
  batches.unshift(batch);
  save(STORE.batches, batches.slice(0, 500));

  const all = load<LedgerEntry[]>(STORE.entries, []);
  save(STORE.entries, [...entries, ...all].slice(0, 5000));

  return batch;
}

// ------------------------------------------------------------------
// Balances
// ------------------------------------------------------------------

export interface LineBalance {
  creditLineId: string;
  orderRef: string;
  supplierName: string;
  billed: number;              // total scheduled (principal + interest + fee)
  postedTotal: number;         // total cash posted
  principalRecovered: number;
  interestRecovered: number;
  feeRecovered: number;
  scheduleOutstanding: number; // from the live schedule
  ledgerOutstanding: number;   // billed - postedTotal
  variance: number;            // ledger vs schedule
}

export function lineBalance(line: CreditLine): LineBalance {
  const schedule = generateSchedule(line);
  const billed = schedule.reduce((s, i) => s + i.total, 0);
  const scheduleOutstanding = schedule.reduce((s, i) => s + i.remainingAmount, 0);
  const batches = listBatches(line.id);
  const postedTotal = batches.reduce((s, b) => s + b.amount, 0);
  const principalRecovered = batches.reduce((s, b) => s + b.totals.principal, 0);
  const interestRecovered = batches.reduce((s, b) => s + b.totals.interest, 0);
  const feeRecovered = batches.reduce((s, b) => s + b.totals.fee, 0);
  const ledgerOutstanding = Math.max(0, r0(billed - postedTotal));
  return {
    creditLineId: line.id,
    orderRef: line.orderRef,
    supplierName: line.supplierName,
    billed: r0(billed),
    postedTotal: r0(postedTotal),
    principalRecovered: r0(principalRecovered),
    interestRecovered: r0(interestRecovered),
    feeRecovered: r0(feeRecovered),
    scheduleOutstanding: r0(scheduleOutstanding),
    ledgerOutstanding,
    variance: r0(ledgerOutstanding - scheduleOutstanding),
  };
}

export function portfolioBalances(lines: CreditLine[]): LineBalance[] {
  return lines.map(lineBalance);
}

export function accountTotals(): Array<{ account: LedgerAccount; debit: number; credit: number; net: number }> {
  const entries = listEntries();
  const map = new Map<LedgerAccount, { debit: number; credit: number }>();
  for (const e of entries) {
    const cur = map.get(e.account) ?? { debit: 0, credit: 0 };
    cur.debit += e.debit;
    cur.credit += e.credit;
    map.set(e.account, cur);
  }
  return [...map.entries()].map(([account, v]) => ({
    account, debit: r0(v.debit), credit: r0(v.credit), net: r0(v.debit - v.credit),
  }));
}

// ------------------------------------------------------------------
// Reconciliation
// ------------------------------------------------------------------

export type ExceptionKind =
  | "unposted_debit"      // gateway success with no ledger batch
  | "orphan_posting"      // batch references a gateway attempt that doesn't exist
  | "amount_mismatch"     // batch amount ≠ gateway attempt amount
  | "unbalanced_batch"    // debits ≠ credits
  | "balance_variance";   // ledger outstanding ≠ schedule outstanding

export interface ReconException {
  id: string;
  kind: ExceptionKind;
  severity: "high" | "medium" | "low";
  creditLineId: string;
  orderRef: string;
  installmentNo?: number;
  amount: number;
  detail: string;
  attemptId?: string;
  batchId?: string;
}

export interface ReconResult {
  runAt: string;
  gatewayCollected: number;
  ledgerPosted: number;
  manualPosted: number;
  unpostedAmount: number;
  matchedCount: number;
  exceptions: ReconException[];
  totalDebits: number;
  totalCredits: number;
  balanced: boolean;
}

export const EXCEPTION_LABEL: Record<ExceptionKind, string> = {
  unposted_debit: "Collected but not posted",
  orphan_posting: "Orphan posting",
  amount_mismatch: "Amount mismatch",
  unbalanced_batch: "Unbalanced batch",
  balance_variance: "Balance variance",
};

function successfulAttempts(lines: CreditLine[]): AutoDebitAttempt[] {
  const ids = new Set(lines.map((l) => l.id));
  return listAttempts().filter((a) => a.status === "success" && ids.has(a.creditLineId));
}

export function reconcile(lines: CreditLine[]): ReconResult {
  const batches = listBatches();
  const lineById = new Map(lines.map((l) => [l.id, l]));
  const attempts = successfulAttempts(lines);
  const postedAttemptIds = new Set(batches.map((b) => b.gatewayAttemptId).filter(Boolean) as string[]);
  const exceptions: ReconException[] = [];
  let matched = 0;
  let unpostedAmount = 0;

  // 1) Gateway successes with no matching posting.
  for (const a of attempts) {
    if (postedAttemptIds.has(a.id)) { matched++; continue; }
    unpostedAmount += a.amount;
    const line = lineById.get(a.creditLineId);
    exceptions.push({
      id: `ex_unposted_${a.id}`,
      kind: "unposted_debit",
      severity: "high",
      creditLineId: a.creditLineId,
      orderRef: line?.orderRef ?? a.creditLineId,
      installmentNo: a.installmentNo,
      amount: a.amount,
      detail: `₹${a.amount.toLocaleString("en-IN")} collected via ${a.provider} (${a.gatewayRef}) has no ledger posting.`,
      attemptId: a.id,
    });
  }

  // 2) Batch-level checks.
  const attemptById = new Map(listAttempts().map((a) => [a.id, a]));
  for (const b of batches) {
    if (!b.balanced) {
      exceptions.push({
        id: `ex_unbal_${b.id}`, kind: "unbalanced_batch", severity: "high",
        creditLineId: b.creditLineId, orderRef: b.orderRef, amount: b.amount,
        detail: "Debits and credits do not net to zero for this batch.", batchId: b.id,
      });
    }
    if (b.gatewayAttemptId) {
      const a = attemptById.get(b.gatewayAttemptId);
      if (!a) {
        exceptions.push({
          id: `ex_orphan_${b.id}`, kind: "orphan_posting", severity: "medium",
          creditLineId: b.creditLineId, orderRef: b.orderRef, amount: b.amount,
          detail: "Posting references a gateway attempt that no longer exists.", batchId: b.id,
        });
      } else if (Math.abs(a.amount - b.amount) > 1) {
        exceptions.push({
          id: `ex_mismatch_${b.id}`, kind: "amount_mismatch", severity: "high",
          creditLineId: b.creditLineId, orderRef: b.orderRef, amount: Math.abs(a.amount - b.amount),
          detail: `Gateway collected ₹${a.amount.toLocaleString("en-IN")} but ₹${b.amount.toLocaleString("en-IN")} was posted.`,
          batchId: b.id, attemptId: a.id,
        });
      }
    }
  }

  // 3) Per-line balance variance.
  for (const line of lines) {
    const bal = lineBalance(line);
    if (Math.abs(bal.variance) > 2) {
      exceptions.push({
        id: `ex_var_${line.id}`, kind: "balance_variance",
        severity: Math.abs(bal.variance) > 1000 ? "high" : "low",
        creditLineId: line.id, orderRef: line.orderRef, amount: Math.abs(bal.variance),
        detail: `Ledger outstanding ₹${bal.ledgerOutstanding.toLocaleString("en-IN")} vs schedule ₹${bal.scheduleOutstanding.toLocaleString("en-IN")}.`,
      });
    }
  }

  const entries = listEntries();
  const totalDebits = r0(entries.reduce((s, e) => s + e.debit, 0));
  const totalCredits = r0(entries.reduce((s, e) => s + e.credit, 0));
  const manualPosted = r0(batches.filter((b) => b.source !== "autopay").reduce((s, b) => s + b.amount, 0));

  return {
    runAt: new Date().toISOString(),
    gatewayCollected: r0(attempts.reduce((s, a) => s + a.amount, 0)),
    ledgerPosted: r0(batches.reduce((s, b) => s + b.amount, 0)),
    manualPosted,
    unpostedAmount: r0(unpostedAmount),
    matchedCount: matched,
    exceptions,
    totalDebits,
    totalCredits,
    balanced: Math.abs(totalDebits - totalCredits) < 1,
  };
}

/**
 * Post every successful gateway debit that has not been posted yet.
 * Used by the "Auto-post collected debits" reconciliation action.
 */
export function postUnpostedDebits(lines: CreditLine[]): PostingBatch[] {
  const batches = listBatches();
  const posted = new Set(batches.map((b) => b.gatewayAttemptId).filter(Boolean) as string[]);
  const out: PostingBatch[] = [];
  for (const a of successfulAttempts(lines)) {
    if (posted.has(a.id)) continue;
    const line = lines.find((l) => l.id === a.creditLineId);
    if (!line) continue;
    // Only record a schedule-side partial when the gateway debit isn't already
    // reflected there (autopay does not write partial repayments itself).
    const alreadyOnSchedule = getPartialRepayments(line.id)
      .some((p) => p.note?.includes(a.gatewayRef));
    out.push(postRepayment({
      line,
      amount: a.amount,
      source: "autopay",
      reference: a.gatewayRef,
      gatewayAttemptId: a.id,
      valueDate: a.scheduledFor,
      note: `Auto-debit ${a.gatewayRef} · EMI ${a.installmentNo}`,
      recordPartial: !alreadyOnSchedule,
    }));
    posted.add(a.id);
  }
  return out;
}
