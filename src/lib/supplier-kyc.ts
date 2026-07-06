import type { QueueDoc } from "./reviewer";
import { DEFAULT_TRUST_SCORE, getSupplierFromStorage, saveSupplierToStorage } from "./mock-data";
import type { TrustScore } from "./types";

/**
 * Per-supplier KYC state, recomputed from the reviewer queue after every
 * approve / reject / needs_info / escalate decision. Trust scores are
 * refreshed in-place so downstream views (dashboard, storefront, matching)
 * pick up the change immediately via the `vyapar:kyc-updated` event.
 */

export type KycStatus =
  | "unverified"
  | "in_review"
  | "partially_verified"
  | "verified"
  | "rejected";

export interface SupplierKyc {
  supplierId: string;
  supplierName: string;
  status: KycStatus;
  verifiedDocs: number;
  rejectedDocs: number;
  pendingDocs: number;
  requiredTotal: number;
  requiredVerified: number;
  /** 0-100 aggregate document score */
  docScore: number;
  /** Adjustment applied to the trust score's `overall` (can be negative). */
  trustDelta: number;
  /** Refreshed overall trust score after applying the delta. */
  trustOverall: number;
  updatedAt: string;
}

const KYC_KEY = "vyapar_supplier_kyc_v1";
const EVENT = "vyapar:kyc-updated";

export function loadKycState(): Record<string, SupplierKyc> {
  try { return JSON.parse(localStorage.getItem(KYC_KEY) || "{}"); } catch { return {}; }
}

function saveKycState(state: Record<string, SupplierKyc>) {
  localStorage.setItem(KYC_KEY, JSON.stringify(state));
}

export function getSupplierKyc(supplierId: string): SupplierKyc | null {
  return loadKycState()[supplierId] ?? null;
}

function classify(v: number, requiredTotal: number, requiredVerified: number, rejected: number, pending: number): KycStatus {
  if (requiredTotal > 0 && requiredVerified >= requiredTotal && rejected === 0) return "verified";
  if (pending > 0) return "in_review";
  if (v > 0 && rejected === 0) return "partially_verified";
  if (v > 0 && rejected > 0) return "partially_verified";
  if (v === 0 && rejected > 0) return "rejected";
  return "unverified";
}

/**
 * Recompute KYC state for a supplier from the given queue snapshot and
 * persist. Also refreshes the trust score on the locally-cached supplier
 * profile when the id matches. Emits `vyapar:kyc-updated`.
 */
export function refreshSupplierKyc(
  supplierId: string,
  supplierName: string,
  queue: QueueDoc[],
): SupplierKyc {
  const docs = queue.filter(d => d.supplierId === supplierId);
  const verifiedDocs = docs.filter(d => d.status === "verified").length;
  const rejectedDocs = docs.filter(d => d.status === "rejected").length;
  const pendingDocs = docs.filter(d => d.status === "uploaded" || d.status === "pending").length;
  const requiredTotal = docs.filter(d => d.required).length;
  const requiredVerified = docs.filter(d => d.required && d.status === "verified").length;

  const totalWeight = docs.reduce((s, d) => s + d.weight, 0) || 1;
  const earnedWeight = docs.reduce((s, d) => s + (d.status === "verified" ? d.weight : 0), 0);
  const penaltyWeight = docs.reduce((s, d) => s + (d.status === "rejected" ? d.weight * 0.5 : 0), 0);
  const docScore = Math.max(0, Math.min(100, Math.round((earnedWeight / totalWeight) * 100)));

  // Trust delta: up to +150 for full doc score, minus rejection penalty (up to -75).
  const trustDelta = Math.round((docScore / 100) * 150 - (penaltyWeight / totalWeight) * 75);

  const status = classify(verifiedDocs, requiredTotal, requiredVerified, rejectedDocs, pendingDocs);

  const baseOverall = DEFAULT_TRUST_SCORE.overall;
  const trustOverall = Math.max(0, Math.min(1000, baseOverall + trustDelta));

  const record: SupplierKyc = {
    supplierId,
    supplierName,
    status,
    verifiedDocs,
    rejectedDocs,
    pendingDocs,
    requiredTotal,
    requiredVerified,
    docScore,
    trustDelta,
    trustOverall,
    updatedAt: new Date().toISOString(),
  };

  const state = loadKycState();
  state[supplierId] = record;
  saveKycState(state);

  // Mirror onto the locally-cached supplier profile when it matches — this is
  // what the SupplierDashboard renders via TrustScoreDisplay.
  try {
    const local = getSupplierFromStorage() as { supplierId?: string; trustScore?: TrustScore } | null;
    if (local && (local.supplierId === supplierId || !local.supplierId)) {
      const next = {
        ...local,
        trustScore: {
          ...(local.trustScore ?? DEFAULT_TRUST_SCORE),
          overall: trustOverall,
          compliance: Math.max(0, Math.min(100, (local.trustScore?.compliance ?? DEFAULT_TRUST_SCORE.compliance) + Math.round(trustDelta / 15))),
        },
        kycStatus: status,
      };
      saveSupplierToStorage(next);
    }
  } catch { /* noop */ }

  try {
    window.dispatchEvent(new CustomEvent(EVENT, { detail: record }));
  } catch { /* SSR/no-window */ }

  return record;
}

export function onKycUpdate(cb: (record: SupplierKyc) => void): () => void {
  const handler = (e: Event) => cb((e as CustomEvent<SupplierKyc>).detail);
  window.addEventListener(EVENT, handler);
  return () => window.removeEventListener(EVENT, handler);
}

export const KYC_STATUS_STYLE: Record<KycStatus, string> = {
  verified: "bg-success/15 text-success border-success/30",
  partially_verified: "bg-secondary/15 text-secondary border-secondary/30",
  in_review: "bg-primary/10 text-primary border-primary/20",
  rejected: "bg-destructive/15 text-destructive border-destructive/30",
  unverified: "bg-muted text-muted-foreground",
};

export const KYC_STATUS_LABEL: Record<KycStatus, string> = {
  verified: "KYC Verified",
  partially_verified: "Partially Verified",
  in_review: "In Review",
  rejected: "KYC Rejected",
  unverified: "Unverified",
};
