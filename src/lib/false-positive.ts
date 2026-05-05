// False-positive flow — frontend prototype (localStorage)
// Lets reviewers mark a supplier risk finding as incorrect with reasons + evidence,
// suppress specific signals (or all), and recalibrate the composite risk score.

import {
  buildRiskProfile, getMockRiskProfiles,
  type SupplierRiskProfile, type RiskLevel, type FraudSignal,
} from "./fraud-detection";

export type FPReasonCode =
  | "verified_kyc_offline"
  | "signal_misclassified"
  | "data_pipeline_error"
  | "duplicate_alert"
  | "legitimate_business_pattern"
  | "test_or_internal_account"
  | "supplier_provided_proof"
  | "third_party_verification"
  | "manual_override";

export interface FPReason {
  code: FPReasonCode;
  label: string;
  description: string;
  /** how strongly this reason discounts the suppressed signal weight (0-1) */
  confidence: number;
}

export const FP_REASONS: FPReason[] = [
  { code: "verified_kyc_offline", label: "KYC verified offline",
    description: "Reviewer physically verified GST/PAN/address — signal is stale.", confidence: 1.0 },
  { code: "supplier_provided_proof", label: "Supplier provided proof",
    description: "Supplier submitted authentic documents that contradict the signal.", confidence: 0.9 },
  { code: "third_party_verification", label: "Third-party verification",
    description: "Bank, GSTN or auditor confirmed the supplier's legitimacy.", confidence: 1.0 },
  { code: "signal_misclassified", label: "Signal misclassified by model",
    description: "Behavior matches a known-good pattern; model needs retraining.", confidence: 0.8 },
  { code: "data_pipeline_error", label: "Data pipeline error",
    description: "Source data was corrupted, duplicated, or stale at evaluation time.", confidence: 1.0 },
  { code: "duplicate_alert", label: "Duplicate of prior cleared alert",
    description: "Same condition was already cleared in a previous review cycle.", confidence: 0.95 },
  { code: "legitimate_business_pattern", label: "Legitimate business pattern",
    description: "Velocity / refund pattern is normal for this category & season.", confidence: 0.7 },
  { code: "test_or_internal_account", label: "Test / internal account",
    description: "Account is used by ops/QA — should be excluded from monitoring.", confidence: 1.0 },
  { code: "manual_override", label: "Manual override (other)",
    description: "Reviewer judgment — see attached note for justification.", confidence: 0.6 },
];

export type EvidenceType =
  | "document"
  | "screenshot"
  | "external_letter"
  | "url_reference"
  | "internal_ticket"
  | "phone_verification"
  | "site_visit_report";

export interface Evidence {
  id: string;
  type: EvidenceType;
  label: string;
  reference: string;       // file name, URL, or ticket id
  collectedBy: string;
  collectedAt: string;
  note?: string;
}

export const EVIDENCE_LABEL: Record<EvidenceType, string> = {
  document: "Verification document",
  screenshot: "Screenshot",
  external_letter: "External letter / email",
  url_reference: "URL reference",
  internal_ticket: "Internal ticket",
  phone_verification: "Phone verification log",
  site_visit_report: "Site visit report",
};

export interface RecalibrationResult {
  scoreBefore: number;
  scoreAfter: number;
  delta: number;            // negative number (score reduction)
  levelBefore: RiskLevel;
  levelAfter: RiskLevel;
  suppressedWeight: number; // sum of weights removed
  suppressedSignalIds: string[];
  remainingSignals: number;
}

export interface FalsePositiveRecord {
  id: string;
  supplierId: string;
  supplierName: string;
  reasons: FPReasonCode[];
  reasonNote: string;
  evidence: Evidence[];
  suppressedSignalIds: string[];   // [] = suppress entire finding
  recalibration: RecalibrationResult;
  reviewer: string;
  reviewerRole: string;
  createdAt: string;
  // lifecycle
  status: "active" | "reverted";
  revertedAt?: string;
  revertReason?: string;
  // link back if originated from a case
  caseId?: string;
}

const STORE_KEY = "vyapar_false_positives_v1";

function uid(p: string) {
  return `${p}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

function load(): FalsePositiveRecord[] {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function save(list: FalsePositiveRecord[]) {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(list)); } catch { /* noop */ }
}

function levelFromScore(score: number): RiskLevel {
  if (score >= 75) return "critical";
  if (score >= 55) return "high";
  if (score >= 30) return "medium";
  return "low";
}

function actionFor(level: RiskLevel): string {
  switch (level) {
    case "critical": return "Suspend listings & escalate to compliance";
    case "high": return "Hold escrow releases; request fresh KYC";
    case "medium": return "Monitor; require additional documentation";
    default: return "No action — routine monitoring";
  }
}

/** Compute the recalibration that *would* result without persisting. */
export function previewRecalibration(
  profile: SupplierRiskProfile,
  suppressedSignalIds: string[],
  reasonCodes: FPReasonCode[],
): RecalibrationResult {
  const ids = suppressedSignalIds.length === 0
    ? profile.signals.map((s) => s.id)
    : suppressedSignalIds;
  const targets = profile.signals.filter((s) => ids.includes(s.id));

  // average confidence across selected reasons (default 0.7)
  const conf = reasonCodes.length === 0
    ? 0.7
    : reasonCodes.reduce((s, c) => s + (FP_REASONS.find((r) => r.code === c)?.confidence ?? 0.7), 0) / reasonCodes.length;

  const suppressedWeight = Math.round(targets.reduce((s, t) => s + t.weight, 0) * conf);
  const scoreAfter = Math.max(0, profile.riskScore - suppressedWeight);
  return {
    scoreBefore: profile.riskScore,
    scoreAfter,
    delta: scoreAfter - profile.riskScore,
    levelBefore: profile.riskLevel,
    levelAfter: levelFromScore(scoreAfter),
    suppressedWeight,
    suppressedSignalIds: ids,
    remainingSignals: profile.signals.length - targets.length,
  };
}

export interface MarkFPInput {
  reasons: FPReasonCode[];
  reasonNote: string;
  evidence: Omit<Evidence, "id" | "collectedAt">[];
  suppressedSignalIds: string[];
  reviewer: string;
  reviewerRole: string;
  caseId?: string;
}

export function markFalsePositive(
  profile: SupplierRiskProfile,
  input: MarkFPInput,
): FalsePositiveRecord {
  const recalibration = previewRecalibration(profile, input.suppressedSignalIds, input.reasons);
  const now = new Date().toISOString();
  const record: FalsePositiveRecord = {
    id: uid("fp"),
    supplierId: profile.supplierId,
    supplierName: profile.supplierName,
    reasons: input.reasons,
    reasonNote: input.reasonNote.trim(),
    evidence: input.evidence.map((e) => ({
      ...e,
      id: uid("ev"),
      collectedAt: now,
    })),
    suppressedSignalIds: recalibration.suppressedSignalIds,
    recalibration,
    reviewer: input.reviewer,
    reviewerRole: input.reviewerRole,
    createdAt: now,
    status: "active",
    caseId: input.caseId,
  };
  const list = load();
  list.unshift(record);
  save(list);
  return record;
}

export function revertFalsePositive(id: string, reason: string): FalsePositiveRecord | undefined {
  const list = load();
  const idx = list.findIndex((r) => r.id === id);
  if (idx === -1) return undefined;
  list[idx] = { ...list[idx], status: "reverted", revertedAt: new Date().toISOString(), revertReason: reason };
  save(list);
  return list[idx];
}

export function getFalsePositiveHistory(supplierId: string): FalsePositiveRecord[] {
  return load()
    .filter((r) => r.supplierId === supplierId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function getAllFalsePositives(): FalsePositiveRecord[] {
  return load().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** Build a map of supplierId → aggregate suppression to apply on top of base profiles. */
function buildSuppressionMap(): Map<string, { ids: Set<string>; weight: number; recordIds: string[] }> {
  const map = new Map<string, { ids: Set<string>; weight: number; recordIds: string[] }>();
  for (const rec of load()) {
    if (rec.status !== "active") continue;
    const cur = map.get(rec.supplierId) ?? { ids: new Set<string>(), weight: 0, recordIds: [] };
    rec.suppressedSignalIds.forEach((id) => cur.ids.add(id));
    cur.weight += rec.recalibration.suppressedWeight;
    cur.recordIds.push(rec.id);
    map.set(rec.supplierId, cur);
  }
  return map;
}

/** Apply all active false-positive suppressions to a list of profiles. */
export function applyFalsePositiveOverlay(profiles: SupplierRiskProfile[]): SupplierRiskProfile[] {
  const map = buildSuppressionMap();
  return profiles.map((p) => {
    const sup = map.get(p.supplierId);
    if (!sup) return p;
    const remainingSignals = p.signals.filter((s) => !sup.ids.has(s.id));
    const newScore = Math.max(0, p.riskScore - sup.weight);
    const newLevel = levelFromScore(newScore);
    return {
      ...p,
      signals: remainingSignals,
      riskScore: newScore,
      riskLevel: newLevel,
      recommendedAction: actionFor(newLevel),
    };
  });
}

export function getRecalibratedProfiles(): SupplierRiskProfile[] {
  return applyFalsePositiveOverlay(getMockRiskProfiles());
}

export const REASON_LABEL: Record<FPReasonCode, string> = Object.fromEntries(
  FP_REASONS.map((r) => [r.code, r.label]),
) as Record<FPReasonCode, string>;
