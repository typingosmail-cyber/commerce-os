import { DEFAULT_DOCS, type VerificationDoc, type DocStatus } from "./verification";

export type ReviewDecision = "approved" | "rejected" | "needs_info" | "escalated";

export interface ReasonCode {
  code: string;
  label: string;
  appliesTo: ReviewDecision[];
  severity: "info" | "warning" | "critical";
}

export const REASON_CODES: ReasonCode[] = [
  // Approvals
  { code: "AP-CLEAR", label: "All fields legible & cross-checked", appliesTo: ["approved"], severity: "info" },
  { code: "AP-MATCH", label: "Matches GSTN / MCA records", appliesTo: ["approved"], severity: "info" },
  { code: "AP-CERT", label: "Valid certifying authority", appliesTo: ["approved"], severity: "info" },

  // Rejections
  { code: "RJ-EXPIRED", label: "Document expired", appliesTo: ["rejected"], severity: "warning" },
  { code: "RJ-ILLEGIBLE", label: "Document unreadable / low quality", appliesTo: ["rejected", "needs_info"], severity: "warning" },
  { code: "RJ-MISMATCH", label: "Name / GSTIN mismatch with profile", appliesTo: ["rejected"], severity: "critical" },
  { code: "RJ-FORGED", label: "Suspected tampering / forgery", appliesTo: ["rejected", "escalated"], severity: "critical" },
  { code: "RJ-WRONG-DOC", label: "Wrong document type uploaded", appliesTo: ["rejected", "needs_info"], severity: "warning" },
  { code: "RJ-PARTIAL", label: "Pages missing or incomplete", appliesTo: ["rejected", "needs_info"], severity: "warning" },

  // Needs info
  { code: "NI-CLARIFY", label: "Need clarification from supplier", appliesTo: ["needs_info"], severity: "info" },
  { code: "NI-RECENT", label: "Need updated copy (≤ 3 months old)", appliesTo: ["needs_info"], severity: "info" },

  // Escalations
  { code: "ES-FRAUD", label: "Fraud signal — escalate to compliance", appliesTo: ["escalated"], severity: "critical" },
  { code: "ES-LEGAL", label: "Legal review required", appliesTo: ["escalated"], severity: "critical" },
];

export interface AuditEntry {
  id: string;
  timestamp: string;
  reviewerId: string;
  reviewerName: string;
  supplierId: string;
  documentId: string;
  documentName: string;
  decision: ReviewDecision;
  reasonCodes: string[];
  note: string;
  previousStatus: DocStatus;
  newStatus: DocStatus;
}

export interface QueueDoc extends VerificationDoc {
  supplierId: string;
  supplierName: string;
  supplierCity: string;
  submittedAt: string;
  slaDueAt: string;
  priority: "low" | "normal" | "high";
}

export interface ReviewerStats {
  pending: number;
  reviewedToday: number;
  approvedToday: number;
  rejectedToday: number;
  avgReviewMinutes: number;
  slaBreaches: number;
}

const STORAGE_KEY = "vyapar_reviewer_audit_v1";
const QUEUE_KEY = "vyapar_reviewer_queue_v1";

// --- Audit trail ---
export function loadAudit(): AuditEntry[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

export function saveAudit(entries: AuditEntry[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

export function appendAudit(entry: Omit<AuditEntry, "id" | "timestamp">): AuditEntry {
  const full: AuditEntry = {
    ...entry,
    id: `AUD-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    timestamp: new Date().toISOString(),
  };
  const all = loadAudit();
  all.unshift(full);
  saveAudit(all.slice(0, 500)); // cap
  return full;
}

export function auditForSupplier(supplierId: string): AuditEntry[] {
  return loadAudit().filter(e => e.supplierId === supplierId);
}

// --- Queue (mock generator + persistence) ---
const SUPPLIERS = [
  { id: "S-1042", name: "Shree Ganesh Fasteners", city: "Pune" },
  { id: "S-0871", name: "Mumbai Bolt Works", city: "Mumbai" },
  { id: "S-1198", name: "Pioneer Industrial Supplies", city: "Pune" },
  { id: "S-1305", name: "Quickfix Traders", city: "Mumbai" },
  { id: "S-0998", name: "Bharat Steel Components", city: "Pune" },
  { id: "S-1410", name: "Velocity Fasteners LLP", city: "Aurangabad" },
  { id: "S-1572", name: "Maharashtra Metal Mart", city: "Nagpur" },
  { id: "S-1611", name: "Sahyadri Industrial Co.", city: "Nashik" },
];

function generateQueue(): QueueDoc[] {
  const docs: QueueDoc[] = [];
  let counter = 0;
  SUPPLIERS.forEach((s, si) => {
    // Each supplier submits 2-4 documents
    const n = 2 + (si % 3);
    for (let i = 0; i < n; i++) {
      const tpl = DEFAULT_DOCS[(si + i) % DEFAULT_DOCS.length];
      const submittedHoursAgo = (si * 3 + i * 5 + 1);
      const submittedAt = new Date(Date.now() - submittedHoursAgo * 3600_000).toISOString();
      const slaDueAt = new Date(Date.now() + (24 - submittedHoursAgo) * 3600_000).toISOString();
      const priority: QueueDoc["priority"] =
        submittedHoursAgo > 20 ? "high" : submittedHoursAgo > 10 ? "normal" : "low";
      docs.push({
        ...tpl,
        id: `${tpl.id}-${s.id}-${counter++}`,
        status: "uploaded",
        fileName: `${tpl.id}_${s.id}.pdf`,
        uploadedAt: submittedAt,
        supplierId: s.id,
        supplierName: s.name,
        supplierCity: s.city,
        submittedAt,
        slaDueAt,
        priority,
      });
    }
  });
  return docs;
}

export function loadQueue(): QueueDoc[] {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* noop */ }
  const fresh = generateQueue();
  localStorage.setItem(QUEUE_KEY, JSON.stringify(fresh));
  return fresh;
}

export function saveQueue(q: QueueDoc[]) {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(q));
}

export function resetQueue(): QueueDoc[] {
  const fresh = generateQueue();
  saveQueue(fresh);
  return fresh;
}

export function decisionToStatus(decision: ReviewDecision, prev: DocStatus): DocStatus {
  if (decision === "approved") return "verified";
  if (decision === "rejected") return "rejected";
  if (decision === "escalated") return "rejected";
  return prev; // needs_info → leave as uploaded
}

export function computeStats(queue: QueueDoc[], audit: AuditEntry[]): ReviewerStats {
  const today = new Date().toDateString();
  const todays = audit.filter(a => new Date(a.timestamp).toDateString() === today);
  const approved = todays.filter(a => a.decision === "approved").length;
  const rejected = todays.filter(a => a.decision === "rejected" || a.decision === "escalated").length;
  const slaBreaches = queue.filter(q => q.status === "uploaded" && new Date(q.slaDueAt).getTime() < Date.now()).length;
  return {
    pending: queue.filter(q => q.status === "uploaded").length,
    reviewedToday: todays.length,
    approvedToday: approved,
    rejectedToday: rejected,
    avgReviewMinutes: todays.length ? 8 + Math.round(Math.random() * 6) : 0,
    slaBreaches,
  };
}

export const DECISION_STYLE: Record<ReviewDecision, string> = {
  approved: "bg-success/15 text-success border-success/30",
  rejected: "bg-destructive/15 text-destructive border-destructive/30",
  needs_info: "bg-yellow-500/15 text-yellow-700 border-yellow-500/30",
  escalated: "bg-orange-500/15 text-orange-700 border-orange-500/30",
};

export const PRIORITY_STYLE: Record<QueueDoc["priority"], string> = {
  high: "bg-destructive/15 text-destructive border-destructive/30",
  normal: "bg-primary/10 text-primary border-primary/20",
  low: "bg-muted text-muted-foreground",
};

export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.round(diff / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

export function timeUntil(iso: string): string {
  const diff = new Date(iso).getTime() - Date.now();
  if (diff < 0) return "OVERDUE";
  const h = Math.round(diff / 3600000);
  if (h < 24) return `${h}h left`;
  return `${Math.round(h / 24)}d left`;
}
