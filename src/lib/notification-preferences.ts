// Submitter-side notification preference controls.
// Frontend-only: persisted to localStorage. Per document type × channel × frequency.
import { DEFAULT_DOCS } from "./verification";

export type NotifChannel = "email" | "inApp";
export type NotifFrequency = "instant" | "daily" | "weekly" | "off";
export type ReviewDecisionKind = "approved" | "rejected" | "needs_info";

export interface ChannelPref {
  frequency: NotifFrequency;
  // Which decision kinds trigger this channel. Approvals are often noisy;
  // rejections/needs_info are usually always-on.
  kinds: Record<ReviewDecisionKind, boolean>;
}

export interface DocTypePref {
  email: ChannelPref;
  inApp: ChannelPref;
}

export interface NotificationPreferences {
  // "__default__" applies to every doc type unless overridden by its id.
  perDocType: Record<string, DocTypePref>;
  // Global quiet hours (24h, local): messages inside range are queued to next window.
  quietHoursEnabled: boolean;
  quietFrom: number; // 0-23
  quietTo: number;   // 0-23
  updatedAt: string;
}

const PREFS_KEY = "vyapar_notif_prefs_v1";
const DIGEST_KEY = "vyapar_notif_digest_queue_v1";
const EVENT = "vyapar:notif-prefs-changed";
const DIGEST_EVENT = "vyapar:notif-digest-changed";

export const DEFAULT_DOC_TYPE_PREF: DocTypePref = {
  email: {
    frequency: "instant",
    kinds: { approved: true, rejected: true, needs_info: true },
  },
  inApp: {
    frequency: "instant",
    kinds: { approved: true, rejected: true, needs_info: true },
  },
};

const DEFAULT_PREFS: NotificationPreferences = {
  perDocType: { __default__: DEFAULT_DOC_TYPE_PREF },
  quietHoursEnabled: false,
  quietFrom: 22,
  quietTo: 7,
  updatedAt: new Date().toISOString(),
};

export function loadPrefs(): NotificationPreferences {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return DEFAULT_PREFS;
    const parsed = JSON.parse(raw) as NotificationPreferences;
    // Ensure __default__ exists
    if (!parsed.perDocType.__default__) parsed.perDocType.__default__ = DEFAULT_DOC_TYPE_PREF;
    return parsed;
  } catch { return DEFAULT_PREFS; }
}

export function savePrefs(p: NotificationPreferences) {
  const next = { ...p, updatedAt: new Date().toISOString() };
  localStorage.setItem(PREFS_KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent(EVENT));
}

export function onPrefsChange(cb: () => void): () => void {
  const h = () => cb();
  window.addEventListener(EVENT, h);
  return () => window.removeEventListener(EVENT, h);
}

export function resetPrefs(): NotificationPreferences {
  localStorage.removeItem(PREFS_KEY);
  window.dispatchEvent(new CustomEvent(EVENT));
  return DEFAULT_PREFS;
}

export function getPrefForDoc(prefs: NotificationPreferences, docTypeId: string): DocTypePref {
  return prefs.perDocType[docTypeId] ?? prefs.perDocType.__default__ ?? DEFAULT_DOC_TYPE_PREF;
}

function inQuietHours(p: NotificationPreferences, now = new Date()): boolean {
  if (!p.quietHoursEnabled) return false;
  const h = now.getHours();
  const { quietFrom: f, quietTo: t } = p;
  return f <= t ? h >= f && h < t : h >= f || h < t;
}

export type DispatchMode = "send" | "digest" | "off";

export interface DispatchDecision {
  email: DispatchMode;
  inApp: DispatchMode;
  reason: string;
}

export function decideDispatch(
  prefs: NotificationPreferences,
  docTypeId: string,
  decisionKind: ReviewDecisionKind,
): DispatchDecision {
  const p = getPrefForDoc(prefs, docTypeId);
  const quiet = inQuietHours(prefs);
  const resolve = (c: ChannelPref): DispatchMode => {
    if (!c.kinds[decisionKind]) return "off";
    if (c.frequency === "off") return "off";
    if (c.frequency === "instant") return quiet ? "digest" : "send";
    return "digest"; // daily/weekly
  };
  return {
    email: resolve(p.email),
    inApp: resolve(p.inApp),
    reason: quiet ? "Quiet hours active — instant messages deferred to digest" : "Per submitter preferences",
  };
}

// ---------- Digest queue ----------

export interface DigestItem {
  id: string;
  createdAt: string;
  channel: NotifChannel;
  supplierId: string;
  supplierName: string;
  submitterEmail: string;
  documentTypeId: string;
  documentName: string;
  decision: ReviewDecisionKind;
  reasonLabels: string[];
  note: string;
  reviewerName: string;
  frequency: NotifFrequency;
}

export function loadDigestQueue(): DigestItem[] {
  try { return JSON.parse(localStorage.getItem(DIGEST_KEY) || "[]"); }
  catch { return []; }
}
function saveDigestQueue(q: DigestItem[]) {
  localStorage.setItem(DIGEST_KEY, JSON.stringify(q.slice(0, 500)));
  window.dispatchEvent(new CustomEvent(DIGEST_EVENT));
}
export function onDigestChange(cb: () => void): () => void {
  const h = () => cb();
  window.addEventListener(DIGEST_EVENT, h);
  return () => window.removeEventListener(DIGEST_EVENT, h);
}
export function enqueueDigest(item: Omit<DigestItem, "id" | "createdAt">): DigestItem {
  const rec: DigestItem = {
    ...item,
    id: `DG-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    createdAt: new Date().toISOString(),
  };
  const q = loadDigestQueue();
  q.unshift(rec);
  saveDigestQueue(q);
  return rec;
}
export function clearDigestQueue() {
  localStorage.removeItem(DIGEST_KEY);
  window.dispatchEvent(new CustomEvent(DIGEST_EVENT));
}
export function flushDigestFor(channel: NotifChannel): DigestItem[] {
  const q = loadDigestQueue();
  const flushed = q.filter(i => i.channel === channel);
  const remaining = q.filter(i => i.channel !== channel);
  saveDigestQueue(remaining);
  return flushed;
}

// Document type catalogue (for UI list)
export const DOC_TYPE_OPTIONS = DEFAULT_DOCS.map(d => ({ id: d.id, name: d.name }));

export const FREQ_LABEL: Record<NotifFrequency, string> = {
  instant: "Instant",
  daily: "Daily digest",
  weekly: "Weekly digest",
  off: "Off",
};
