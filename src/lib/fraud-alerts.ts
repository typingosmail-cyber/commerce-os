import type { SupplierRiskProfile, RiskLevel } from "./fraud-detection";

const SETTINGS_KEY = "vyapar_fraud_alert_settings_v1";
const SNAPSHOT_KEY = "vyapar_fraud_alert_snapshot_v1";
const EMAIL_LOG_KEY = "vyapar_fraud_alert_email_log_v1";

export interface AlertSubscriber {
  id: string;
  name: string;
  email: string;
  role: string;
  channels: { email: boolean; inApp: boolean };
}

export interface FraudAlertSettings {
  triggerOn: RiskLevel[]; // levels that fire an alert
  alertOnLevelUp: boolean; // any worsening transition
  subscribers: AlertSubscriber[];
}

export interface FraudEmailRecord {
  id: string;
  sentAt: string;
  to: string[];
  subject: string;
  body: string;
  supplierId: string;
  supplierName: string;
  level: RiskLevel;
  previousLevel?: RiskLevel;
  riskScore: number;
  channel: "email" | "in-app";
  status: "queued" | "sent" | "failed";
}

const DEFAULT_SETTINGS: FraudAlertSettings = {
  triggerOn: ["high", "critical"],
  alertOnLevelUp: true,
  subscribers: [
    { id: "u1", name: "Risk Ops Lead",   email: "risk-ops@vyapar.os",  role: "Risk Operations",   channels: { email: true, inApp: true } },
    { id: "u2", name: "Compliance Head", email: "compliance@vyapar.os", role: "Compliance",        channels: { email: true, inApp: true } },
    { id: "u3", name: "Fraud Analyst",   email: "fraud-team@vyapar.os", role: "Fraud Investigations", channels: { email: false, inApp: true } },
  ],
};

const LEVEL_RANK: Record<RiskLevel, number> = { low: 0, medium: 1, high: 2, critical: 3 };

export function loadAlertSettings(): FraudAlertSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return DEFAULT_SETTINGS;
}

export function saveAlertSettings(s: FraudAlertSettings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
}

export function loadEmailLog(): FraudEmailRecord[] {
  try {
    const raw = localStorage.getItem(EMAIL_LOG_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveEmailLog(log: FraudEmailRecord[]) {
  localStorage.setItem(EMAIL_LOG_KEY, JSON.stringify(log.slice(0, 200)));
}

export function clearEmailLog() {
  localStorage.removeItem(EMAIL_LOG_KEY);
}

interface Snapshot { [supplierId: string]: RiskLevel; }

function loadSnapshot(): Snapshot {
  try {
    const raw = localStorage.getItem(SNAPSHOT_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function saveSnapshot(s: Snapshot) {
  localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(s));
}

export interface DetectedAlert {
  supplier: SupplierRiskProfile;
  previousLevel?: RiskLevel;
  reason: "first-seen" | "level-up" | "still-elevated";
}

export interface AlertDispatchResult {
  alerts: DetectedAlert[];
  emails: FraudEmailRecord[];
  inApp: FraudEmailRecord[];
}

function composeEmail(a: DetectedAlert) {
  const p = a.supplier;
  const topSignals = p.signals.slice(0, 3).map(s => `• ${s.label} — ${s.detail}`).join("\n");
  const transitionLine = a.previousLevel
    ? `Risk level changed: ${a.previousLevel.toUpperCase()} → ${p.riskLevel.toUpperCase()}`
    : `Newly flagged at ${p.riskLevel.toUpperCase()} risk`;
  return {
    subject: `[${p.riskLevel.toUpperCase()}] Fraud alert: ${p.supplierName} (${p.riskScore}/100)`,
    body:
`${transitionLine}

Supplier:    ${p.supplierName}
ID / GSTIN:  ${p.supplierId} · ${p.gstin}
Location:    ${p.city}
Score:       ${p.riskScore}/100
Action:      ${p.recommendedAction}

Top signals:
${topSignals || "—"}

Open Fraud Detection Center to review the case, evidence and timeline.`,
  };
}

/**
 * Detect risk transitions vs the persisted snapshot and dispatch alerts to
 * subscribers (mock email + in-app callback). Pure frontend — no network.
 */
export function detectAndDispatch(
  profiles: SupplierRiskProfile[],
  options: {
    pushInApp?: (n: { type: "fraud"; title: string; message: string; actionUrl?: string }) => void;
    onlyForSupplierId?: string;
  } = {},
): AlertDispatchResult {
  const settings = loadAlertSettings();
  const snapshot = loadSnapshot();
  const alerts: DetectedAlert[] = [];

  for (const p of profiles) {
    if (options.onlyForSupplierId && p.supplierId !== options.onlyForSupplierId) continue;
    const prev = snapshot[p.supplierId];
    const meetsTrigger = settings.triggerOn.includes(p.riskLevel);
    if (!meetsTrigger) continue;

    if (!prev) {
      alerts.push({ supplier: p, previousLevel: undefined, reason: "first-seen" });
    } else if (settings.alertOnLevelUp && LEVEL_RANK[p.riskLevel] > LEVEL_RANK[prev]) {
      alerts.push({ supplier: p, previousLevel: prev, reason: "level-up" });
    }
  }

  // Update snapshot AFTER comparing so future runs detect new transitions.
  const nextSnapshot: Snapshot = { ...snapshot };
  for (const p of profiles) nextSnapshot[p.supplierId] = p.riskLevel;
  saveSnapshot(nextSnapshot);

  if (alerts.length === 0) return { alerts: [], emails: [], inApp: [] };

  const log = loadEmailLog();
  const emails: FraudEmailRecord[] = [];
  const inApp: FraudEmailRecord[] = [];

  for (const a of alerts) {
    const { subject, body } = composeEmail(a);
    const emailRecipients = settings.subscribers.filter(s => s.channels.email).map(s => s.email);
    const inAppRecipients = settings.subscribers.filter(s => s.channels.inApp).map(s => s.email);

    if (emailRecipients.length > 0) {
      const rec: FraudEmailRecord = {
        id: `email-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        sentAt: new Date().toISOString(),
        to: emailRecipients, subject, body,
        supplierId: a.supplier.supplierId, supplierName: a.supplier.supplierName,
        level: a.supplier.riskLevel, previousLevel: a.previousLevel,
        riskScore: a.supplier.riskScore, channel: "email", status: "sent",
      };
      emails.push(rec); log.unshift(rec);
    }
    if (inAppRecipients.length > 0) {
      const rec: FraudEmailRecord = {
        id: `inapp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        sentAt: new Date().toISOString(),
        to: inAppRecipients, subject, body,
        supplierId: a.supplier.supplierId, supplierName: a.supplier.supplierName,
        level: a.supplier.riskLevel, previousLevel: a.previousLevel,
        riskScore: a.supplier.riskScore, channel: "in-app", status: "sent",
      };
      inApp.push(rec); log.unshift(rec);

      options.pushInApp?.({
        type: "fraud",
        title: `${a.supplier.riskLevel === "critical" ? "🚨 Critical" : "⚠️ High"} risk: ${a.supplier.supplierName}`,
        message: a.previousLevel
          ? `Risk escalated ${a.previousLevel} → ${a.supplier.riskLevel} · score ${a.supplier.riskScore}/100. ${a.supplier.signals[0]?.label ?? ""}`
          : `Newly flagged at ${a.supplier.riskLevel} · score ${a.supplier.riskScore}/100. ${a.supplier.signals[0]?.label ?? ""}`,
        actionUrl: "/admin/fraud",
      });
    }
  }

  saveEmailLog(log);
  return { alerts, emails, inApp };
}

export function resetSnapshot() {
  localStorage.removeItem(SNAPSHOT_KEY);
}
