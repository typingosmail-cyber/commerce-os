import type {
  BuyerRiskAction,
  BuyerRiskAssessment,
  BuyerRiskCategory,
  BuyerRiskMetrics,
  BuyerRiskSeverity,
  BuyerRiskSignal,
} from "./bnpl";

/** Metric keys the rule engine can threshold on. */
export type PolicyMetricKey = keyof BuyerRiskMetrics;

export type ThresholdMode = "absolute" | "pctOfLimit";

export interface PolicyRule {
  /** Stable rule book id (BR-xxx). */
  ruleId: string;
  /** Signal id emitted when this rule fires. */
  signalId: string;
  category: BuyerRiskCategory;
  label: string;
  metric: PolicyMetricKey;
  /** Comparison against the threshold. */
  op: ">=" | ">" | "==";
  threshold: number;
  thresholdMode: ThresholdMode;
  unit: "count" | "days" | "inr" | "percent" | "flag";
  min: number;
  max: number;
  step: number;
  /** Limit reduction as % of approved limit (0 = non-financial signal). */
  reductionPct: number;
  severity: BuyerRiskSeverity;
  action: BuyerRiskAction;
  enabled: boolean;
  /** Fires only when this other rule did NOT fire (tiered rules). */
  suppressedBy?: string;
  /** Template — {v} = observed value, {t} = threshold. */
  detail: string;
}

export interface RiskPolicy {
  version: number;
  updatedAt: string;
  rules: PolicyRule[];
}

export const CATEGORY_LABEL: Record<BuyerRiskCategory, string> = {
  repayment: "Repayment",
  velocity: "Velocity",
  identity: "Identity",
  device: "Device / Geo",
  dispute: "Disputes",
  behavior: "Behaviour",
  exposure: "Exposure",
};

export const ACTION_LABEL: Record<BuyerRiskAction, string> = {
  monitor: "Monitor only",
  reduce_limit: "Reduce limit",
  freeze_new: "Freeze new drawdowns",
  block: "Block account",
};

export const SEVERITY_ORDER: BuyerRiskSeverity[] = ["info", "low", "medium", "high", "critical"];
export const ACTION_ORDER: BuyerRiskAction[] = ["monitor", "reduce_limit", "freeze_new", "block"];

export const METRIC_LABEL: Record<PolicyMetricKey, string> = {
  latePaymentsLast90d: "Late payments (90d)",
  daysPastDueMax: "Worst days past due (DPD)",
  rolling30dDefaultedAmount: "Defaulted amount (30d)",
  drawdownsLast24h: "Drawdowns (24h)",
  drawdownsLast7d: "Drawdowns (7d)",
  newSuppliersLast7d: "New suppliers (7d)",
  deviceChangesLast30d: "Device changes (30d)",
  ipCountryMismatches: "Foreign-IP sessions (30d)",
  gstinReverifyFailed: "GSTIN re-verification failed",
  openDisputes: "Open disputes",
  chargebacksLast180d: "Chargebacks (180d)",
  cartAbandonAfterCreditCheck: "Carts abandoned after credit check",
  refundedThenRedrawCount: "Refund-then-redraw cycles",
  exposureToHighRiskSuppliers: "Exposure to flagged suppliers",
  utilizationPct: "Limit utilisation",
};

export const METRIC_INPUT: Record<PolicyMetricKey, { min: number; max: number; step: number; unit: PolicyRule["unit"] }> = {
  latePaymentsLast90d: { min: 0, max: 12, step: 1, unit: "count" },
  daysPastDueMax: { min: 0, max: 90, step: 1, unit: "days" },
  rolling30dDefaultedAmount: { min: 0, max: 1_000_000, step: 10_000, unit: "inr" },
  drawdownsLast24h: { min: 0, max: 15, step: 1, unit: "count" },
  drawdownsLast7d: { min: 0, max: 30, step: 1, unit: "count" },
  newSuppliersLast7d: { min: 0, max: 20, step: 1, unit: "count" },
  deviceChangesLast30d: { min: 0, max: 12, step: 1, unit: "count" },
  ipCountryMismatches: { min: 0, max: 10, step: 1, unit: "count" },
  gstinReverifyFailed: { min: 0, max: 1, step: 1, unit: "flag" },
  openDisputes: { min: 0, max: 15, step: 1, unit: "count" },
  chargebacksLast180d: { min: 0, max: 10, step: 1, unit: "count" },
  cartAbandonAfterCreditCheck: { min: 0, max: 20, step: 1, unit: "count" },
  refundedThenRedrawCount: { min: 0, max: 10, step: 1, unit: "count" },
  exposureToHighRiskSuppliers: { min: 0, max: 3_000_000, step: 25_000, unit: "inr" },
  utilizationPct: { min: 0, max: 100, step: 1, unit: "percent" },
};

/** Mirrors the hardcoded defaults in evaluateBuyerRisk. */
export const DEFAULT_RULES: PolicyRule[] = [
  {
    ruleId: "BR-001", signalId: "DPD-30", category: "repayment", label: "Severe overdue (30+ days)",
    metric: "daysPastDueMax", op: ">=", threshold: 30, thresholdMode: "absolute", unit: "days",
    min: 5, max: 90, step: 1, reductionPct: 100, severity: "critical", action: "block", enabled: true,
    detail: "Outstanding installment is {v} days past due (threshold {t}).",
  },
  {
    ruleId: "BR-002", signalId: "DPD-7", category: "repayment", label: "Overdue installment (7+ days)",
    metric: "daysPastDueMax", op: ">=", threshold: 7, thresholdMode: "absolute", unit: "days",
    min: 1, max: 45, step: 1, reductionPct: 50, severity: "high", action: "freeze_new", enabled: true,
    suppressedBy: "BR-001",
    detail: "Installment {v} days late (threshold {t}) — new drawdowns frozen.",
  },
  {
    ruleId: "BR-003", signalId: "LATE-3x90", category: "repayment", label: "Repeated late payments",
    metric: "latePaymentsLast90d", op: ">=", threshold: 3, thresholdMode: "absolute", unit: "count",
    min: 1, max: 10, step: 1, reductionPct: 30, severity: "high", action: "reduce_limit", enabled: true,
    detail: "{v} late payments in the last 90 days (threshold {t}).",
  },
  {
    ruleId: "BR-004", signalId: "LATE-2x90", category: "repayment", label: "Multiple late payments",
    metric: "latePaymentsLast90d", op: ">=", threshold: 2, thresholdMode: "absolute", unit: "count",
    min: 1, max: 8, step: 1, reductionPct: 15, severity: "medium", action: "reduce_limit", enabled: true,
    suppressedBy: "BR-003",
    detail: "{v} late payments in the last 90 days (threshold {t}).",
  },
  {
    ruleId: "BR-005", signalId: "DEFAULT-30D", category: "repayment", label: "Recent default written off",
    metric: "rolling30dDefaultedAmount", op: ">", threshold: 0, thresholdMode: "absolute", unit: "inr",
    min: 0, max: 500_000, step: 10_000, reductionPct: 70, severity: "critical", action: "freeze_new", enabled: true,
    detail: "₹{v} defaulted in the last 30 days (threshold ₹{t}).",
  },
  {
    ruleId: "BR-010", signalId: "VEL-24H", category: "velocity", label: "Drawdown velocity spike",
    metric: "drawdownsLast24h", op: ">=", threshold: 5, thresholdMode: "absolute", unit: "count",
    min: 2, max: 15, step: 1, reductionPct: 25, severity: "high", action: "freeze_new", enabled: true,
    detail: "{v} credit drawdowns in 24h vs threshold {t}.",
  },
  {
    ruleId: "BR-011", signalId: "VEL-7D", category: "velocity", label: "Elevated weekly drawdowns",
    metric: "drawdownsLast7d", op: ">=", threshold: 8, thresholdMode: "absolute", unit: "count",
    min: 2, max: 30, step: 1, reductionPct: 10, severity: "medium", action: "reduce_limit", enabled: true,
    suppressedBy: "BR-010",
    detail: "{v} drawdowns in 7 days (threshold {t}).",
  },
  {
    ruleId: "BR-012", signalId: "VEL-NEW-SUPP", category: "velocity", label: "Burst of new supplier relationships",
    metric: "newSuppliersLast7d", op: ">=", threshold: 5, thresholdMode: "absolute", unit: "count",
    min: 1, max: 20, step: 1, reductionPct: 10, severity: "medium", action: "reduce_limit", enabled: true,
    detail: "{v} brand-new suppliers transacted in 7 days (threshold {t}).",
  },
  {
    ruleId: "BR-020", signalId: "ID-GST-FAIL", category: "identity", label: "GSTIN re-verification failed",
    metric: "gstinReverifyFailed", op: "==", threshold: 1, thresholdMode: "absolute", unit: "flag",
    min: 1, max: 1, step: 1, reductionPct: 100, severity: "critical", action: "block", enabled: true,
    detail: "Latest GSTIN check returned mismatched legal name / status.",
  },
  {
    ruleId: "BR-021", signalId: "DEV-CHURN", category: "device", label: "Frequent device changes",
    metric: "deviceChangesLast30d", op: ">=", threshold: 4, thresholdMode: "absolute", unit: "count",
    min: 1, max: 12, step: 1, reductionPct: 20, severity: "high", action: "reduce_limit", enabled: true,
    detail: "{v} new devices used in 30 days (threshold {t}).",
  },
  {
    ruleId: "BR-022", signalId: "IP-GEO", category: "device", label: "Foreign IP login detected",
    metric: "ipCountryMismatches", op: ">=", threshold: 1, thresholdMode: "absolute", unit: "count",
    min: 1, max: 10, step: 1, reductionPct: 10, severity: "medium", action: "reduce_limit", enabled: true,
    detail: "{v} session(s) outside India in last 30 days (threshold {t}).",
  },
  {
    ruleId: "BR-030", signalId: "CB-180D", category: "dispute", label: "Repeated chargebacks",
    metric: "chargebacksLast180d", op: ">=", threshold: 2, thresholdMode: "absolute", unit: "count",
    min: 1, max: 10, step: 1, reductionPct: 30, severity: "high", action: "freeze_new", enabled: true,
    detail: "{v} chargebacks in 180 days (threshold {t}).",
  },
  {
    ruleId: "BR-031", signalId: "DSP-OPEN", category: "dispute", label: "Multiple open disputes",
    metric: "openDisputes", op: ">=", threshold: 3, thresholdMode: "absolute", unit: "count",
    min: 1, max: 15, step: 1, reductionPct: 10, severity: "medium", action: "reduce_limit", enabled: true,
    detail: "{v} disputes currently open (threshold {t}).",
  },
  {
    ruleId: "BR-040", signalId: "BHV-REFUND-LOOP", category: "behavior", label: "Refund-then-redraw pattern",
    metric: "refundedThenRedrawCount", op: ">=", threshold: 2, thresholdMode: "absolute", unit: "count",
    min: 1, max: 10, step: 1, reductionPct: 25, severity: "high", action: "freeze_new", enabled: true,
    detail: "{v} cycles of refund followed by immediate new drawdown (threshold {t}).",
  },
  {
    ruleId: "BR-041", signalId: "BHV-PROBE", category: "behavior", label: "Credit-check probing",
    metric: "cartAbandonAfterCreditCheck", op: ">=", threshold: 5, thresholdMode: "absolute", unit: "count",
    min: 1, max: 20, step: 1, reductionPct: 0, severity: "low", action: "monitor", enabled: true,
    detail: "{v} large carts abandoned right after credit eligibility check (threshold {t}).",
  },
  {
    ruleId: "BR-050", signalId: "EXP-HIGHRISK", category: "exposure", label: "High exposure to flagged suppliers",
    metric: "exposureToHighRiskSuppliers", op: ">", threshold: 40, thresholdMode: "pctOfLimit", unit: "percent",
    min: 5, max: 100, step: 5, reductionPct: 15, severity: "medium", action: "reduce_limit", enabled: true,
    detail: "₹{v} concentrated with high-risk suppliers (over {t}% of approved limit).",
  },
  {
    ruleId: "BR-051", signalId: "EXP-UTIL", category: "exposure", label: "Limit nearly fully utilized",
    metric: "utilizationPct", op: ">=", threshold: 95, thresholdMode: "absolute", unit: "percent",
    min: 50, max: 100, step: 1, reductionPct: 0, severity: "low", action: "monitor", enabled: true,
    detail: "{v}% of approved limit currently drawn (threshold {t}%).",
  },
];

const KEY = "vyapar_risk_policy_v1";

export function defaultPolicy(): RiskPolicy {
  return {
    version: 1,
    updatedAt: new Date().toISOString(),
    rules: DEFAULT_RULES.map((r) => ({ ...r })),
  };
}

export function loadPolicy(): RiskPolicy {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const saved = JSON.parse(raw) as RiskPolicy;
      // Merge so new default rules appear for existing users.
      const rules = DEFAULT_RULES.map((d) => {
        const s = saved.rules?.find((r) => r.ruleId === d.ruleId);
        return s ? { ...d, threshold: s.threshold, reductionPct: s.reductionPct, severity: s.severity, action: s.action, enabled: s.enabled } : { ...d };
      });
      return { version: saved.version ?? 1, updatedAt: saved.updatedAt ?? new Date().toISOString(), rules };
    }
  } catch { /* ignore */ }
  return defaultPolicy();
}

export function savePolicy(policy: RiskPolicy): RiskPolicy {
  const next = { ...policy, version: policy.version + 1, updatedAt: new Date().toISOString() };
  localStorage.setItem(KEY, JSON.stringify(next));
  return next;
}

export function resetPolicy(): RiskPolicy {
  localStorage.removeItem(KEY);
  return defaultPolicy();
}

export function metricValue(metrics: BuyerRiskMetrics, key: PolicyMetricKey): number {
  const v = metrics[key];
  return typeof v === "boolean" ? (v ? 1 : 0) : v;
}

function compare(v: number, op: PolicyRule["op"], t: number) {
  if (op === ">=") return v >= t;
  if (op === ">") return v > t;
  return v === t;
}

function effectiveThreshold(rule: PolicyRule, approvedLimit: number) {
  return rule.thresholdMode === "pctOfLimit" ? (approvedLimit * rule.threshold) / 100 : rule.threshold;
}

const ACTION_RANK: Record<BuyerRiskAction, number> = { monitor: 0, reduce_limit: 1, freeze_new: 2, block: 3 };
const SEV_WEIGHT: Record<BuyerRiskSeverity, number> = { info: 1, low: 3, medium: 8, high: 16, critical: 28 };

export interface PolicyEvaluation extends BuyerRiskAssessment {
  /** Rules evaluated but not fired, with the gap to their threshold. */
  nearMisses: { ruleId: string; label: string; observed: number; threshold: number; gap: number }[];
  firedRuleIds: string[];
}

/** Evaluate a buyer against an editable policy (same maths as evaluateBuyerRisk). */
export function evaluateWithPolicy(
  buyerId: string,
  metrics: BuyerRiskMetrics,
  approvedLimit: number,
  policy: RiskPolicy,
): PolicyEvaluation {
  const now = new Date().toISOString();
  const signals: BuyerRiskSignal[] = [];
  const fired = new Set<string>();
  const nearMisses: PolicyEvaluation["nearMisses"] = [];

  for (const rule of policy.rules) {
    if (!rule.enabled) continue;
    const observed = metricValue(metrics, rule.metric);
    const threshold = effectiveThreshold(rule, approvedLimit);
    const hit = compare(observed, rule.op, threshold);
    const suppressed = rule.suppressedBy ? fired.has(rule.suppressedBy) : false;

    if (hit && !suppressed) {
      fired.add(rule.ruleId);
      const reductionInr = Math.round((approvedLimit * rule.reductionPct) / 100);
      signals.push({
        id: rule.signalId,
        ruleId: rule.ruleId,
        category: rule.category,
        label: rule.label,
        detail: rule.detail
          .replace("{v}", observed.toLocaleString("en-IN"))
          .replace("{t}", rule.threshold.toLocaleString("en-IN")),
        severity: rule.severity,
        reductionInr,
        reductionPct: approvedLimit > 0 ? +((reductionInr / approvedLimit) * 100).toFixed(1) : 0,
        action: rule.action,
        triggeredAt: now,
      });
    } else if (!hit) {
      nearMisses.push({
        ruleId: rule.ruleId,
        label: rule.label,
        observed,
        threshold,
        gap: +(threshold - observed).toFixed(2),
      });
    }
  }

  let action: BuyerRiskAction = "monitor";
  for (const s of signals) if (ACTION_RANK[s.action] > ACTION_RANK[action]) action = s.action;

  const rawReduction = signals.reduce((a, s) => a + s.reductionInr, 0);
  const totalReductionInr = action === "block" ? approvedLimit : Math.min(approvedLimit, rawReduction);
  const effectiveLimit = action === "block" ? 0 : Math.max(0, approvedLimit - totalReductionInr);
  const sevTotal = signals.reduce((a, s) => a + SEV_WEIGHT[s.severity], 0);
  const reductionRatio = approvedLimit > 0 ? totalReductionInr / approvedLimit : 0;
  const riskScore = Math.min(100, Math.round(sevTotal + reductionRatio * 35 + (action === "block" ? 25 : 0)));

  const rationale =
    action === "block"
      ? "Account blocked from new BNPL drawdowns pending compliance review."
      : action === "freeze_new"
        ? "New drawdowns frozen until outstanding risks are cleared."
        : action === "reduce_limit"
          ? `Approved limit temporarily reduced by ₹${totalReductionInr.toLocaleString("en-IN")} based on detected risk signals.`
          : signals.length === 0
            ? "No risk signals detected. Limit unchanged."
            : "Low-severity signals only — monitoring, no limit change.";

  return {
    buyerId, signals, riskScore, action, totalReductionInr, effectiveLimit,
    rationale, evaluatedAt: now,
    nearMisses: nearMisses.sort((a, b) => a.gap - b.gap).slice(0, 6),
    firedRuleIds: [...fired],
  };
}

export interface PolicyDiffRow {
  ruleId: string;
  label: string;
  before: "fired" | "clear";
  after: "fired" | "clear";
  reductionBefore: number;
  reductionAfter: number;
}

export function diffEvaluations(before: PolicyEvaluation, after: PolicyEvaluation): PolicyDiffRow[] {
  const ids = [...new Set([...before.firedRuleIds, ...after.firedRuleIds])];
  return ids.map((id): PolicyDiffRow => {
    const b = before.signals.find((s) => s.ruleId === id);
    const a = after.signals.find((s) => s.ruleId === id);
    return {
      ruleId: id,
      label: (a ?? b)?.label ?? id,
      before: b ? "fired" : "clear",
      after: a ? "fired" : "clear",
      reductionBefore: b?.reductionInr ?? 0,
      reductionAfter: a?.reductionInr ?? 0,
    };
  }).filter((r) => r.before !== r.after || r.reductionBefore !== r.reductionAfter);
}

/** Demo buyer book for the admin simulator. */
export interface SimBuyer {
  id: string;
  name: string;
  city: string;
  trustScore: number;
}

export const SIM_BUYERS: SimBuyer[] = [
  { id: "byr-1001", name: "Deccan Fabrication Works", city: "Pune", trustScore: 842 },
  { id: "byr-1002", name: "Shree Ganesh Engineering", city: "Pimpri", trustScore: 726 },
  { id: "byr-1003", name: "Mumbai Metal Traders", city: "Mumbai", trustScore: 648 },
  { id: "byr-1004", name: "Konkan Infra Supplies", city: "Thane", trustScore: 574 },
  { id: "byr-1005", name: "Nashik Auto Components", city: "Nashik", trustScore: 781 },
];
