// Mock email outbox — frontend prototype.
// Persists "sent" emails to localStorage and broadcasts a custom event
// so any open Reviewer Console can refresh its Outbox tab live.

export type MockEmailKind = "approved" | "rejected" | "needs_info" | "escalated";

export interface MockEmail {
  id: string;
  to: string;
  toName: string;
  subject: string;
  body: string;
  kind: MockEmailKind;
  documentName: string;
  supplierId: string;
  sentAt: string;
  reviewerName: string;
  status: "sent" | "queued" | "failed";
}

const STORAGE_KEY = "vyapar_email_outbox_v1";
const EVENT = "vyapar:email-sent";

export function loadOutbox(): MockEmail[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); }
  catch { return []; }
}

function saveOutbox(o: MockEmail[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(o.slice(0, 200)));
  window.dispatchEvent(new CustomEvent(EVENT));
}

export function onOutboxChange(cb: () => void): () => void {
  const handler = () => cb();
  window.addEventListener(EVENT, handler);
  return () => window.removeEventListener(EVENT, handler);
}

const SUBJECT_PREFIX: Record<MockEmailKind, string> = {
  approved: "✅ Your document has been approved",
  rejected: "❌ Your document was rejected",
  needs_info: "ℹ️ More information needed on your document",
  escalated: "⚠️ Your document has been escalated to compliance",
};

interface ComposeArgs {
  kind: MockEmailKind;
  to: string;
  toName: string;
  supplierId: string;
  documentName: string;
  reasonCodes: string[];
  reasonLabels: string[];
  note: string;
  reviewerName: string;
}

function bodyFor(a: ComposeArgs): string {
  const reasons = a.reasonLabels.length
    ? `\n\nReason${a.reasonLabels.length > 1 ? "s" : ""}:\n${a.reasonLabels.map((l, i) => `  • ${l} [${a.reasonCodes[i]}]`).join("\n")}`
    : "";
  const noteBlock = a.note ? `\n\nReviewer note:\n"${a.note}"` : "";
  const cta = a.kind === "approved"
    ? "No further action is required. Your document is now verified."
    : a.kind === "rejected"
      ? "Please review the reasons below and resubmit a corrected document from your supplier dashboard."
      : a.kind === "needs_info"
        ? "Please reply to this email or upload the requested information from your supplier dashboard."
        : "Our compliance team will contact you within 24 hours.";

  return `Hello ${a.toName},

Your submitted document "${a.documentName}" (Supplier ID: ${a.supplierId}) has been reviewed.

Decision: ${a.kind.replace("_", " ").toUpperCase()}${reasons}${noteBlock}

${cta}

— Vyapar OS Compliance · Reviewed by ${a.reviewerName}
This is a transactional notification from Vyapar OS.`;
}

export function sendMockEmail(a: ComposeArgs): MockEmail {
  const email: MockEmail = {
    id: `EM-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    to: a.to,
    toName: a.toName,
    subject: SUBJECT_PREFIX[a.kind],
    body: bodyFor(a),
    kind: a.kind,
    documentName: a.documentName,
    supplierId: a.supplierId,
    sentAt: new Date().toISOString(),
    reviewerName: a.reviewerName,
    status: Math.random() < 0.03 ? "failed" : "sent", // tiny realistic failure rate
  };
  const all = loadOutbox();
  all.unshift(email);
  saveOutbox(all);
  return email;
}

// Deterministic mock contact for a supplier id (prototype only).
export function supplierContactFor(supplierId: string, supplierName: string): { email: string; name: string } {
  const slug = supplierName.toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 14) || "supplier";
  return {
    email: `accounts@${slug}.in`,
    name: supplierName,
  };
}
