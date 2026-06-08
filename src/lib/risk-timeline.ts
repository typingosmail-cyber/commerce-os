import type { SupplierRiskProfile, FraudSignal, RiskLevel } from "./fraud-detection";

export type TimelineEventKind =
  | "document"
  | "gst"
  | "transaction"
  | "behavior"
  | "network"
  | "review"
  | "score";

export type TimelineDirection = "up" | "down" | "flat";

export interface TimelineEvidence {
  kind: "document" | "transaction" | "gst_filing" | "device" | "dispute" | "review";
  id: string;
  label: string;
  detail: string;
  href?: string;
}

export interface RiskTimelineEvent {
  id: string;
  date: string; // ISO
  signalId: string;        // matches FraudSignal.id (or 'composite' / 'review')
  signalLabel: string;
  category: TimelineEventKind;
  severity: RiskLevel;
  title: string;
  description: string;
  scoreBefore: number;
  scoreAfter: number;
  direction: TimelineDirection;
  evidence: TimelineEvidence[];
}

// Stable pseudo-random based on a string seed
function seeded(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h ^= h << 13; h ^= h >>> 17; h ^= h << 5;
    return ((h >>> 0) % 10000) / 10000;
  };
}

const SIGNAL_TO_KIND: Record<string, TimelineEventKind> = {
  "doc-sim": "document",
  "doc-sim-med": "document",
  "gst-churn": "gst",
  "addr-churn": "gst",
  "tx-anom": "transaction",
  "velocity": "transaction",
  "refunds": "behavior",
  "disputes": "behavior",
  "cancels": "behavior",
  "device": "network",
  "new-high-value": "behavior",
};

function evidenceFor(signal: FraudSignal, supplierId: string, rnd: () => number): TimelineEvidence[] {
  const ev: TimelineEvidence[] = [];
  const pick = (n: number) => Math.max(1, Math.floor(rnd() * n) + 1);

  switch (signal.id) {
    case "doc-sim":
    case "doc-sim-med":
      ev.push({
        kind: "document",
        id: `DOC-${supplierId}-GST`,
        label: "GST Certificate (uploaded)",
        detail: "PDF · hash matched against KYC vault",
        href: `#document/${supplierId}/gst`,
      });
      ev.push({
        kind: "document",
        id: `DOC-${supplierId}-PAN`,
        label: "PAN Card",
        detail: "Image · OCR fields cross-referenced",
        href: `#document/${supplierId}/pan`,
      });
      break;
    case "gst-churn":
      for (let i = 0; i < pick(3); i++) {
        ev.push({
          kind: "gst_filing",
          id: `GSTN-${supplierId}-${i}`,
          label: `GSTN webhook update #${i + 1}`,
          detail: "GSTIN registration field changed",
          href: `#gst/${supplierId}`,
        });
      }
      break;
    case "addr-churn":
      ev.push({
        kind: "gst_filing",
        id: `GSTN-ADDR-${supplierId}`,
        label: "Registered address updated",
        detail: "MCA filing reflects new principal place of business",
        href: `#gst/${supplierId}/address`,
      });
      break;
    case "tx-anom":
    case "velocity":
      for (let i = 0; i < pick(3); i++) {
        const orderId = `ORD-${(73000 + Math.floor(rnd() * 9999)).toString()}`;
        ev.push({
          kind: "transaction",
          id: orderId,
          label: `Order ${orderId}`,
          detail: `₹${(50 + Math.floor(rnd() * 900)).toLocaleString()}k · escrow funded`,
          href: `#order/${orderId}`,
        });
      }
      break;
    case "refunds":
    case "cancels":
      for (let i = 0; i < pick(2); i++) {
        const orderId = `ORD-${(72000 + Math.floor(rnd() * 9999)).toString()}`;
        ev.push({
          kind: "transaction",
          id: orderId,
          label: `Refund on ${orderId}`,
          detail: "Buyer-initiated refund post-delivery",
          href: `#order/${orderId}`,
        });
      }
      break;
    case "disputes":
      for (let i = 0; i < pick(2); i++) {
        const dispId = `DSP-${(4100 + Math.floor(rnd() * 999)).toString()}`;
        ev.push({
          kind: "dispute",
          id: dispId,
          label: `Dispute ${dispId}`,
          detail: "Quality mismatch raised by buyer",
          href: `#dispute/${dispId}`,
        });
      }
      break;
    case "device":
      ev.push({
        kind: "device",
        id: `FP-${supplierId}`,
        label: "Device fingerprint cluster",
        detail: "Shared canvas + WebGL hash with peer accounts",
        href: `#device/${supplierId}`,
      });
      break;
    case "new-high-value":
      ev.push({
        kind: "transaction",
        id: `ORD-${(70000 + Math.floor(rnd() * 9999)).toString()}`,
        label: "First high-value order",
        detail: "Above ₹5L within 30 days of joining",
      });
      break;
  }

  return ev;
}

export function buildRiskTimeline(profile: SupplierRiskProfile): RiskTimelineEvent[] {
  const rnd = seeded(profile.supplierId);
  const events: RiskTimelineEvent[] = [];
  const now = Date.now();

  // Baseline: account joined
  events.push({
    id: `${profile.supplierId}-joined`,
    date: new Date(now - profile.joinedDays * 86400000).toISOString(),
    signalId: "baseline",
    signalLabel: "Account onboarded",
    category: "review",
    severity: "low",
    title: "Supplier joined platform",
    description: `Onboarded with GSTIN ${profile.gstin}. Baseline risk score initialized at 0.`,
    scoreBefore: 0,
    scoreAfter: 0,
    direction: "flat",
    evidence: [
      {
        kind: "document",
        id: `KYC-${profile.supplierId}`,
        label: "KYC bundle submitted",
        detail: "9 documents uploaded during onboarding",
        href: `#kyc/${profile.supplierId}`,
      },
    ],
  });

  // For each detected signal, generate 1-2 historical events that built up its weight
  let runningScore = 0;
  const sorted = [...profile.signals].sort((a, b) => b.weight - a.weight);
  for (let i = 0; i < sorted.length; i++) {
    const s = sorted[i];
    const occurrences = s.weight > 18 ? 2 : 1;
    for (let k = 0; k < occurrences; k++) {
      const ageDays = Math.max(1, Math.floor(profile.joinedDays * (0.15 + rnd() * 0.8) - k * 4));
      const portion = Math.round(s.weight / occurrences);
      const before = runningScore;
      runningScore = Math.min(100, runningScore + portion);
      events.push({
        id: `${profile.supplierId}-${s.id}-${k}`,
        date: new Date(now - ageDays * 86400000).toISOString(),
        signalId: s.id,
        signalLabel: s.label,
        category: SIGNAL_TO_KIND[s.id] ?? "behavior",
        severity: s.severity,
        title: k === 0 ? `${s.label} first detected` : `${s.label} re-triggered`,
        description: s.detail,
        scoreBefore: before,
        scoreAfter: runningScore,
        direction: "up",
        evidence: evidenceFor(s, profile.supplierId, rnd),
      });
    }
  }

  // Reviewer / system actions
  if (profile.signals.length > 0) {
    const reviewAge = Math.max(0, Math.floor(rnd() * 4));
    events.push({
      id: `${profile.supplierId}-review`,
      date: new Date(now - reviewAge * 86400000).toISOString(),
      signalId: "review",
      signalLabel: "Reviewer note",
      category: "review",
      severity: profile.riskLevel,
      title: "Compliance reviewer assessment",
      description: profile.recommendedAction,
      scoreBefore: runningScore,
      scoreAfter: profile.riskScore,
      direction: profile.riskScore > runningScore ? "up" : profile.riskScore < runningScore ? "down" : "flat",
      evidence: [
        {
          kind: "review",
          id: `RV-${profile.supplierId}`,
          label: "Reviewer log entry",
          detail: `Reviewed ${new Date(profile.lastReviewed).toLocaleString()}`,
          href: `#review/${profile.supplierId}`,
        },
      ],
    });
  }

  // Sort newest first
  return events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export function buildScoreSeries(timeline: RiskTimelineEvent[]) {
  // Oldest to newest for charting
  const chrono = [...timeline].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  return chrono.map(e => ({
    date: new Date(e.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }),
    score: e.scoreAfter,
    label: e.signalLabel,
  }));
}
