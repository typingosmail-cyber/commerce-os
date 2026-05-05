// Fraud Case Workflow — frontend prototype (localStorage)
// Open → Assign → Investigate (notes + doc requests) → Resolve / Escalate

import { getMockCases, getMockRiskProfiles, type FraudCase, type SupplierRiskProfile } from "./fraud-detection";

export type CaseStatus = "open" | "investigating" | "awaiting_docs" | "escalated" | "resolved";
export type Resolution =
  | "false_positive"
  | "warning_issued"
  | "limits_reduced"
  | "suspended"
  | "blacklisted"
  | "escalated_to_legal";

export type EventType =
  | "opened"
  | "assigned"
  | "status_changed"
  | "note_added"
  | "doc_requested"
  | "doc_received"
  | "doc_approved"
  | "doc_rejected"
  | "escalated"
  | "resolved"
  | "reopened";

export interface CaseNote {
  id: string;
  author: string;
  text: string;
  createdAt: string;
  pinned?: boolean;
}

export type DocStatus = "pending" | "received" | "approved" | "rejected";

export interface DocRequest {
  id: string;
  docType: string;
  reason: string;
  requestedBy: string;
  requestedAt: string;
  dueDate: string;
  status: DocStatus;
  receivedAt?: string;
  reviewerNote?: string;
}

export interface CaseEvent {
  id: string;
  type: EventType;
  actor: string;
  at: string;
  detail: string;
}

export interface CaseRecord extends FraudCase {
  status: CaseStatus;
  priority: "low" | "medium" | "high" | "critical";
  notesList: CaseNote[];
  docs: DocRequest[];
  events: CaseEvent[];
  resolution?: Resolution;
  resolutionNote?: string;
  closedAt?: string;
  escalationReason?: string;
  escalatedTo?: string;
  updatedAt: string;
}

export const REVIEWERS = [
  "Unassigned",
  "R. Sharma (Compliance)",
  "P. Iyer (Risk Ops)",
  "A. Khan (Senior Reviewer)",
  "S. Mehta (Underwriting)",
  "K. Patel (Legal Liaison)",
];

export const ESCALATION_TARGETS = [
  "Compliance Head",
  "Legal — External Counsel",
  "Law Enforcement Liaison",
  "Cyber-Crime Cell",
  "Banking Partner Risk Desk",
];

export const COMMON_DOCS = [
  "Updated GST Certificate",
  "PAN Card",
  "Cancelled Cheque / Bank Statement (last 3 months)",
  "Udyam / MSME Registration",
  "Business Address Proof (Electricity bill / Lease)",
  "Director KYC (Aadhaar + PAN)",
  "Audited Financials (last FY)",
  "Factory / Warehouse Photos",
  "Original Invoice for disputed shipment",
  "Beneficial Ownership Declaration",
];

export const RESOLUTION_LABEL: Record<Resolution, string> = {
  false_positive: "False positive — cleared",
  warning_issued: "Warning issued",
  limits_reduced: "Credit & order limits reduced",
  suspended: "Listings suspended",
  blacklisted: "Permanently blacklisted",
  escalated_to_legal: "Escalated to legal action",
};

export const STATUS_LABEL: Record<CaseStatus, string> = {
  open: "Open",
  investigating: "Investigating",
  awaiting_docs: "Awaiting Documents",
  escalated: "Escalated",
  resolved: "Resolved",
};

const STORE_KEY = "vyapar_fraud_cases_v1";
const ACTOR_KEY = "vyapar_fraud_actor";

export function currentActor(): string {
  try {
    return localStorage.getItem(ACTOR_KEY) || "R. Sharma (Compliance)";
  } catch {
    return "R. Sharma (Compliance)";
  }
}
export function setCurrentActor(name: string) {
  try { localStorage.setItem(ACTOR_KEY, name); } catch { /* noop */ }
}

function uid(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

function priorityFromProfile(p: SupplierRiskProfile | undefined): CaseRecord["priority"] {
  if (!p) return "medium";
  if (p.riskLevel === "critical") return "critical";
  if (p.riskLevel === "high") return "high";
  if (p.riskLevel === "medium") return "medium";
  return "low";
}

function seedCases(): CaseRecord[] {
  const profiles = getMockRiskProfiles();
  const base = getMockCases(profiles);
  const profileMap = new Map(profiles.map((p) => [p.supplierId, p]));
  return base.map<CaseRecord>((c, i) => {
    const profile = profileMap.get(c.supplierId);
    const status: CaseStatus = c.status === "open" ? "open"
      : c.status === "resolved" ? "resolved"
      : c.status === "escalated" ? "escalated"
      : "investigating";
    const opened = c.openedAt;
    const events: CaseEvent[] = [
      { id: uid("ev"), type: "opened", actor: "System (Auto-flag)", at: opened,
        detail: `Auto-opened from signal: ${c.primarySignal}` },
    ];
    if (c.assignee) {
      events.push({
        id: uid("ev"), type: "assigned", actor: "S. Mehta (Underwriting)",
        at: new Date(new Date(opened).getTime() + 3600_000).toISOString(),
        detail: `Assigned to ${c.assignee}`,
      });
    }
    const docs: DocRequest[] = i % 2 === 0 ? [{
      id: uid("doc"),
      docType: "Updated GST Certificate",
      reason: "GST registration changed twice in last 12 months",
      requestedBy: c.assignee, requestedAt: opened,
      dueDate: new Date(new Date(opened).getTime() + 5 * 86400000).toISOString(),
      status: "pending",
    }] : [];
    const notesList: CaseNote[] = i % 3 === 0 ? [{
      id: uid("nt"), author: c.assignee,
      text: "Bank statement shows unusual round-trip transactions on 3 dates. Need clarification before clearing.",
      createdAt: new Date(new Date(opened).getTime() + 7200_000).toISOString(),
      pinned: true,
    }] : [];
    return {
      ...c,
      status,
      priority: priorityFromProfile(profile),
      notesList,
      docs,
      events,
      updatedAt: opened,
    };
  });
}

function load(): CaseRecord[] {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) {
      const seeded = seedCases();
      localStorage.setItem(STORE_KEY, JSON.stringify(seeded));
      return seeded;
    }
    return JSON.parse(raw) as CaseRecord[];
  } catch {
    return seedCases();
  }
}

function save(list: CaseRecord[]) {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(list)); } catch { /* noop */ }
}

export function listCases(): CaseRecord[] {
  return load().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function getCase(id: string): CaseRecord | undefined {
  return load().find((c) => c.id === id);
}

function update(id: string, mutator: (c: CaseRecord) => void): CaseRecord | undefined {
  const list = load();
  const idx = list.findIndex((c) => c.id === id);
  if (idx === -1) return undefined;
  const draft = { ...list[idx] };
  mutator(draft);
  draft.updatedAt = new Date().toISOString();
  draft.notes = draft.notesList.length;
  list[idx] = draft;
  save(list);
  return draft;
}

function logEvent(c: CaseRecord, type: EventType, detail: string, actor = currentActor()) {
  c.events.unshift({ id: uid("ev"), type, actor, at: new Date().toISOString(), detail });
}

export function openCaseFromSupplier(p: SupplierRiskProfile, primarySignal?: string): CaseRecord {
  const list = load();
  const existing = list.find((c) => c.supplierId === p.supplierId && c.status !== "resolved");
  if (existing) return existing;
  const now = new Date().toISOString();
  const next: CaseRecord = {
    id: `FC-${3000 + list.length}`,
    supplierId: p.supplierId,
    supplierName: p.supplierName,
    openedAt: now,
    updatedAt: now,
    status: "open",
    priority: priorityFromProfile(p),
    primarySignal: primarySignal ?? p.signals[0]?.label ?? "Manual review",
    assignee: "Unassigned",
    notes: 0,
    notesList: [],
    docs: [],
    events: [{
      id: uid("ev"), type: "opened", actor: currentActor(), at: now,
      detail: `Case opened manually for signal: ${primarySignal ?? p.signals[0]?.label ?? "Manual review"}`,
    }],
  };
  list.unshift(next);
  save(list);
  return next;
}

export function assignCase(id: string, assignee: string): CaseRecord | undefined {
  return update(id, (c) => {
    const prev = c.assignee;
    c.assignee = assignee;
    if (c.status === "open" && assignee !== "Unassigned") c.status = "investigating";
    logEvent(c, "assigned", `Reassigned: ${prev} → ${assignee}`);
  });
}

export function changeStatus(id: string, status: CaseStatus, reason?: string): CaseRecord | undefined {
  return update(id, (c) => {
    const prev = c.status;
    c.status = status;
    logEvent(c, "status_changed", `Status: ${STATUS_LABEL[prev]} → ${STATUS_LABEL[status]}${reason ? ` — ${reason}` : ""}`);
  });
}

export function addNote(id: string, text: string, opts: { pinned?: boolean } = {}): CaseRecord | undefined {
  if (!text.trim()) return getCase(id);
  return update(id, (c) => {
    c.notesList.unshift({
      id: uid("nt"), author: currentActor(), text: text.trim(),
      createdAt: new Date().toISOString(), pinned: !!opts.pinned,
    });
    if (c.status === "open") c.status = "investigating";
    logEvent(c, "note_added", `Added investigation note (${text.trim().slice(0, 60)}${text.length > 60 ? "…" : ""})`);
  });
}

export function deleteNote(id: string, noteId: string): CaseRecord | undefined {
  return update(id, (c) => {
    c.notesList = c.notesList.filter((n) => n.id !== noteId);
  });
}

export function requestDoc(id: string, input: { docType: string; reason: string; dueInDays: number }): CaseRecord | undefined {
  return update(id, (c) => {
    const now = new Date();
    c.docs.unshift({
      id: uid("doc"),
      docType: input.docType,
      reason: input.reason,
      requestedBy: currentActor(),
      requestedAt: now.toISOString(),
      dueDate: new Date(now.getTime() + input.dueInDays * 86400000).toISOString(),
      status: "pending",
    });
    if (c.status === "open" || c.status === "investigating") c.status = "awaiting_docs";
    logEvent(c, "doc_requested", `Requested "${input.docType}" — due in ${input.dueInDays}d`);
  });
}

export function setDocStatus(id: string, docId: string, status: DocStatus, reviewerNote?: string): CaseRecord | undefined {
  return update(id, (c) => {
    const d = c.docs.find((x) => x.id === docId);
    if (!d) return;
    const prev = d.status;
    d.status = status;
    if (status === "received" && !d.receivedAt) d.receivedAt = new Date().toISOString();
    if (reviewerNote) d.reviewerNote = reviewerNote;
    const evType: EventType = status === "received" ? "doc_received" : status === "approved" ? "doc_approved" : status === "rejected" ? "doc_rejected" : "status_changed";
    logEvent(c, evType, `Doc "${d.docType}": ${prev} → ${status}${reviewerNote ? ` — ${reviewerNote}` : ""}`);
    // If all docs decided, move out of awaiting_docs
    if (c.status === "awaiting_docs" && c.docs.every((x) => x.status === "approved" || x.status === "rejected")) {
      c.status = "investigating";
      logEvent(c, "status_changed", `All requested documents reviewed — back to investigation`);
    }
  });
}

export function escalateCase(id: string, target: string, reason: string): CaseRecord | undefined {
  return update(id, (c) => {
    c.status = "escalated";
    c.escalatedTo = target;
    c.escalationReason = reason;
    logEvent(c, "escalated", `Escalated to ${target} — ${reason}`);
  });
}

export function resolveCase(id: string, resolution: Resolution, note: string): CaseRecord | undefined {
  return update(id, (c) => {
    c.status = "resolved";
    c.resolution = resolution;
    c.resolutionNote = note;
    c.closedAt = new Date().toISOString();
    logEvent(c, "resolved", `${RESOLUTION_LABEL[resolution]}${note ? ` — ${note}` : ""}`);
  });
}

export function reopenCase(id: string, reason: string): CaseRecord | undefined {
  return update(id, (c) => {
    c.status = "investigating";
    c.resolution = undefined;
    c.resolutionNote = undefined;
    c.closedAt = undefined;
    logEvent(c, "reopened", `Reopened — ${reason}`);
  });
}

export const STATUS_STYLE_V2: Record<CaseStatus, string> = {
  open: "bg-destructive/15 text-destructive border-destructive/30",
  investigating: "bg-yellow-500/15 text-yellow-700 border-yellow-500/30",
  awaiting_docs: "bg-blue-500/15 text-blue-700 border-blue-500/30",
  escalated: "bg-orange-500/15 text-orange-700 border-orange-500/30",
  resolved: "bg-success/15 text-success border-success/30",
};

export const PRIORITY_STYLE: Record<CaseRecord["priority"], string> = {
  low: "bg-muted text-muted-foreground border-border",
  medium: "bg-yellow-500/10 text-yellow-700 border-yellow-500/30",
  high: "bg-orange-500/10 text-orange-700 border-orange-500/30",
  critical: "bg-destructive/15 text-destructive border-destructive/30",
};
