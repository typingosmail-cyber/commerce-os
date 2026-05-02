export type RiskLevel = "low" | "medium" | "high" | "critical";

export interface FraudSignal {
  id: string;
  label: string;
  detail: string;
  weight: number; // 0-100 contribution to score
  severity: RiskLevel;
  category: "documents" | "gst" | "transactions" | "behavior" | "network";
}

export interface SupplierRiskProfile {
  supplierId: string;
  supplierName: string;
  city: string;
  category: string;
  joinedDays: number;
  gstin: string;
  // raw metrics
  docSimilarityScore: number; // 0-100, higher = more similar to other suppliers (suspicious)
  gstChangesLast12m: number;
  addressChangesLast12m: number;
  txAnomalyScore: number; // 0-100
  refundRate: number; // 0-1
  disputeRate: number; // 0-1
  cancelledOrderRate: number; // 0-1
  avgOrderValue: number;
  velocitySpike: number; // multiplier vs baseline
  ipDeviceClusters: number; // shared device/IP clusters with other accounts
  signals: FraudSignal[];
  riskScore: number; // 0-100
  riskLevel: RiskLevel;
  recommendedAction: string;
  lastReviewed: string;
}

export interface FraudCase {
  id: string;
  supplierId: string;
  supplierName: string;
  openedAt: string;
  status: "open" | "investigating" | "resolved" | "escalated";
  primarySignal: string;
  assignee: string;
  notes: number;
}

export const RISK_COLOR: Record<RiskLevel, string> = {
  low: "bg-success/15 text-success border-success/30",
  medium: "bg-yellow-500/15 text-yellow-700 border-yellow-500/30",
  high: "bg-orange-500/15 text-orange-700 border-orange-500/30",
  critical: "bg-destructive/15 text-destructive border-destructive/30",
};

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

interface RawInput {
  supplierId: string;
  supplierName: string;
  city: string;
  category: string;
  joinedDays: number;
  gstin: string;
  docSimilarityScore: number;
  gstChangesLast12m: number;
  addressChangesLast12m: number;
  txAnomalyScore: number;
  refundRate: number;
  disputeRate: number;
  cancelledOrderRate: number;
  avgOrderValue: number;
  velocitySpike: number;
  ipDeviceClusters: number;
}

export function buildRiskProfile(r: RawInput): SupplierRiskProfile {
  const signals: FraudSignal[] = [];

  if (r.docSimilarityScore >= 70) {
    signals.push({
      id: "doc-sim", category: "documents",
      label: "High document similarity",
      detail: `KYC docs ${r.docSimilarityScore}% similar to ${Math.max(2, Math.round(r.docSimilarityScore / 20))} other accounts`,
      weight: Math.round((r.docSimilarityScore - 50) * 0.6),
      severity: r.docSimilarityScore >= 85 ? "critical" : "high",
    });
  } else if (r.docSimilarityScore >= 45) {
    signals.push({
      id: "doc-sim-med", category: "documents",
      label: "Moderate document overlap",
      detail: `Some metadata fields shared with prior submissions`,
      weight: 8, severity: "medium",
    });
  }

  if (r.gstChangesLast12m >= 2) {
    signals.push({
      id: "gst-churn", category: "gst",
      label: "Frequent GSTIN changes",
      detail: `${r.gstChangesLast12m} GSTIN updates in last 12 months`,
      weight: 10 + r.gstChangesLast12m * 6,
      severity: r.gstChangesLast12m >= 3 ? "high" : "medium",
    });
  }
  if (r.addressChangesLast12m >= 2) {
    signals.push({
      id: "addr-churn", category: "gst",
      label: "Address volatility",
      detail: `${r.addressChangesLast12m} registered address changes in 12 months`,
      weight: 6 + r.addressChangesLast12m * 4,
      severity: "medium",
    });
  }

  if (r.txAnomalyScore >= 60) {
    signals.push({
      id: "tx-anom", category: "transactions",
      label: "Transaction pattern anomaly",
      detail: `Order timing & amount distribution deviates ${r.txAnomalyScore}% from category baseline`,
      weight: Math.round((r.txAnomalyScore - 40) * 0.5),
      severity: r.txAnomalyScore >= 80 ? "critical" : "high",
    });
  }
  if (r.velocitySpike >= 3) {
    signals.push({
      id: "velocity", category: "transactions",
      label: "Sudden order velocity spike",
      detail: `${r.velocitySpike.toFixed(1)}× normal weekly order volume`,
      weight: Math.round(r.velocitySpike * 3),
      severity: r.velocitySpike >= 5 ? "high" : "medium",
    });
  }

  if (r.refundRate > 0.15) {
    signals.push({
      id: "refunds", category: "behavior",
      label: "Elevated refund rate",
      detail: `${(r.refundRate * 100).toFixed(1)}% of orders refunded (industry: 4%)`,
      weight: Math.round(r.refundRate * 60),
      severity: r.refundRate > 0.25 ? "high" : "medium",
    });
  }
  if (r.disputeRate > 0.08) {
    signals.push({
      id: "disputes", category: "behavior",
      label: "High buyer dispute rate",
      detail: `${(r.disputeRate * 100).toFixed(1)}% disputes vs 2% benchmark`,
      weight: Math.round(r.disputeRate * 80),
      severity: r.disputeRate > 0.15 ? "high" : "medium",
    });
  }
  if (r.cancelledOrderRate > 0.2) {
    signals.push({
      id: "cancels", category: "behavior",
      label: "Order cancellation pattern",
      detail: `${(r.cancelledOrderRate * 100).toFixed(0)}% cancellations after escrow funded`,
      weight: Math.round(r.cancelledOrderRate * 50),
      severity: "medium",
    });
  }

  if (r.ipDeviceClusters >= 2) {
    signals.push({
      id: "device", category: "network",
      label: "Shared device / IP cluster",
      detail: `Account shares device fingerprint with ${r.ipDeviceClusters} other suppliers`,
      weight: 8 + r.ipDeviceClusters * 5,
      severity: r.ipDeviceClusters >= 4 ? "critical" : "high",
    });
  }

  if (r.joinedDays < 30 && r.avgOrderValue > 500000) {
    signals.push({
      id: "new-high-value", category: "behavior",
      label: "New account, high-value orders",
      detail: `Joined ${r.joinedDays}d ago, avg order ₹${(r.avgOrderValue / 1000).toFixed(0)}k`,
      weight: 14, severity: "high",
    });
  }

  const rawScore = signals.reduce((s, x) => s + x.weight, 0);
  const riskScore = Math.min(100, rawScore);
  const riskLevel = levelFromScore(riskScore);

  return {
    ...r,
    signals,
    riskScore,
    riskLevel,
    recommendedAction: actionFor(riskLevel),
    lastReviewed: new Date(Date.now() - Math.random() * 86400000 * 5).toISOString(),
  };
}

const MOCK_RAW: RawInput[] = [
  { supplierId: "S-1042", supplierName: "Shree Ganesh Fasteners", city: "Pune", category: "Industrial Fasteners", joinedDays: 18, gstin: "27AABCS1429R1Z5",
    docSimilarityScore: 88, gstChangesLast12m: 3, addressChangesLast12m: 2, txAnomalyScore: 82, refundRate: 0.22, disputeRate: 0.18, cancelledOrderRate: 0.31, avgOrderValue: 720000, velocitySpike: 5.4, ipDeviceClusters: 4 },
  { supplierId: "S-0871", supplierName: "Mumbai Bolt Works", city: "Mumbai", category: "Industrial Fasteners", joinedDays: 412, gstin: "27AAACM1234B1Z2",
    docSimilarityScore: 32, gstChangesLast12m: 0, addressChangesLast12m: 0, txAnomalyScore: 28, refundRate: 0.04, disputeRate: 0.02, cancelledOrderRate: 0.06, avgOrderValue: 180000, velocitySpike: 1.1, ipDeviceClusters: 0 },
  { supplierId: "S-1198", supplierName: "Pioneer Industrial Supplies", city: "Pune", category: "Industrial Fasteners", joinedDays: 92, gstin: "27AAFCP9981Q1ZK",
    docSimilarityScore: 58, gstChangesLast12m: 2, addressChangesLast12m: 1, txAnomalyScore: 64, refundRate: 0.12, disputeRate: 0.09, cancelledOrderRate: 0.18, avgOrderValue: 340000, velocitySpike: 2.8, ipDeviceClusters: 1 },
  { supplierId: "S-0456", supplierName: "Aakash Hardware Co.", city: "Nashik", category: "Hardware", joinedDays: 720, gstin: "27AAACA7777L1Z9",
    docSimilarityScore: 22, gstChangesLast12m: 0, addressChangesLast12m: 1, txAnomalyScore: 19, refundRate: 0.03, disputeRate: 0.01, cancelledOrderRate: 0.04, avgOrderValue: 95000, velocitySpike: 1.0, ipDeviceClusters: 0 },
  { supplierId: "S-1305", supplierName: "Quickfix Traders", city: "Mumbai", category: "Industrial Fasteners", joinedDays: 11, gstin: "27AAACQ2211M1Z3",
    docSimilarityScore: 75, gstChangesLast12m: 1, addressChangesLast12m: 0, txAnomalyScore: 71, refundRate: 0.18, disputeRate: 0.14, cancelledOrderRate: 0.26, avgOrderValue: 610000, velocitySpike: 4.6, ipDeviceClusters: 3 },
  { supplierId: "S-0998", supplierName: "Bharat Steel Components", city: "Pune", category: "Steel & Metal", joinedDays: 280, gstin: "27AAACB5566K1Z1",
    docSimilarityScore: 41, gstChangesLast12m: 1, addressChangesLast12m: 0, txAnomalyScore: 38, refundRate: 0.07, disputeRate: 0.05, cancelledOrderRate: 0.11, avgOrderValue: 220000, velocitySpike: 1.6, ipDeviceClusters: 0 },
  { supplierId: "S-1410", supplierName: "Velocity Fasteners LLP", city: "Aurangabad", category: "Industrial Fasteners", joinedDays: 45, gstin: "27AAFCV8821P1Z7",
    docSimilarityScore: 67, gstChangesLast12m: 2, addressChangesLast12m: 2, txAnomalyScore: 55, refundRate: 0.11, disputeRate: 0.07, cancelledOrderRate: 0.16, avgOrderValue: 280000, velocitySpike: 2.2, ipDeviceClusters: 2 },
  { supplierId: "S-0612", supplierName: "Patel Brothers Industrial", city: "Mumbai", category: "Hardware", joinedDays: 950, gstin: "27AAACP3344N1Z8",
    docSimilarityScore: 18, gstChangesLast12m: 0, addressChangesLast12m: 0, txAnomalyScore: 14, refundRate: 0.02, disputeRate: 0.01, cancelledOrderRate: 0.03, avgOrderValue: 145000, velocitySpike: 1.0, ipDeviceClusters: 0 },
];

export function getMockRiskProfiles(): SupplierRiskProfile[] {
  return MOCK_RAW.map(buildRiskProfile).sort((a, b) => b.riskScore - a.riskScore);
}

export function getMockCases(profiles: SupplierRiskProfile[]): FraudCase[] {
  const reviewers = ["R. Sharma", "P. Iyer", "A. Khan", "S. Mehta"];
  const statuses: FraudCase["status"][] = ["open", "investigating", "escalated", "resolved"];
  return profiles.filter(p => p.riskLevel === "high" || p.riskLevel === "critical").map((p, i) => ({
    id: `FC-${2000 + i}`,
    supplierId: p.supplierId,
    supplierName: p.supplierName,
    openedAt: new Date(Date.now() - (i + 1) * 86400000 * 2).toISOString(),
    status: statuses[i % statuses.length],
    primarySignal: p.signals[0]?.label ?? "General risk",
    assignee: reviewers[i % reviewers.length],
    notes: 1 + (i % 5),
  }));
}

export function summarizeFraud(profiles: SupplierRiskProfile[]) {
  const total = profiles.length;
  const counts: Record<RiskLevel, number> = { low: 0, medium: 0, high: 0, critical: 0 };
  let totalSignals = 0;
  let avgScore = 0;
  for (const p of profiles) {
    counts[p.riskLevel]++;
    totalSignals += p.signals.length;
    avgScore += p.riskScore;
  }
  return {
    total,
    counts,
    avgScore: total ? Math.round(avgScore / total) : 0,
    totalSignals,
    flaggedPct: total ? Math.round(((counts.high + counts.critical) / total) * 100) : 0,
  };
}
