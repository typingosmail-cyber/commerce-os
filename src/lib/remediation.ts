import type { BuyerRiskAssessment, BuyerRiskSignal } from "./bnpl";

export type RemediationKind = "document" | "dispute" | "settlement" | "reverification";

export type RemediationStatus = "open" | "in_review" | "approved" | "rejected";

export interface RemediationEvidence {
  name: string;
  kind: "file" | "reference" | "note";
  detail?: string;
}

export interface RemediationTask {
  id: string;
  /** Risk signal this task clears, e.g. "DPD-7". */
  signalId: string;
  ruleId: string;
  kind: RemediationKind;
  title: string;
  /** What the buyer must provide. */
  requirement: string;
  /** Typical desk turnaround, in hours. */
  slaHours: number;
  status: RemediationStatus;
  evidence: RemediationEvidence[];
  buyerNote?: string;
  deskNote?: string;
  createdAt: string;
  submittedAt?: string;
  decidedAt?: string;
}

export interface DrawdownAttempt {
  id: string;
  amount: number;
  tenureDays: 30 | 60 | 90;
  supplierName: string;
  orderRef: string;
  requestedAt: string;
  status: "blocked" | "awaiting_remediation" | "approved" | "declined";
  reason: string;
  blockingSignalIds: string[];
  retriedAt?: string;
  decisionNote?: string;
}

export const KIND_META: Record<RemediationKind, { label: string; hint: string }> = {
  document: { label: "Document upload", hint: "Upload the proof the risk desk asked for." },
  dispute: { label: "Dispute a charge", hint: "Contest an incorrect charge, penalty or default record." },
  settlement: { label: "Settle dues", hint: "Clear the overdue amount to release the hold." },
  reverification: { label: "Re-verification", hint: "Re-run an identity, GST or bank check." },
};

export const STATUS_META: Record<RemediationStatus, { label: string; tone: string }> = {
  open: { label: "Action needed", tone: "bg-yellow-500/15 text-yellow-700 border-yellow-500/30" },
  in_review: { label: "With risk desk", tone: "bg-primary/10 text-primary border-primary/30" },
  approved: { label: "Accepted — signal cleared", tone: "bg-success/10 text-success border-success/30" },
  rejected: { label: "Not accepted", tone: "bg-destructive/15 text-destructive border-destructive/30" },
};

/** What a buyer can do about each risk signal. */
const PLAYBOOK: Record<string, { kind: RemediationKind; title: string; requirement: string; slaHours: number }> = {
  "DPD-30": { kind: "settlement", title: "Clear the 30+ day overdue installment", requirement: "Pay the overdue installment in full, or upload the bank advice if you already paid.", slaHours: 4 },
  "DPD-7": { kind: "settlement", title: "Clear the overdue installment", requirement: "Pay the late installment, or upload the UTR / payment advice for a payment already made.", slaHours: 4 },
  "LATE-3x90": { kind: "dispute", title: "Dispute the late-payment records", requirement: "Give the installment references you believe were paid on time, with bank statement pages.", slaHours: 24 },
  "LATE-2x90": { kind: "dispute", title: "Dispute the late-payment records", requirement: "Give the installment references you believe were paid on time, with bank statement pages.", slaHours: 24 },
  "DEFAULT-30D": { kind: "settlement", title: "Regularise the written-off amount", requirement: "Settle the defaulted amount or upload the settlement letter.", slaHours: 8 },
  "VEL-24H": { kind: "document", title: "Explain the drawdown burst", requirement: "Upload the purchase orders behind the recent drawdowns.", slaHours: 12 },
  "VEL-7D": { kind: "document", title: "Explain the weekly drawdown volume", requirement: "Upload the purchase orders or a short note on the demand spike.", slaHours: 12 },
  "VEL-NEW-SUPP": { kind: "document", title: "Confirm the new supplier relationships", requirement: "Upload invoices or supply agreements for the new suppliers.", slaHours: 12 },
  "ID-GST-FAIL": { kind: "reverification", title: "Re-verify your GSTIN", requirement: "Upload the current GST registration certificate; we re-run the government check.", slaHours: 6 },
  "DEV-CHURN": { kind: "reverification", title: "Confirm your devices", requirement: "Confirm the recent logins were yours and re-verify the registered mobile number.", slaHours: 6 },
  "IP-GEO": { kind: "reverification", title: "Confirm foreign-IP logins", requirement: "Confirm travel or VPN use, with supporting proof if available.", slaHours: 6 },
  "CB-180D": { kind: "dispute", title: "Dispute the chargebacks", requirement: "Upload delivery proof or supplier correspondence for the disputed chargebacks.", slaHours: 48 },
  "DSP-OPEN": { kind: "dispute", title: "Close out open disputes", requirement: "Upload resolution notes or acceptance confirmations for the open disputes.", slaHours: 48 },
  "BHV-REFUND-LOOP": { kind: "document", title: "Explain refund-then-redraw activity", requirement: "Upload the credit notes and the replacement orders.", slaHours: 24 },
  "EXP-HIGHRISK": { kind: "document", title: "Reduce or justify flagged-supplier exposure", requirement: "Upload escrow or insurance cover for the flagged supplier orders.", slaHours: 24 },
  // External bureau / fraud signals
  "BUR-SUIT": { kind: "dispute", title: "Dispute the suit-filed / watchlist record", requirement: "Upload the bureau dispute reference or court clearance order.", slaHours: 72 },
  "BUR-SCORE-LOW": { kind: "document", title: "Strengthen the bureau file", requirement: "Upload audited financials and latest bank statements for a manual override review.", slaHours: 72 },
  "BUR-SCORE-MID": { kind: "document", title: "Support the bureau score", requirement: "Upload audited financials or GST turnover statements.", slaHours: 48 },
  "BUR-WRITEOFF": { kind: "dispute", title: "Dispute the reported write-off", requirement: "Upload the lender's no-dues / settlement certificate.", slaHours: 72 },
  "BUR-DPD": { kind: "dispute", title: "Dispute the bureau DPD entry", requirement: "Upload the lender statement showing on-time payment.", slaHours: 72 },
  "BUR-STACKING": { kind: "document", title: "Explain multi-lender enquiries", requirement: "Declare which facilities were actually sanctioned, with sanction letters.", slaHours: 24 },
  "BUR-BOUNCE": { kind: "dispute", title: "Dispute the bounce records", requirement: "Upload bank confirmation that the mandates were honoured.", slaHours: 48 },
  "BUR-GST-INACTIVE": { kind: "reverification", title: "Restore your GST registration", requirement: "Upload the revocation order or the active registration certificate.", slaHours: 24 },
  "BUR-GST-DEFAULTS": { kind: "document", title: "File the missing GST returns", requirement: "Upload the filed return acknowledgements (ARN).", slaHours: 24 },
  "BUR-CONSORTIUM": { kind: "dispute", title: "Contest the fraud consortium hit", requirement: "Upload identity proof and a written statement; goes to fraud investigations.", slaHours: 96 },
  "BUR-SYNTH-ID": { kind: "reverification", title: "Complete enhanced identity check", requirement: "Complete video KYC and upload director PAN / Aadhaar proof.", slaHours: 24 },
  "BUR-LINKED": { kind: "dispute", title: "Dispute the linked-entity finding", requirement: "Upload director disclosures showing you are not associated with the defaulting entity.", slaHours: 72 },
  "BUR-UTIL": { kind: "document", title: "Reduce or justify lender utilisation", requirement: "Upload repayment proof or a cash-flow projection.", slaHours: 24 },
};

const TASKS_KEY = "vyapar_remediation_tasks_v1";
const DRAWDOWN_KEY = "vyapar_remediation_drawdowns_v1";

function uid(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw) as T;
  } catch { /* ignore */ }
  return fallback;
}

export function loadTasks(buyerId: string): RemediationTask[] {
  return read<Record<string, RemediationTask[]>>(TASKS_KEY, {})[buyerId] ?? [];
}

function writeTasks(buyerId: string, tasks: RemediationTask[]) {
  const all = read<Record<string, RemediationTask[]>>(TASKS_KEY, {});
  all[buyerId] = tasks;
  localStorage.setItem(TASKS_KEY, JSON.stringify(all));
}

/** Create (or reuse) a remediation task for every actionable signal in the assessment. */
export function syncTasks(buyerId: string, signals: BuyerRiskSignal[]): RemediationTask[] {
  const existing = loadTasks(buyerId);
  const now = new Date().toISOString();
  const next = [...existing];

  for (const s of signals) {
    const play = PLAYBOOK[s.id];
    if (!play) continue;
    if (next.some((t) => t.signalId === s.id)) continue;
    next.push({
      id: uid("rem"),
      signalId: s.id,
      ruleId: s.ruleId,
      kind: play.kind,
      title: play.title,
      requirement: play.requirement,
      slaHours: play.slaHours,
      status: "open",
      evidence: [],
      createdAt: now,
    });
  }

  writeTasks(buyerId, next);
  return next;
}

export function submitTask(
  buyerId: string,
  taskId: string,
  evidence: RemediationEvidence[],
  buyerNote?: string,
): RemediationTask[] {
  const tasks = loadTasks(buyerId).map((t) =>
    t.id === taskId
      ? { ...t, status: "in_review" as RemediationStatus, evidence, buyerNote, submittedAt: new Date().toISOString(), deskNote: undefined, decidedAt: undefined }
      : t,
  );
  writeTasks(buyerId, tasks);
  return tasks;
}

/**
 * Risk-desk decision. Demo logic: a submission with at least one piece of
 * evidence is accepted; settlement and re-verification tasks need proof of the
 * payment or the certificate, so a bare note is sent back.
 */
export function reviewTask(buyerId: string, taskId: string): RemediationTask[] {
  const tasks = loadTasks(buyerId).map((t) => {
    if (t.id !== taskId || t.status !== "in_review") return t;
    const hasFile = t.evidence.some((e) => e.kind === "file" || e.kind === "reference");
    const needsProof = t.kind === "settlement" || t.kind === "reverification";
    const accepted = t.evidence.length > 0 && (!needsProof || hasFile);
    return {
      ...t,
      status: (accepted ? "approved" : "rejected") as RemediationStatus,
      decidedAt: new Date().toISOString(),
      deskNote: accepted
        ? "Evidence verified. Signal cleared and your limit has been re-evaluated."
        : "We need a document or payment reference, not just a note. Please resubmit with proof attached.",
    };
  });
  writeTasks(buyerId, tasks);
  return tasks;
}

export function reopenTask(buyerId: string, taskId: string): RemediationTask[] {
  const tasks = loadTasks(buyerId).map((t) =>
    t.id === taskId ? { ...t, status: "open" as RemediationStatus, deskNote: undefined, decidedAt: undefined } : t,
  );
  writeTasks(buyerId, tasks);
  return tasks;
}

export function clearedSignalIds(tasks: RemediationTask[]): string[] {
  return tasks.filter((t) => t.status === "approved").map((t) => t.signalId);
}

const ACTION_RANK = { monitor: 0, reduce_limit: 1, freeze_new: 2, block: 3 } as const;
const SEV_WEIGHT = { info: 1, low: 3, medium: 8, high: 16, critical: 28 } as const;

/** Recompute an assessment with the cleared signals removed. */
export function reevaluateAfterRemediation(
  assessment: BuyerRiskAssessment,
  approvedLimit: number,
  clearedIds: string[],
): BuyerRiskAssessment {
  const signals = assessment.signals.filter((s) => !clearedIds.includes(s.id));
  let action: BuyerRiskAssessment["action"] = "monitor";
  for (const s of signals) if (ACTION_RANK[s.action] > ACTION_RANK[action]) action = s.action;

  const raw = signals.reduce((a, s) => a + s.reductionInr, 0);
  const totalReductionInr = action === "block" ? approvedLimit : Math.min(approvedLimit, raw);
  const effectiveLimit = action === "block" ? 0 : Math.max(0, approvedLimit - totalReductionInr);
  const sevTotal = signals.reduce((a, s) => a + SEV_WEIGHT[s.severity], 0);
  const ratio = approvedLimit > 0 ? totalReductionInr / approvedLimit : 0;
  const riskScore = Math.min(100, Math.round(sevTotal + ratio * 35 + (action === "block" ? 25 : 0)));

  return {
    ...assessment,
    signals,
    action,
    totalReductionInr,
    effectiveLimit,
    riskScore,
    rationale:
      clearedIds.length === 0
        ? assessment.rationale
        : signals.length === 0
          ? "All risk signals cleared through remediation. Full limit restored."
          : `${clearedIds.length} signal(s) cleared through remediation. Remaining holds keep ₹${totalReductionInr.toLocaleString("en-IN")} on reserve.`,
    evaluatedAt: new Date().toISOString(),
  };
}

/* ------------------------- blocked drawdown retries ------------------------- */

export function loadDrawdowns(buyerId: string): DrawdownAttempt[] {
  return read<Record<string, DrawdownAttempt[]>>(DRAWDOWN_KEY, {})[buyerId] ?? [];
}

function writeDrawdowns(buyerId: string, list: DrawdownAttempt[]) {
  const all = read<Record<string, DrawdownAttempt[]>>(DRAWDOWN_KEY, {});
  all[buyerId] = list;
  localStorage.setItem(DRAWDOWN_KEY, JSON.stringify(all));
}

export function recordBlockedDrawdown(
  buyerId: string,
  input: { amount: number; tenureDays: 30 | 60 | 90; supplierName: string; orderRef: string },
  assessment: BuyerRiskAssessment,
): DrawdownAttempt[] {
  const attempt: DrawdownAttempt = {
    id: uid("dd"),
    ...input,
    requestedAt: new Date().toISOString(),
    status: "blocked",
    reason:
      assessment.action === "block"
        ? "Account blocked from new drawdowns by risk rules."
        : assessment.action === "freeze_new"
          ? "New drawdowns frozen while risk signals are open."
          : `Requested amount exceeds the available limit of ₹${assessment.effectiveLimit.toLocaleString("en-IN")}.`,
    blockingSignalIds: assessment.signals.filter((s) => s.action !== "monitor").map((s) => s.id),
  };
  const list = [attempt, ...loadDrawdowns(buyerId)].slice(0, 50);
  writeDrawdowns(buyerId, list);
  return list;
}

export function retryDrawdown(
  buyerId: string,
  attemptId: string,
  assessment: BuyerRiskAssessment,
): { list: DrawdownAttempt[]; approved: boolean; note: string } {
  const list = loadDrawdowns(buyerId);
  const attempt = list.find((a) => a.id === attemptId);
  if (!attempt) return { list, approved: false, note: "Request not found." };

  const stillBlocked = assessment.action === "block" || assessment.action === "freeze_new";
  const withinLimit = attempt.amount <= assessment.effectiveLimit;
  const approved = !stillBlocked && withinLimit;

  const note = approved
    ? `Approved on retry — ₹${attempt.amount.toLocaleString("en-IN")} available against a re-evaluated limit of ₹${assessment.effectiveLimit.toLocaleString("en-IN")}.`
    : stillBlocked
      ? "Still held — open risk signals must be cleared first."
      : `Available limit is ₹${assessment.effectiveLimit.toLocaleString("en-IN")}; reduce the amount or clear more signals.`;

  const next = list.map((a) =>
    a.id === attemptId
      ? {
        ...a,
        status: (approved ? "approved" : "awaiting_remediation") as DrawdownAttempt["status"],
        retriedAt: new Date().toISOString(),
        decisionNote: note,
      }
      : a,
  );
  writeDrawdowns(buyerId, next);
  return { list: next, approved, note };
}

export function clearRemediation(buyerId: string) {
  writeTasks(buyerId, []);
  writeDrawdowns(buyerId, []);
}

export const DRAWDOWN_STATUS_META: Record<DrawdownAttempt["status"], { label: string; tone: string }> = {
  blocked: { label: "Blocked", tone: "bg-destructive/15 text-destructive border-destructive/30" },
  awaiting_remediation: { label: "Awaiting remediation", tone: "bg-yellow-500/15 text-yellow-700 border-yellow-500/30" },
  approved: { label: "Approved on retry", tone: "bg-success/10 text-success border-success/30" },
  declined: { label: "Declined", tone: "bg-destructive/15 text-destructive border-destructive/30" },
};
