import type { SupplierRiskProfile } from "./fraud-detection";

export type RiskVector =
  | "documents"
  | "gst"
  | "transactions"
  | "behavior"
  | "network"
  | "composite";

export type AlertSeverity = "info" | "warning" | "critical";

export type ComparisonOp = ">=" | ">" | "<=" | "<" | "==";

export type NotifyChannel = "in_app" | "email" | "slack" | "sms" | "webhook";

export type TeamId =
  | "risk_ops"
  | "compliance"
  | "fraud_investigations"
  | "kyc_team"
  | "finance"
  | "legal"
  | "engineering";

export interface Team {
  id: TeamId;
  name: string;
  description: string;
  defaultChannels: NotifyChannel[];
  members: number;
}

export const TEAMS: Team[] = [
  { id: "risk_ops", name: "Risk Operations", description: "Day-to-day risk monitoring & triage", defaultChannels: ["in_app", "email"], members: 6 },
  { id: "compliance", name: "Compliance", description: "GST/KYC compliance & regulatory escalations", defaultChannels: ["in_app", "email"], members: 4 },
  { id: "fraud_investigations", name: "Fraud Investigations", description: "Deep-dive case investigators", defaultChannels: ["in_app", "email", "slack"], members: 3 },
  { id: "kyc_team", name: "KYC Team", description: "Onboarding & document verification", defaultChannels: ["in_app", "email"], members: 5 },
  { id: "finance", name: "Finance / Escrow", description: "Escrow holds & payout reviews", defaultChannels: ["in_app", "email"], members: 4 },
  { id: "legal", name: "Legal", description: "Litigation, blacklisting & legal notices", defaultChannels: ["email"], members: 2 },
  { id: "engineering", name: "Engineering / Trust & Safety", description: "Platform abuse & device clusters", defaultChannels: ["slack", "in_app"], members: 4 },
];

export interface MetricDef {
  id: string;
  label: string;
  vector: RiskVector;
  unit: "score" | "percent" | "count" | "multiplier";
  min: number;
  max: number;
  step: number;
  defaultThreshold: number;
  defaultOp: ComparisonOp;
  description: string;
  /** function to read value from a SupplierRiskProfile */
  read: (p: SupplierRiskProfile) => number;
}

export const METRICS: MetricDef[] = [
  {
    id: "doc_similarity", label: "Document similarity", vector: "documents", unit: "score",
    min: 0, max: 100, step: 5, defaultThreshold: 70, defaultOp: ">=",
    description: "KYC document field overlap with other accounts (0–100).",
    read: (p) => p.docSimilarityScore,
  },
  {
    id: "gst_changes", label: "GSTIN changes (12m)", vector: "gst", unit: "count",
    min: 0, max: 6, step: 1, defaultThreshold: 2, defaultOp: ">=",
    description: "Number of GSTIN changes in the last 12 months.",
    read: (p) => p.gstChangesLast12m,
  },
  {
    id: "address_changes", label: "Address changes (12m)", vector: "gst", unit: "count",
    min: 0, max: 6, step: 1, defaultThreshold: 2, defaultOp: ">=",
    description: "Registered business address changes in 12 months.",
    read: (p) => p.addressChangesLast12m,
  },
  {
    id: "tx_anomaly", label: "Transaction anomaly score", vector: "transactions", unit: "score",
    min: 0, max: 100, step: 5, defaultThreshold: 60, defaultOp: ">=",
    description: "Statistical deviation of order patterns vs category baseline.",
    read: (p) => p.txAnomalyScore,
  },
  {
    id: "velocity", label: "Order velocity spike", vector: "transactions", unit: "multiplier",
    min: 1, max: 10, step: 0.5, defaultThreshold: 3, defaultOp: ">=",
    description: "Multiple of normal weekly order volume.",
    read: (p) => p.velocitySpike,
  },
  {
    id: "refund_rate", label: "Refund rate", vector: "behavior", unit: "percent",
    min: 0, max: 50, step: 1, defaultThreshold: 15, defaultOp: ">=",
    description: "Percent of orders that end in refund.",
    read: (p) => p.refundRate * 100,
  },
  {
    id: "dispute_rate", label: "Buyer dispute rate", vector: "behavior", unit: "percent",
    min: 0, max: 30, step: 1, defaultThreshold: 8, defaultOp: ">=",
    description: "Percent of orders with buyer-raised disputes.",
    read: (p) => p.disputeRate * 100,
  },
  {
    id: "cancel_rate", label: "Cancellation after escrow", vector: "behavior", unit: "percent",
    min: 0, max: 60, step: 1, defaultThreshold: 20, defaultOp: ">=",
    description: "Percent of escrow-funded orders that get cancelled.",
    read: (p) => p.cancelledOrderRate * 100,
  },
  {
    id: "device_clusters", label: "Shared device / IP clusters", vector: "network", unit: "count",
    min: 0, max: 8, step: 1, defaultThreshold: 2, defaultOp: ">=",
    description: "Other supplier accounts sharing device fingerprint.",
    read: (p) => p.ipDeviceClusters,
  },
  {
    id: "composite_score", label: "Composite risk score", vector: "composite", unit: "score",
    min: 0, max: 100, step: 5, defaultThreshold: 75, defaultOp: ">=",
    description: "Aggregated 0–100 fraud risk score.",
    read: (p) => p.riskScore,
  },
];

export interface AlertRule {
  id: string;
  name: string;
  enabled: boolean;
  vector: RiskVector;
  metricId: string;
  op: ComparisonOp;
  threshold: number;
  severity: AlertSeverity;
  cooldownMinutes: number;
  team: TeamId;
  channels: NotifyChannel[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
  triggers: number;
  lastTriggeredAt?: string;
}

export interface AlertEvent {
  id: string;
  ruleId: string;
  ruleName: string;
  severity: AlertSeverity;
  team: TeamId;
  supplierId: string;
  supplierName: string;
  metricId: string;
  metricLabel: string;
  observedValue: number;
  threshold: number;
  op: ComparisonOp;
  channels: NotifyChannel[];
  firedAt: string;
  acknowledged: boolean;
}

const RULES_KEY = "vyapar_fraud_alert_rules_v1";
const EVENTS_KEY = "vyapar_fraud_alert_events_v1";

function uid(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function getMetric(id: string): MetricDef | undefined {
  return METRICS.find((m) => m.id === id);
}

export function getTeam(id: TeamId): Team | undefined {
  return TEAMS.find((t) => t.id === id);
}

const SEED_RULES: AlertRule[] = [
  {
    id: "rule-doc-critical", name: "High document similarity",
    enabled: true, vector: "documents", metricId: "doc_similarity",
    op: ">=", threshold: 80, severity: "critical", cooldownMinutes: 60,
    team: "kyc_team", channels: ["in_app", "email", "slack"],
    notes: "Likely shell/duplicate KYC. Route to KYC for re-verification.",
    createdAt: new Date(Date.now() - 86400000 * 14).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    triggers: 7, lastTriggeredAt: new Date(Date.now() - 3600000 * 5).toISOString(),
  },
  {
    id: "rule-gst-churn", name: "Frequent GSTIN changes",
    enabled: true, vector: "gst", metricId: "gst_changes",
    op: ">=", threshold: 3, severity: "warning", cooldownMinutes: 1440,
    team: "compliance", channels: ["in_app", "email"],
    notes: "More than 3 GSTIN updates in 12 months — manual compliance review.",
    createdAt: new Date(Date.now() - 86400000 * 30).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 7).toISOString(),
    triggers: 3, lastTriggeredAt: new Date(Date.now() - 86400000 * 1).toISOString(),
  },
  {
    id: "rule-tx-anomaly", name: "Transaction anomaly spike",
    enabled: true, vector: "transactions", metricId: "tx_anomaly",
    op: ">=", threshold: 70, severity: "critical", cooldownMinutes: 30,
    team: "fraud_investigations", channels: ["in_app", "email", "slack"],
    createdAt: new Date(Date.now() - 86400000 * 21).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    triggers: 12, lastTriggeredAt: new Date(Date.now() - 1800000).toISOString(),
  },
  {
    id: "rule-velocity", name: "Order velocity spike",
    enabled: true, vector: "transactions", metricId: "velocity",
    op: ">=", threshold: 4, severity: "warning", cooldownMinutes: 120,
    team: "risk_ops", channels: ["in_app", "email"],
    createdAt: new Date(Date.now() - 86400000 * 10).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 1).toISOString(),
    triggers: 5,
  },
  {
    id: "rule-disputes", name: "High dispute rate",
    enabled: true, vector: "behavior", metricId: "dispute_rate",
    op: ">=", threshold: 12, severity: "warning", cooldownMinutes: 720,
    team: "risk_ops", channels: ["in_app", "email"],
    createdAt: new Date(Date.now() - 86400000 * 18).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 4).toISOString(),
    triggers: 4,
  },
  {
    id: "rule-device", name: "Shared device cluster",
    enabled: true, vector: "network", metricId: "device_clusters",
    op: ">=", threshold: 3, severity: "critical", cooldownMinutes: 60,
    team: "engineering", channels: ["slack", "in_app"],
    notes: "Possible coordinated fraud ring — Trust & Safety should investigate.",
    createdAt: new Date(Date.now() - 86400000 * 25).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 6).toISOString(),
    triggers: 9, lastTriggeredAt: new Date(Date.now() - 7200000).toISOString(),
  },
  {
    id: "rule-composite", name: "Critical composite risk",
    enabled: true, vector: "composite", metricId: "composite_score",
    op: ">=", threshold: 75, severity: "critical", cooldownMinutes: 60,
    team: "fraud_investigations", channels: ["in_app", "email", "sms"],
    createdAt: new Date(Date.now() - 86400000 * 40).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    triggers: 14, lastTriggeredAt: new Date(Date.now() - 1200000).toISOString(),
  },
];

export function loadRules(): AlertRule[] {
  try {
    const raw = localStorage.getItem(RULES_KEY);
    if (raw) return JSON.parse(raw) as AlertRule[];
  } catch { /* ignore */ }
  saveRules(SEED_RULES);
  return SEED_RULES;
}

export function saveRules(rules: AlertRule[]) {
  localStorage.setItem(RULES_KEY, JSON.stringify(rules));
}

export function loadEvents(): AlertEvent[] {
  try {
    const raw = localStorage.getItem(EVENTS_KEY);
    if (raw) return JSON.parse(raw) as AlertEvent[];
  } catch { /* ignore */ }
  return [];
}

export function saveEvents(events: AlertEvent[]) {
  localStorage.setItem(EVENTS_KEY, JSON.stringify(events.slice(0, 200)));
}

export function createRule(input: Omit<AlertRule, "id" | "createdAt" | "updatedAt" | "triggers">): AlertRule {
  const now = new Date().toISOString();
  const rule: AlertRule = { ...input, id: uid("rule"), createdAt: now, updatedAt: now, triggers: 0 };
  const rules = loadRules();
  saveRules([rule, ...rules]);
  return rule;
}

export function updateRule(id: string, patch: Partial<AlertRule>): AlertRule | undefined {
  const rules = loadRules();
  const next = rules.map((r) => (r.id === id ? { ...r, ...patch, updatedAt: new Date().toISOString() } : r));
  saveRules(next);
  return next.find((r) => r.id === id);
}

export function deleteRule(id: string) {
  const rules = loadRules().filter((r) => r.id !== id);
  saveRules(rules);
}

export function compare(value: number, op: ComparisonOp, threshold: number): boolean {
  switch (op) {
    case ">=": return value >= threshold;
    case ">": return value > threshold;
    case "<=": return value <= threshold;
    case "<": return value < threshold;
    case "==": return value === threshold;
  }
}

export function evaluateRulesAgainstProfiles(
  rules: AlertRule[],
  profiles: SupplierRiskProfile[],
): AlertEvent[] {
  const events: AlertEvent[] = [];
  for (const r of rules) {
    if (!r.enabled) continue;
    const metric = getMetric(r.metricId);
    if (!metric) continue;
    for (const p of profiles) {
      const v = metric.read(p);
      if (compare(v, r.op, r.threshold)) {
        events.push({
          id: uid("evt"),
          ruleId: r.id, ruleName: r.name, severity: r.severity, team: r.team,
          supplierId: p.supplierId, supplierName: p.supplierName,
          metricId: metric.id, metricLabel: metric.label,
          observedValue: Number(v.toFixed(2)),
          threshold: r.threshold, op: r.op,
          channels: r.channels,
          firedAt: new Date().toISOString(),
          acknowledged: false,
        });
      }
    }
  }
  return events;
}

export function recordEvents(newEvents: AlertEvent[]): AlertEvent[] {
  const existing = loadEvents();
  const merged = [...newEvents, ...existing];
  saveEvents(merged);

  // bump trigger counters on rules
  if (newEvents.length) {
    const counts = new Map<string, number>();
    for (const e of newEvents) counts.set(e.ruleId, (counts.get(e.ruleId) ?? 0) + 1);
    const rules = loadRules().map((r) => counts.has(r.id)
      ? { ...r, triggers: r.triggers + (counts.get(r.id) ?? 0), lastTriggeredAt: new Date().toISOString() }
      : r);
    saveRules(rules);
  }
  return merged;
}

export function acknowledgeEvent(id: string) {
  const events = loadEvents().map((e) => (e.id === id ? { ...e, acknowledged: true } : e));
  saveEvents(events);
}

export function clearEvents() {
  saveEvents([]);
}

export const SEVERITY_STYLE: Record<AlertSeverity, string> = {
  info: "bg-primary/10 text-primary border-primary/30",
  warning: "bg-yellow-500/15 text-yellow-700 border-yellow-500/30",
  critical: "bg-destructive/15 text-destructive border-destructive/30",
};

export const VECTOR_LABEL: Record<RiskVector, string> = {
  documents: "Documents",
  gst: "GST / Identity",
  transactions: "Transactions",
  behavior: "Behavior",
  network: "Device / Network",
  composite: "Composite",
};

export const CHANNEL_LABEL: Record<NotifyChannel, string> = {
  in_app: "In-app",
  email: "Email",
  slack: "Slack",
  sms: "SMS",
  webhook: "Webhook",
};
