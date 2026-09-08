// Buyer-facing Risk Audit Trail
// Reconstructs every credit-limit change that was caused by a fraud / default-risk
// rule, together with the exact signal, threshold and evidence that triggered it.
// Frontend prototype: deterministic derivation + localStorage for buyer appeals.

import {
  type BuyerCreditProfile,
  type BuyerRiskAssessment,
  type BuyerRiskCategory,
  type BuyerRiskSeverity,
  type BuyerRiskAction,
  type BuyerRiskSignal,
  evaluateBuyerRisk,
  mockBuyerRiskMetrics,
} from "./bnpl";

// ---------------------------------------------------------------------------
// Rule book — the published definition behind every rule id
// ---------------------------------------------------------------------------

export interface RiskRuleDef {
  ruleId: string;
  name: string;
  vector: BuyerRiskCategory;
  /** Human readable trigger condition. */
  condition: string;
  /** Observation window the rule looks at. */
  window: string;
  /** Where the underlying data comes from. */
  dataSource: string;
  /** What the buyer can do to clear it. */
  remediation: string;
  /** Days after which the reduction auto-restores if the signal clears. */
  autoRestoreDays: number;
}

export const RISK_RULE_BOOK: Record<string, RiskRuleDef> = {
  "BR-001": { ruleId: "BR-001", name: "Severe overdue (30+ days)", vector: "repayment", condition: "Worst outstanding installment is 30 or more days past due", window: "Live", dataSource: "Repayment ledger", remediation: "Clear the overdue installment in full", autoRestoreDays: 7 },
  "BR-002": { ruleId: "BR-002", name: "Overdue installment (7+ days)", vector: "repayment", condition: "Worst outstanding installment is 7 or more days past due", window: "Live", dataSource: "Repayment ledger", remediation: "Pay the overdue installment", autoRestoreDays: 5 },
  "BR-003": { ruleId: "BR-003", name: "Repeated late payments", vector: "repayment", condition: "3 or more late payments", window: "Rolling 90 days", dataSource: "Repayment ledger", remediation: "Keep the next 3 installments on time", autoRestoreDays: 90 },
  "BR-004": { ruleId: "BR-004", name: "Multiple late payments", vector: "repayment", condition: "2 or more late payments", window: "Rolling 90 days", dataSource: "Repayment ledger", remediation: "Keep the next 2 installments on time", autoRestoreDays: 60 },
  "BR-005": { ruleId: "BR-005", name: "Recent default written off", vector: "repayment", condition: "Any amount written off as defaulted", window: "Rolling 30 days", dataSource: "Collections ledger", remediation: "Settle the written-off amount", autoRestoreDays: 180 },
  "BR-010": { ruleId: "BR-010", name: "Drawdown velocity spike", vector: "velocity", condition: "3 or more BNPL drawdowns in a single day", window: "Last 24 hours", dataSource: "Drawdown log", remediation: "Space out drawdowns; velocity resets daily", autoRestoreDays: 2 },
  "BR-011": { ruleId: "BR-011", name: "Elevated weekly drawdowns", vector: "velocity", condition: "6 or more drawdowns in a week", window: "Rolling 7 days", dataSource: "Drawdown log", remediation: "Consolidate purchase orders", autoRestoreDays: 7 },
  "BR-012": { ruleId: "BR-012", name: "Burst of new supplier relationships", vector: "velocity", condition: "5 or more first-time suppliers in a week", window: "Rolling 7 days", dataSource: "Order graph", remediation: "Complete deliveries with the new suppliers", autoRestoreDays: 14 },
  "BR-020": { ruleId: "BR-020", name: "GSTIN re-verification failed", vector: "identity", condition: "Periodic GSTIN re-check returned inactive / mismatch", window: "Live", dataSource: "GSTN registry check", remediation: "Re-submit a valid GSTIN and latest filing", autoRestoreDays: 1 },
  "BR-021": { ruleId: "BR-021", name: "Frequent device changes", vector: "device", condition: "2 or more new signing devices", window: "Rolling 30 days", dataSource: "Device fingerprint log", remediation: "Verify your devices from account security", autoRestoreDays: 30 },
  "BR-022": { ruleId: "BR-022", name: "Foreign IP login detected", vector: "device", condition: "Login from an IP outside the registered country", window: "Rolling 30 days", dataSource: "Session log", remediation: "Confirm the login was yours", autoRestoreDays: 15 },
  "BR-030": { ruleId: "BR-030", name: "Repeated chargebacks", vector: "dispute", condition: "2 or more chargebacks raised", window: "Rolling 180 days", dataSource: "Payments gateway", remediation: "Resolve chargebacks with the acquirer", autoRestoreDays: 180 },
  "BR-031": { ruleId: "BR-031", name: "Multiple open disputes", vector: "dispute", condition: "2 or more disputes open at once", window: "Live", dataSource: "Dispute desk", remediation: "Close the open disputes", autoRestoreDays: 10 },
  "BR-040": { ruleId: "BR-040", name: "Refund-then-redraw pattern", vector: "behavior", condition: "2 or more refund → immediate redraw cycles", window: "Rolling 60 days", dataSource: "Behaviour analytics", remediation: "Pattern clears after 60 clean days", autoRestoreDays: 60 },
  "BR-041": { ruleId: "BR-041", name: "Credit-check probing", vector: "behavior", condition: "5 or more carts abandoned right after a credit check", window: "Rolling 30 days", dataSource: "Behaviour analytics", remediation: "Complete checkouts you start", autoRestoreDays: 30 },
  "BR-050": { ruleId: "BR-050", name: "High exposure to flagged suppliers", vector: "exposure", condition: "Over 40% of exposure sits with suppliers under fraud review", window: "Live", dataSource: "Supplier risk register", remediation: "Diversify orders across verified suppliers", autoRestoreDays: 21 },
  "BR-051": { ruleId: "BR-051", name: "Limit nearly fully utilized", vector: "exposure", condition: "Utilisation at or above 90% of the approved limit", window: "Live", dataSource: "Credit ledger", remediation: "Repay to bring utilisation below 90%", autoRestoreDays: 3 },
};

export function ruleDef(ruleId: string): RiskRuleDef {
  return (
    RISK_RULE_BOOK[ruleId] ?? {
      ruleId,
      name: ruleId,
      vector: "behavior",
      condition: "Internal risk model rule",
      window: "Live",
      dataSource: "Risk engine",
      remediation: "Contact support for details",
      autoRestoreDays: 30,
    }
  );
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type RiskEventStatus = "active" | "restored" | "expired" | "under_appeal" | "overturned";

export interface TriggerEvidence {
  metric: string;
  observed: string;
  threshold: string;
  window: string;
  source: string;
  /** Underlying records that produced the observation. */
  references: { id: string; label: string; detail: string; date: string }[];
}

export interface RiskLimitEvent {
  id: string;
  date: string;            // ISO date
  ruleId: string;
  signalId: string;
  category: BuyerRiskCategory;
  severity: BuyerRiskSeverity;
  action: BuyerRiskAction;
  title: string;
  detail: string;
  limitBefore: number;
  limitAfter: number;
  delta: number;           // negative for reductions, positive for restorations
  status: RiskEventStatus;
  /** Present when the reduction was later given back. */
  restoredOn?: string;
  evidence: TriggerEvidence;
  decidedBy: "risk_engine" | "underwriter";
}

export interface RiskAuditSummary {
  events: number;
  totalReduced: number;
  totalRestored: number;
  netImpact: number;
  activeHolds: number;
  currentAction: BuyerRiskAction;
  riskScore: number;
  effectiveLimit: number;
  byCategory: { category: BuyerRiskCategory; events: number; impact: number }[];
}

// ---------------------------------------------------------------------------
// Deterministic history construction
// ---------------------------------------------------------------------------

const iso = (daysAgo: number) =>
  new Date(Date.now() - daysAgo * 86400000).toISOString().slice(0, 10);

const inr = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;

/** Stable pseudo-random from a string seed. */
function seeded(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 1000) / 1000;
}

function evidenceFor(signal: BuyerRiskSignal, def: RiskRuleDef, date: string): TriggerEvidence {
  const r = seeded(signal.id + date);
  const refs: Record<BuyerRiskCategory, TriggerEvidence["references"]> = {
    repayment: [
      { id: `INST-${4200 + Math.round(r * 300)}`, label: "Installment record", detail: "Instalment 2 of 3 on credit line CL-2291", date },
      { id: `ORD-${8600 + Math.round(r * 90)}`, label: "Originating order", detail: "Fasteners order financed on 60-day BNPL", date: iso(62) },
    ],
    velocity: [
      { id: `DRW-${9100 + Math.round(r * 200)}`, label: "Drawdown burst", detail: "Sequence of drawdowns within the observation window", date },
      { id: `SES-${Math.round(r * 90000)}`, label: "Session log", detail: "Drawdowns initiated from the same session", date },
    ],
    identity: [
      { id: `GSTN-${Math.round(r * 900000)}`, label: "GSTN registry response", detail: "Automated re-verification response payload", date },
      { id: "KYC-REC-11", label: "KYC record", detail: "Last accepted KYC snapshot on file", date: iso(210) },
    ],
    device: [
      { id: `DEV-${Math.round(r * 99999)}`, label: "Device fingerprint", detail: "New device signature observed at login", date },
      { id: `IP-${Math.round(r * 250)}.${Math.round(r * 250)}.x.x`, label: "IP geolocation", detail: "Geo-resolved login origin", date },
    ],
    dispute: [
      { id: `DSP-${1500 + Math.round(r * 80)}`, label: "Dispute case", detail: "Open quality/short-supply dispute", date },
      { id: `CB-${700 + Math.round(r * 50)}`, label: "Chargeback record", detail: "Acquirer chargeback notification", date: iso(40) },
    ],
    behavior: [
      { id: `BHV-${Math.round(r * 9000)}`, label: "Behaviour analytics run", detail: "Pattern detection batch that flagged the account", date },
      { id: `CRT-${Math.round(r * 4000)}`, label: "Cart events", detail: "Abandoned carts following credit checks", date },
    ],
    exposure: [
      { id: `EXP-${Math.round(r * 700)}`, label: "Exposure snapshot", detail: "Outstanding exposure split by supplier risk band", date },
      { id: `SUP-RISK-${Math.round(r * 400)}`, label: "Supplier risk register", detail: "Counterparties currently under fraud review", date },
    ],
  };

  const observed: Record<BuyerRiskCategory, string> = {
    repayment: `${9 + Math.round(r * 20)} days past due`,
    velocity: `${3 + Math.round(r * 4)} drawdowns`,
    identity: "Registry mismatch",
    device: `${2 + Math.round(r * 2)} new devices`,
    dispute: `${1 + Math.round(r * 2)} open cases`,
    behavior: `${5 + Math.round(r * 4)} events`,
    exposure: `${45 + Math.round(r * 40)}% of exposure`,
  };

  return {
    metric: def.name,
    observed: observed[signal.category],
    threshold: def.condition,
    window: def.window,
    source: def.dataSource,
    references: refs[signal.category],
  };
}

/**
 * Build the buyer-facing risk audit trail: every limit change caused by a
 * fraud / default-risk rule, newest first.
 */
export function generateRiskAuditTrail(
  profile: BuyerCreditProfile,
  assessment?: BuyerRiskAssessment,
): RiskLimitEvent[] {
  const asmt =
    assessment ??
    evaluateBuyerRisk(profile.buyerId, mockBuyerRiskMetrics(profile), profile.approvedLimit);

  const events: RiskLimitEvent[] = [];
  let limit = profile.approvedLimit;

  // 1) Live signals — currently holding the limit down.
  asmt.signals.forEach((s, i) => {
    const def = ruleDef(s.ruleId);
    const date = iso(2 + i * 3);
    const limitAfter = limit;
    const limitBefore = limit + s.reductionInr;
    events.push({
      id: `rae-live-${s.id}`,
      date,
      ruleId: s.ruleId,
      signalId: s.id,
      category: s.category,
      severity: s.severity,
      action: s.action,
      title: s.label,
      detail: s.detail,
      limitBefore,
      limitAfter,
      delta: -s.reductionInr,
      status: "active",
      evidence: evidenceFor(s, def, date),
      decidedBy: s.severity === "critical" ? "underwriter" : "risk_engine",
    });
    limit = limitBefore;
  });

  // 2) Historical rules that fired and were later cleared.
  const history: Array<{ ruleId: string; signalId: string; days: number; cut: number; sev: BuyerRiskSeverity; restoredDays: number; detail: string }> = [
    { ruleId: "BR-002", signalId: "DPD-7", days: 34, cut: Math.round(profile.approvedLimit * 0.15), sev: "high", restoredDays: 27, detail: "Instalment on ORD-8412 ran 11 days past due; limit held down until it was cleared." },
    { ruleId: "BR-010", signalId: "VEL-24H", days: 58, cut: Math.round(profile.approvedLimit * 0.08), sev: "medium", restoredDays: 56, detail: "Four drawdowns inside a single day tripped the velocity guard." },
    { ruleId: "BR-031", signalId: "DSP-OPEN", days: 91, cut: Math.round(profile.approvedLimit * 0.1), sev: "medium", restoredDays: 74, detail: "Two disputes open simultaneously with the same supplier." },
    { ruleId: "BR-021", signalId: "DEV-CHURN", days: 128, cut: Math.round(profile.approvedLimit * 0.05), sev: "low", restoredDays: 120, detail: "Three new signing devices in a month triggered a precautionary hold." },
  ];

  for (const h of history) {
    const def = ruleDef(h.ruleId);
    const date = iso(h.days);
    // Reduction event
    const beforeCut = limit + h.cut;
    events.push({
      id: `rae-hist-${h.signalId}-cut`,
      date,
      ruleId: h.ruleId,
      signalId: h.signalId,
      category: def.vector,
      severity: h.sev,
      action: "reduce_limit",
      title: def.name,
      detail: h.detail,
      limitBefore: beforeCut,
      limitAfter: limit,
      delta: -h.cut,
      status: "restored",
      restoredOn: iso(h.restoredDays),
      evidence: evidenceFor(
        { id: h.signalId, ruleId: h.ruleId, category: def.vector, label: def.name, detail: h.detail, severity: h.sev, reductionInr: h.cut, reductionPct: 0, action: "reduce_limit", triggeredAt: date },
        def,
        date,
      ),
      decidedBy: "risk_engine",
    });
    // Restoration event (happened after the cut, so it sits above it in time)
    events.push({
      id: `rae-hist-${h.signalId}-restore`,
      date: iso(h.restoredDays),
      ruleId: h.ruleId,
      signalId: h.signalId,
      category: def.vector,
      severity: "info",
      action: "monitor",
      title: `${def.name} cleared`,
      detail: `Signal no longer met the trigger condition. ${inr(h.cut)} of limit was returned. Remediation applied: ${def.remediation.toLowerCase()}.`,
      limitBefore: limit,
      limitAfter: beforeCut,
      delta: h.cut,
      status: "expired",
      evidence: {
        metric: `${def.name} — clearance check`,
        observed: "Below threshold",
        threshold: def.condition,
        window: def.window,
        source: def.dataSource,
        references: [
          { id: `CHK-${h.signalId}`, label: "Re-evaluation run", detail: "Automated re-check that cleared the signal", date: iso(h.restoredDays) },
        ],
      },
      decidedBy: "risk_engine",
    });
    limit = beforeCut;
  }

  return events.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}

export function summarizeRiskAudit(
  events: RiskLimitEvent[],
  assessment: BuyerRiskAssessment,
): RiskAuditSummary {
  const totalReduced = events.filter((e) => e.delta < 0).reduce((a, e) => a + Math.abs(e.delta), 0);
  const totalRestored = events.filter((e) => e.delta > 0).reduce((a, e) => a + e.delta, 0);
  const catMap = new Map<BuyerRiskCategory, { events: number; impact: number }>();
  for (const e of events) {
    const c = catMap.get(e.category) ?? { events: 0, impact: 0 };
    c.events += 1;
    c.impact += e.delta;
    catMap.set(e.category, c);
  }
  return {
    events: events.length,
    totalReduced,
    totalRestored,
    netImpact: totalRestored - totalReduced,
    activeHolds: events.filter((e) => e.status === "active").length,
    currentAction: assessment.action,
    riskScore: assessment.riskScore,
    effectiveLimit: assessment.effectiveLimit,
    byCategory: [...catMap.entries()]
      .map(([category, v]) => ({ category, ...v }))
      .sort((a, b) => a.impact - b.impact),
  };
}

// ---------------------------------------------------------------------------
// Buyer appeals (localStorage)
// ---------------------------------------------------------------------------

export interface RiskAppeal {
  id: string;
  eventId: string;
  ruleId: string;
  reason: string;
  note: string;
  evidenceRef?: string;
  submittedAt: string;
  status: "submitted" | "in_review";
}

const APPEAL_KEY = "vyapar_risk_appeals_v1";

export const APPEAL_REASONS = [
  "The payment was already made",
  "The activity was authorised by me",
  "The dispute is with the supplier, not a credit issue",
  "Device / login was mine",
  "Data on file is out of date",
  "Other",
] as const;

export function loadAppeals(): RiskAppeal[] {
  try {
    return JSON.parse(localStorage.getItem(APPEAL_KEY) || "[]") as RiskAppeal[];
  } catch {
    return [];
  }
}

export function submitAppeal(input: Omit<RiskAppeal, "id" | "submittedAt" | "status">): RiskAppeal {
  const appeal: RiskAppeal = {
    ...input,
    id: `apl-${Date.now()}`,
    submittedAt: new Date().toISOString(),
    status: "submitted",
  };
  const all = [appeal, ...loadAppeals()];
  localStorage.setItem(APPEAL_KEY, JSON.stringify(all.slice(0, 100)));
  return appeal;
}

export function clearAppeals() {
  localStorage.removeItem(APPEAL_KEY);
}

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

export function riskAuditToCsv(events: RiskLimitEvent[]): string {
  const head = [
    "Date", "Rule ID", "Rule", "Vector", "Severity", "Action", "Status",
    "Limit before", "Limit after", "Delta (INR)", "Observed", "Threshold",
    "Window", "Source", "Evidence IDs", "Decided by",
  ];
  const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  const rows = events.map((e) =>
    [
      e.date, e.ruleId, e.title, e.category, e.severity, e.action, e.status,
      e.limitBefore, e.limitAfter, e.delta,
      e.evidence.observed, e.evidence.threshold, e.evidence.window, e.evidence.source,
      e.evidence.references.map((r) => r.id).join(" | "),
      e.decidedBy,
    ].map(esc).join(","),
  );
  return [head.map(esc).join(","), ...rows].join("\n");
}
