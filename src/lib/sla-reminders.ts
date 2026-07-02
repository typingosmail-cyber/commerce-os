import type { QueueDoc } from "./reviewer";

export type SlaState = "on_track" | "nearing" | "overdue";

export interface SlaConfig {
  enabled: boolean;
  warnHours: number;       // fire "nearing" when time-left <= this
  reAlertHours: number;    // re-fire overdue alert this often
  inApp: boolean;
  toast: boolean;
  email: boolean;          // mock only
  recipients: string[];    // reviewer emails / roles
}

export interface SlaAlert {
  id: string;
  docId: string;
  supplierId: string;
  supplierName: string;
  documentName: string;
  state: "nearing" | "overdue";
  hoursDelta: number;      // + overdue, - nearing (hours until due)
  firedAt: string;
  acknowledged: boolean;
  ackedBy?: string;
  ackedAt?: string;
}

const CFG_KEY = "vyapar_sla_config_v1";
const LOG_KEY = "vyapar_sla_alerts_v1";
const LAST_KEY = "vyapar_sla_last_fired_v1"; // { [docId+state]: iso }

export const DEFAULT_SLA_CONFIG: SlaConfig = {
  enabled: true,
  warnHours: 4,
  reAlertHours: 6,
  inApp: true,
  toast: true,
  email: false,
  recipients: ["reviewer-ops@vyapar.local"],
};

export function loadSlaConfig(): SlaConfig {
  try {
    const raw = localStorage.getItem(CFG_KEY);
    if (raw) return { ...DEFAULT_SLA_CONFIG, ...JSON.parse(raw) };
  } catch { /* noop */ }
  return { ...DEFAULT_SLA_CONFIG };
}
export function saveSlaConfig(cfg: SlaConfig) {
  localStorage.setItem(CFG_KEY, JSON.stringify(cfg));
  window.dispatchEvent(new CustomEvent("sla:config"));
}

export function loadSlaAlerts(): SlaAlert[] {
  try { return JSON.parse(localStorage.getItem(LOG_KEY) || "[]"); } catch { return []; }
}
export function saveSlaAlerts(a: SlaAlert[]) {
  localStorage.setItem(LOG_KEY, JSON.stringify(a.slice(0, 300)));
  window.dispatchEvent(new CustomEvent("sla:alerts"));
}
export function onSlaAlertsChange(cb: () => void) {
  const h = () => cb();
  window.addEventListener("sla:alerts", h);
  return () => window.removeEventListener("sla:alerts", h);
}

export function ackSlaAlert(id: string, by: string) {
  const all = loadSlaAlerts().map(a =>
    a.id === id ? { ...a, acknowledged: true, ackedBy: by, ackedAt: new Date().toISOString() } : a,
  );
  saveSlaAlerts(all);
}
export function ackAll(by: string) {
  const all = loadSlaAlerts().map(a =>
    a.acknowledged ? a : { ...a, acknowledged: true, ackedBy: by, ackedAt: new Date().toISOString() },
  );
  saveSlaAlerts(all);
}
export function clearAckedAlerts() {
  saveSlaAlerts(loadSlaAlerts().filter(a => !a.acknowledged));
}

function loadLastFired(): Record<string, string> {
  try { return JSON.parse(localStorage.getItem(LAST_KEY) || "{}"); } catch { return {}; }
}
function saveLastFired(m: Record<string, string>) {
  localStorage.setItem(LAST_KEY, JSON.stringify(m));
}

export function classifySla(doc: QueueDoc, warnHours: number): SlaState {
  if (doc.status !== "uploaded") return "on_track";
  const diffH = (new Date(doc.slaDueAt).getTime() - Date.now()) / 3600_000;
  if (diffH < 0) return "overdue";
  if (diffH <= warnHours) return "nearing";
  return "on_track";
}

export function hoursDelta(doc: QueueDoc): number {
  return (new Date(doc.slaDueAt).getTime() - Date.now()) / 3600_000;
}

export interface ScanResult {
  fired: SlaAlert[];
  nearing: QueueDoc[];
  overdue: QueueDoc[];
}

/**
 * Scan the queue and emit new alerts respecting the re-alert cadence.
 * Returns freshly-fired alerts so caller can raise toasts / in-app messages.
 */
export function scanSla(queue: QueueDoc[], cfg: SlaConfig = loadSlaConfig()): ScanResult {
  const nearing: QueueDoc[] = [];
  const overdue: QueueDoc[] = [];
  const fired: SlaAlert[] = [];

  if (!cfg.enabled) return { fired, nearing, overdue };

  const last = loadLastFired();
  const now = Date.now();
  const nowIso = new Date().toISOString();
  const cadenceMs = Math.max(1, cfg.reAlertHours) * 3600_000;

  queue.forEach(d => {
    const state = classifySla(d, cfg.warnHours);
    if (state === "on_track") return;
    if (state === "nearing") nearing.push(d);
    if (state === "overdue") overdue.push(d);

    const key = `${d.id}:${state}`;
    const lastIso = last[key];
    const shouldFire = !lastIso || (state === "overdue" && now - new Date(lastIso).getTime() >= cadenceMs);
    if (!shouldFire) return;

    const alert: SlaAlert = {
      id: `SLA-${now}-${Math.random().toString(36).slice(2, 7)}`,
      docId: d.id,
      supplierId: d.supplierId,
      supplierName: d.supplierName,
      documentName: d.name,
      state,
      hoursDelta: Math.round(hoursDelta(d) * 10) / 10,
      firedAt: nowIso,
      acknowledged: false,
    };
    fired.push(alert);
    last[key] = nowIso;
  });

  if (fired.length) {
    saveLastFired(last);
    saveSlaAlerts([...fired, ...loadSlaAlerts()]);
  }
  return { fired, nearing, overdue };
}

export function slaSummary(queue: QueueDoc[], warnHours: number) {
  let nearing = 0, overdue = 0;
  queue.forEach(d => {
    const s = classifySla(d, warnHours);
    if (s === "nearing") nearing++;
    if (s === "overdue") overdue++;
  });
  const alerts = loadSlaAlerts();
  return {
    nearing, overdue,
    totalAlerts: alerts.length,
    unacked: alerts.filter(a => !a.acknowledged).length,
  };
}
