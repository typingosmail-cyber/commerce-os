export interface CreditFactor {
  label: string;
  weight: number; // 0-100
  score: number; // 0-100
  description: string;
}

export interface CreditLine {
  id: string;
  orderRef: string;
  supplierName: string;
  principal: number;
  outstanding: number;
  tenureDays: 30 | 60 | 90;
  apr: number; // annual %
  dueDate: string;
  status: "active" | "paid" | "overdue";
  disbursedAt: string;
}

export interface RepaymentEvent {
  id: string;
  creditLineId: string;
  amount: number;
  date: string;
  type: "repayment" | "fee" | "interest";
}

export interface ScheduleInstallment {
  installmentNo: number;
  dueDate: string;
  principal: number;
  interest: number;
  fee: number;
  total: number;
  remainingPrincipal: number;
  status: "paid" | "partial" | "due" | "upcoming" | "overdue";
  daysUntilDue: number;
  /** Amount already applied to this installment via partial repayments (rounded INR). */
  paidAmount: number;
  /** Amount still owed on this installment (total - paidAmount). */
  remainingAmount: number;
}

export interface BuyerCreditProfile {
  buyerId: string;
  trustScore: number; // 0-1000
  approvedLimit: number;
  utilized: number;
  available: number;
  tier: "Starter" | "Growth" | "Pro" | "Enterprise";
  apr: number;
  factors: CreditFactor[];
  creditLines: CreditLine[];
  repayments: RepaymentEvent[];
  onTimeRate: number; // 0-1
  totalGmv: number;
  monthsActive: number;
}

export function tierFor(trust: number): BuyerCreditProfile["tier"] {
  if (trust >= 850) return "Enterprise";
  if (trust >= 700) return "Pro";
  if (trust >= 500) return "Growth";
  return "Starter";
}

export function aprFor(trust: number): number {
  // higher trust = lower APR (range 9% – 22%)
  const t = Math.min(1000, Math.max(0, trust));
  return +(22 - (t / 1000) * 13).toFixed(2);
}

export function computeLimit(factors: CreditFactor[], baseGmv: number): number {
  const weighted = factors.reduce((a, f) => a + (f.score * f.weight) / 100, 0); // 0-100
  const multiplier = 0.4 + (weighted / 100) * 2.6; // 0.4x – 3.0x
  const raw = baseGmv * multiplier;
  // round to nearest 5k
  return Math.max(25_000, Math.round(raw / 5000) * 5000);
}

export function buildFactors(input: {
  trustScore: number;
  onTimeRate: number;
  monthsActive: number;
  totalGmv: number;
  repaymentCount: number;
  disputeRate: number; // 0-1
}): CreditFactor[] {
  return [
    {
      label: "Trust Score",
      weight: 30,
      score: Math.round((input.trustScore / 1000) * 100),
      description: "Platform-wide reputation across delivery, quality & compliance.",
    },
    {
      label: "Repayment History",
      weight: 25,
      score: Math.round(input.onTimeRate * 100),
      description: `${Math.round(input.onTimeRate * 100)}% on-time across ${input.repaymentCount} prior credit lines.`,
    },
    {
      label: "Transaction Volume",
      weight: 20,
      score: Math.min(100, Math.round((input.totalGmv / 5_000_000) * 100)),
      description: `Cumulative GMV of ₹${(input.totalGmv / 100000).toFixed(1)}L.`,
    },
    {
      label: "Account Tenure",
      weight: 15,
      score: Math.min(100, Math.round((input.monthsActive / 24) * 100)),
      description: `${input.monthsActive} months active on the platform.`,
    },
    {
      label: "Dispute Rate",
      weight: 10,
      score: Math.round((1 - input.disputeRate) * 100),
      description: `${(input.disputeRate * 100).toFixed(1)}% of orders disputed.`,
    },
  ];
}

export function mockProfile(buyerId: string, trustScore: number): BuyerCreditProfile {
  const onTimeRate = Math.min(0.99, 0.6 + (trustScore / 1000) * 0.4);
  const monthsActive = 14;
  const totalGmv = 2_400_000 + trustScore * 1500;
  const factors = buildFactors({
    trustScore,
    onTimeRate,
    monthsActive,
    totalGmv,
    repaymentCount: 18,
    disputeRate: 0.04,
  });
  const limit = computeLimit(factors, totalGmv * 0.25);
  const lines: CreditLine[] = [
    {
      id: "cl-001",
      orderRef: "ORD-8821",
      supplierName: "Surya Steel Industries",
      principal: 180000,
      outstanding: 120000,
      tenureDays: 60,
      apr: aprFor(trustScore),
      dueDate: new Date(Date.now() + 22 * 86400000).toISOString().slice(0, 10),
      status: "active",
      disbursedAt: new Date(Date.now() - 38 * 86400000).toISOString().slice(0, 10),
    },
    {
      id: "cl-002",
      orderRef: "ORD-8902",
      supplierName: "Krishna Polymers",
      principal: 95000,
      outstanding: 95000,
      tenureDays: 30,
      apr: aprFor(trustScore),
      dueDate: new Date(Date.now() + 9 * 86400000).toISOString().slice(0, 10),
      status: "active",
      disbursedAt: new Date(Date.now() - 21 * 86400000).toISOString().slice(0, 10),
    },
    {
      id: "cl-003",
      orderRef: "ORD-8675",
      supplierName: "Hindustan Textiles",
      principal: 240000,
      outstanding: 0,
      tenureDays: 90,
      apr: aprFor(trustScore),
      dueDate: new Date(Date.now() - 12 * 86400000).toISOString().slice(0, 10),
      status: "paid",
      disbursedAt: new Date(Date.now() - 102 * 86400000).toISOString().slice(0, 10),
    },
  ];
  const utilized = lines.filter(l => l.status === "active").reduce((a, l) => a + l.outstanding, 0);
  return {
    buyerId,
    trustScore,
    approvedLimit: limit,
    utilized,
    available: limit - utilized,
    tier: tierFor(trustScore),
    apr: aprFor(trustScore),
    factors,
    creditLines: lines,
    repayments: [
      { id: "r1", creditLineId: "cl-001", amount: 60000, date: new Date(Date.now() - 8 * 86400000).toISOString().slice(0, 10), type: "repayment" },
      { id: "r2", creditLineId: "cl-003", amount: 240000, date: new Date(Date.now() - 14 * 86400000).toISOString().slice(0, 10), type: "repayment" },
    ],
    onTimeRate,
    totalGmv,
    monthsActive,
  };
}

export function simulateOrder(profile: BuyerCreditProfile, amount: number, tenureDays: 30 | 60 | 90) {
  const eligible = amount <= profile.available;
  const interest = (amount * profile.apr * tenureDays) / (100 * 365);
  const platformFee = Math.round(amount * 0.005);
  const totalRepay = amount + interest + platformFee;
  const emi = Math.round(totalRepay / Math.max(1, tenureDays / 30));
  return {
    eligible,
    reason: eligible ? "Approved" : `Exceeds available limit by ₹${(amount - profile.available).toLocaleString("en-IN")}`,
    interest: Math.round(interest),
    platformFee,
    totalRepay: Math.round(totalRepay),
    emi,
  };
}

export function generateSchedule(line: CreditLine, today: Date = new Date()): ScheduleInstallment[] {
  const installments = Math.max(1, line.tenureDays / 30);
  const disbursed = new Date(line.disbursedAt);
  const principalPerInstallment = line.principal / installments;
  const platformFeeTotal = Math.round(line.principal * 0.005);
  const feePerInstallment = platformFeeTotal / installments;

  // Total funds paid on this line: baseline (principal - outstanding as of line seed)
  // plus any partial repayments recorded after the fact. Applied as a waterfall
  // (fee → interest → principal) across installments from earliest to latest.
  const baselinePaidPrincipal = Math.max(0, line.principal - line.outstanding);
  const extraPaid = getPartialPaidForLine(line.id);
  // Baseline was recorded as principal-only in the seed; we treat it as full
  // installment payments where possible, then let extraPaid flow via waterfall.
  let baselinePrincipalRemaining = baselinePaidPrincipal;
  let waterfall = extraPaid;

  const schedule: ScheduleInstallment[] = [];
  let remaining = line.principal;

  for (let i = 1; i <= installments; i++) {
    const dueDate = new Date(disbursed);
    dueDate.setDate(dueDate.getDate() + i * 30);
    const interest = (remaining * line.apr * 30) / (100 * 365);
    const principalThis = principalPerInstallment;
    const total = principalThis + interest + feePerInstallment;

    // 1) Baseline fully covers this installment when principal is settled.
    let paidAmount = 0;
    let fullyCovered = false;
    if (baselinePrincipalRemaining >= principalThis - 0.01) {
      baselinePrincipalRemaining -= principalThis;
      paidAmount = total;
      fullyCovered = true;
    } else if (baselinePrincipalRemaining > 0) {
      // Baseline partially covers this installment's principal.
      paidAmount = baselinePrincipalRemaining + 0; // fee/interest not yet paid
      baselinePrincipalRemaining = 0;
    }

    // 2) Waterfall extra repayments into remaining amount on this installment.
    if (!fullyCovered && waterfall > 0) {
      const owed = Math.max(0, total - paidAmount);
      const applied = Math.min(waterfall, owed);
      paidAmount += applied;
      waterfall -= applied;
      if (paidAmount >= total - 0.5) fullyCovered = true;
    }

    const daysUntilDue = Math.round((dueDate.getTime() - today.getTime()) / 86400000);
    let status: ScheduleInstallment["status"];
    if (fullyCovered || line.status === "paid") {
      status = "paid";
    } else if (paidAmount > 0.5) {
      status = "partial";
    } else if (daysUntilDue < 0) {
      status = "overdue";
    } else if (daysUntilDue <= 7) {
      status = "due";
    } else {
      status = "upcoming";
    }

    remaining -= principalThis;

    const totalRounded = Math.round(total);
    const paidRounded = Math.min(totalRounded, Math.round(paidAmount));
    schedule.push({
      installmentNo: i,
      dueDate: dueDate.toISOString().slice(0, 10),
      principal: Math.round(principalThis),
      interest: Math.round(interest),
      fee: Math.round(feePerInstallment),
      total: totalRounded,
      remainingPrincipal: Math.max(0, Math.round(remaining)),
      status,
      daysUntilDue,
      paidAmount: paidRounded,
      remainingAmount: Math.max(0, totalRounded - paidRounded),
    });
  }

  return schedule;
}

export function nextDueInstallment(schedule: ScheduleInstallment[]): ScheduleInstallment | undefined {
  return schedule.find((s) => s.status !== "paid");
}

// ============================================================
// Partial repayments — localStorage-backed
// ============================================================

export interface PartialRepayment {
  id: string;
  creditLineId: string;
  amount: number;
  date: string; // ISO
  note?: string;
}

const PARTIAL_KEY = "vyapar_partial_repayments_v1";

function loadPartial(): PartialRepayment[] {
  try {
    const raw = localStorage.getItem(PARTIAL_KEY);
    return raw ? (JSON.parse(raw) as PartialRepayment[]) : [];
  } catch { return []; }
}
function savePartial(list: PartialRepayment[]) {
  try { localStorage.setItem(PARTIAL_KEY, JSON.stringify(list)); } catch { /* noop */ }
}

export function getPartialRepayments(creditLineId?: string): PartialRepayment[] {
  const all = loadPartial();
  return creditLineId ? all.filter((p) => p.creditLineId === creditLineId) : all;
}

export function getPartialPaidForLine(creditLineId: string): number {
  return getPartialRepayments(creditLineId).reduce((a, p) => a + p.amount, 0);
}

export function addPartialRepayment(creditLineId: string, amount: number, note?: string): PartialRepayment {
  const p: PartialRepayment = {
    id: `pr_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    creditLineId,
    amount: Math.max(0, Math.round(amount)),
    date: new Date().toISOString(),
    note,
  };
  const list = loadPartial();
  list.unshift(p);
  savePartial(list);
  return p;
}

export function clearPartialRepayments(creditLineId?: string) {
  if (!creditLineId) { savePartial([]); return; }
  savePartial(loadPartial().filter((p) => p.creditLineId !== creditLineId));
}

/**
 * Effective outstanding = seeded outstanding minus recorded partial repayments,
 * floored at 0. Use this instead of `line.outstanding` in the UI when partial
 * repayments are active.
 */
export function effectiveOutstanding(line: CreditLine): number {
  return Math.max(0, line.outstanding - getPartialPaidForLine(line.id));
}



export type AuditEventType =
  | "initial_approval"
  | "trust_increase"
  | "trust_decrease"
  | "ontime_repayment"
  | "late_repayment"
  | "gmv_milestone"
  | "tenure_milestone"
  | "dispute_resolved"
  | "dispute_opened"
  | "verification_upgrade"
  | "manual_review";

export type AuditArtifactKind =
  | "order"
  | "invoice"
  | "payment"
  | "dispute"
  | "review_decision"
  | "trust_document"
  | "gst_filing"
  | "underwriting_memo";

export interface AuditArtifact {
  id: string;              // e.g. ORD-8675, INV-8675-A
  kind: AuditArtifactKind;
  label: string;           // human readable name
  summary: string;         // one-line description of what it proves
  issuedOn?: string;       // ISO date
  amount?: number;         // INR where relevant
  status?: string;         // e.g. "Paid", "Verified", "Resolved"
  issuer?: string;         // supplier / reviewer / authority
  fields?: { label: string; value: string }[];
}

export interface CreditLimitAuditEntry {
  id: string;
  date: string; // ISO date
  eventType: AuditEventType;
  title: string;
  description: string;
  factor?: string; // which factor changed
  factorBefore?: number; // 0-100
  factorAfter?: number;
  limitBefore: number;
  limitAfter: number;
  delta: number; // +/- in INR
  reference?: string; // order ref, dispute id, etc.
  actor: "system" | "underwriter" | "buyer";
  /** Underlying transaction / verification artifacts that caused this entry. */
  artifacts?: AuditArtifact[];
}

export const ARTIFACT_META: Record<AuditArtifactKind, { label: string; icon: string }> = {
  order: { label: "Order", icon: "Package" },
  invoice: { label: "Invoice", icon: "Receipt" },
  payment: { label: "Payment", icon: "Banknote" },
  dispute: { label: "Dispute", icon: "Scale" },
  review_decision: { label: "Review decision", icon: "UserCheck" },
  trust_document: { label: "Trust document", icon: "FileCheck2" },
  gst_filing: { label: "GST filing", icon: "ShieldCheck" },
  underwriting_memo: { label: "Underwriting memo", icon: "FileText" },
};


const EVENT_META: Record<AuditEventType, { icon: string; tone: "positive" | "negative" | "neutral" }> = {
  initial_approval: { icon: "Sparkles", tone: "neutral" },
  trust_increase: { icon: "TrendingUp", tone: "positive" },
  trust_decrease: { icon: "TrendingDown", tone: "negative" },
  ontime_repayment: { icon: "CheckCircle2", tone: "positive" },
  late_repayment: { icon: "AlertTriangle", tone: "negative" },
  gmv_milestone: { icon: "Trophy", tone: "positive" },
  tenure_milestone: { icon: "CalendarDays", tone: "positive" },
  dispute_resolved: { icon: "ShieldCheck", tone: "positive" },
  dispute_opened: { icon: "AlertOctagon", tone: "negative" },
  verification_upgrade: { icon: "BadgeCheck", tone: "positive" },
  manual_review: { icon: "UserCog", tone: "neutral" },
};

export function auditEventMeta(t: AuditEventType) {
  return EVENT_META[t];
}

export function generateAuditTrail(profile: BuyerCreditProfile): CreditLimitAuditEntry[] {
  const today = new Date();
  const day = (d: number) => new Date(today.getTime() - d * 86400000).toISOString().slice(0, 10);
  const trail: CreditLimitAuditEntry[] = [];

  // Walk back from current limit, reconstructing approximate history
  let limit = profile.approvedLimit;

  const push = (e: Omit<CreditLimitAuditEntry, "id" | "limitBefore" | "limitAfter" | "delta"> & { delta: number }) => {
    const limitBefore = limit - e.delta;
    trail.push({
      ...e,
      id: `aud-${trail.length + 1}`,
      limitBefore,
      limitAfter: limit,
    });
    limit = limitBefore;
  };

  // Most recent first
  push({
    date: day(2),
    eventType: "ontime_repayment",
    title: "On-time repayment of ORD-8675",
    description: "Repayment History factor improved after a ₹2,40,000 credit line was closed 3 days early.",
    factor: "Repayment History",
    factorBefore: 88,
    factorAfter: 92,
    delta: 50_000,
    reference: "ORD-8675",
    actor: "system",
    artifacts: [
      {
        id: "ORD-8675", kind: "order", label: "Purchase order — Shree Ganesh Fasteners",
        summary: "M12 hex bolts, 480 kg, delivered and accepted without deduction.",
        issuedOn: day(38), amount: 240_000, status: "Completed", issuer: "Shree Ganesh Fasteners",
        fields: [{ label: "Delivery", value: "On time (2 days early)" }, { label: "QC result", value: "Accepted in full" }],
      },
      {
        id: "INV-8675-A", kind: "invoice", label: "Tax invoice INV-8675-A",
        summary: "GST invoice raised against ORD-8675, settled in full via BNPL line.",
        issuedOn: day(36), amount: 240_000, status: "Paid", issuer: "Shree Ganesh Fasteners",
        fields: [{ label: "GSTIN", value: "27AABCS1429B1ZP" }, { label: "Tax", value: "18% IGST" }],
      },
      {
        id: "PAY-44219", kind: "payment", label: "UPI AutoPay debit",
        summary: "Auto-debit cleared 3 days before the due date; no retries required.",
        issuedOn: day(2), amount: 240_000, status: "Success", issuer: "Vyapar AutoPay",
        fields: [{ label: "Mandate", value: "UPI-AP-9931" }, { label: "UTR", value: "412884190237" }],
      },
    ],
  });

  push({
    date: day(9),
    eventType: "verification_upgrade",
    title: "Verification tier upgraded to Gold",
    description: "GST + bank statement cross-checks completed. Trust Score factor recomputed.",
    factor: "Trust Score",
    factorBefore: 68,
    factorAfter: 72,
    delta: 75_000,
    reference: "VRF-2041",
    actor: "underwriter",
    artifacts: [
      {
        id: "DOC-GST-2041", kind: "trust_document", label: "GST registration certificate",
        summary: "Certificate verified against GSTN master data — legal name and address matched.",
        issuedOn: day(210), status: "Verified", issuer: "GSTN",
        fields: [{ label: "GSTIN", value: "27AAECV3391M1Z4" }, { label: "Filing status", value: "Up to date" }],
      },
      {
        id: "DOC-BANK-778", kind: "trust_document", label: "6-month bank statement",
        summary: "Average balance and inflow patterns corroborate declared turnover.",
        issuedOn: day(14), status: "Verified", issuer: "HDFC Bank",
        fields: [{ label: "Avg. monthly inflow", value: "₹18.4L" }, { label: "Bounces", value: "0" }],
      },
      {
        id: "RVW-2041", kind: "review_decision", label: "Reviewer approval — tier upgrade",
        summary: "Senior reviewer approved Gold tier with reason codes AP-CLEAR, AP-MATCH.",
        issuedOn: day(9), status: "Approved", issuer: "A. Kulkarni (Senior Reviewer)",
        fields: [{ label: "Reason codes", value: "AP-CLEAR, AP-MATCH" }, { label: "Note", value: "All cross-checks clean." }],
      },
    ],
  });

  push({
    date: day(18),
    eventType: "gmv_milestone",
    title: `Crossed ₹${(profile.totalGmv / 100000).toFixed(0)}L cumulative GMV`,
    description: "Transaction Volume factor increased after sustained quarter-over-quarter growth.",
    factor: "Transaction Volume",
    factorBefore: 42,
    factorAfter: 55,
    delta: 100_000,
    actor: "system",
    artifacts: [
      {
        id: "INV-BATCH-Q3", kind: "invoice", label: "Q3 invoice batch (34 invoices)",
        summary: "Aggregated invoice set used to compute the GMV milestone.",
        issuedOn: day(20), amount: profile.totalGmv, status: "Reconciled", issuer: "Vyapar Ledger",
        fields: [{ label: "Invoices", value: "34" }, { label: "Suppliers", value: "9" }],
      },
      {
        id: "GSTR3B-Q3", kind: "gst_filing", label: "GSTR-3B filing, Q3",
        summary: "Filed turnover matched platform GMV within 4% tolerance.",
        issuedOn: day(25), status: "Filed", issuer: "GSTN",
        fields: [{ label: "Variance vs platform", value: "3.6%" }],
      },
    ],
  });

  push({
    date: day(34),
    eventType: "dispute_opened",
    title: "Dispute opened on ORD-8512",
    description: "Quality dispute on fastener grade temporarily reduced Dispute Rate factor.",
    factor: "Dispute Rate",
    factorBefore: 96,
    factorAfter: 90,
    delta: -25_000,
    reference: "DSP-118",
    actor: "system",
    artifacts: [
      {
        id: "DSP-118", kind: "dispute", label: "Quality dispute — grade mismatch",
        summary: "Buyer raised a grade 8.8 vs 10.9 mismatch claim on delivered stock.",
        issuedOn: day(34), amount: 92_000, status: "Open", issuer: "Buyer",
        fields: [{ label: "Evidence", value: "Lab test report + photos" }],
      },
      {
        id: "ORD-8512", kind: "order", label: "Purchase order — Mumbai Bolt Works",
        summary: "Order under dispute; partial acceptance recorded.",
        issuedOn: day(48), amount: 92_000, status: "Disputed", issuer: "Mumbai Bolt Works",
      },
    ],
  });

  push({
    date: day(35),
    eventType: "dispute_resolved",
    title: "Dispute DSP-105 resolved in buyer's favor",
    description: "Goodwill credit issued by supplier. No impact on buyer dispute ratio.",
    factor: "Dispute Rate",
    factorBefore: 92,
    factorAfter: 96,
    delta: 30_000,
    reference: "DSP-105",
    actor: "underwriter",
    artifacts: [
      {
        id: "DSP-105", kind: "dispute", label: "Short-delivery dispute",
        summary: "Resolved with a credit note; buyer found not at fault.",
        issuedOn: day(61), amount: 41_500, status: "Resolved (buyer favour)", issuer: "Vyapar Resolution Desk",
      },
      {
        id: "CRN-105-1", kind: "invoice", label: "Credit note CRN-105-1",
        summary: "Supplier-issued credit note settling the shortfall.",
        issuedOn: day(36), amount: 41_500, status: "Applied", issuer: "Pioneer Industrial Supplies",
      },
      {
        id: "RVW-105", kind: "review_decision", label: "Resolution decision",
        summary: "Underwriter restored the dispute-rate factor after closure.",
        issuedOn: day(35), status: "Closed", issuer: "R. Menon (Underwriter)",
      },
    ],
  });

  push({
    date: day(52),
    eventType: "ontime_repayment",
    title: "On-time repayment of ORD-8401",
    description: "Repaid ₹1,80,000 credit line on the due date.",
    factor: "Repayment History",
    factorBefore: 84,
    factorAfter: 88,
    delta: 40_000,
    reference: "ORD-8401",
    actor: "system",
    artifacts: [
      {
        id: "ORD-8401", kind: "order", label: "Purchase order — Bharat Steel Components",
        summary: "Fully delivered and accepted order financed on the BNPL line.",
        issuedOn: day(88), amount: 180_000, status: "Completed", issuer: "Bharat Steel Components",
      },
      {
        id: "PAY-41077", kind: "payment", label: "e-NACH debit",
        summary: "Debit cleared on the due date at first attempt.",
        issuedOn: day(52), amount: 180_000, status: "Success", issuer: "Vyapar AutoPay",
        fields: [{ label: "Mandate", value: "NACH-7712" }],
      },
    ],
  });

  push({
    date: day(78),
    eventType: "tenure_milestone",
    title: "12 months active on platform",
    description: "Account Tenure factor crossed the 1-year threshold.",
    factor: "Account Tenure",
    factorBefore: 50,
    factorAfter: 60,
    delta: 35_000,
    actor: "system",
    artifacts: [
      {
        id: "DOC-KYC-0001", kind: "trust_document", label: "Onboarding KYC pack",
        summary: "Original onboarding record establishing the account start date.",
        issuedOn: day(443), status: "Verified", issuer: "Vyapar Compliance",
      },
    ],
  });

  push({
    date: day(96),
    eventType: "late_repayment",
    title: "Late repayment on ORD-8190",
    description: "Repaid 4 days past due date. Repayment History factor adjusted downward.",
    factor: "Repayment History",
    factorBefore: 88,
    factorAfter: 84,
    delta: -45_000,
    reference: "ORD-8190",
    actor: "system",
    artifacts: [
      {
        id: "ORD-8190", kind: "order", label: "Purchase order — Velocity Fasteners LLP",
        summary: "Order financed on the line whose installment slipped past due.",
        issuedOn: day(130), amount: 156_000, status: "Completed", issuer: "Velocity Fasteners LLP",
      },
      {
        id: "PAY-38804", kind: "payment", label: "Retried auto-debit",
        summary: "First two attempts failed (insufficient balance); third attempt cleared on day 4.",
        issuedOn: day(96), amount: 156_000, status: "Success after 2 retries", issuer: "Vyapar AutoPay",
        fields: [{ label: "Days late", value: "4" }, { label: "Late fee", value: "₹1,248" }],
      },
    ],
  });

  push({
    date: day(120),
    eventType: "trust_increase",
    title: "Trust Score rose by 40 points",
    description: "Sustained quality ratings from 6 suppliers nudged the composite Trust Score upward.",
    factor: "Trust Score",
    factorBefore: 60,
    factorAfter: 68,
    delta: 60_000,
    actor: "system",
    artifacts: [
      {
        id: "RTG-6SUP", kind: "review_decision", label: "Supplier rating roll-up (6 suppliers)",
        summary: "Average counterparty rating 4.7/5 across 21 completed orders.",
        issuedOn: day(120), status: "Computed", issuer: "Trust Engine",
        fields: [{ label: "Orders considered", value: "21" }],
      },
    ],
  });

  push({
    date: day(180),
    eventType: "manual_review",
    title: "Quarterly underwriter review",
    description: "Risk team approved a discretionary uplift after reviewing supplier feedback and audited financials.",
    delta: 80_000,
    reference: "RVW-Q3",
    actor: "underwriter",
    artifacts: [
      {
        id: "RVW-Q3", kind: "review_decision", label: "Quarterly review decision",
        summary: "Committee approved a discretionary ₹80,000 uplift.",
        issuedOn: day(180), status: "Approved", issuer: "Credit Committee",
        fields: [{ label: "Vote", value: "3 of 3 in favour" }],
      },
      {
        id: "MEMO-Q3-114", kind: "underwriting_memo", label: "Underwriting memo Q3",
        summary: "Memo covering audited financials, exposure and concentration limits.",
        issuedOn: day(182), status: "Filed", issuer: "Risk Team",
      },
    ],
  });

  // Initial approval — anchors the trail
  trail.push({
    id: `aud-${trail.length + 1}`,
    date: day(420),
    eventType: "initial_approval",
    title: "Initial credit line approved",
    description: "Underwriting completed using GST filings, bank statements & 3 months of platform activity.",
    limitBefore: 0,
    limitAfter: limit,
    delta: limit,
    actor: "underwriter",
    reference: "UW-0001",
    artifacts: [
      {
        id: "UW-0001", kind: "underwriting_memo", label: "Initial underwriting memo",
        summary: "Baseline limit derived from GST turnover, bank inflows and platform activity.",
        issuedOn: day(420), amount: limit, status: "Approved", issuer: "Underwriting",
      },
      {
        id: "GSTR3B-Y1", kind: "gst_filing", label: "GSTR-3B filings (12 months)",
        summary: "Continuous filing history with no lapses used as the turnover basis.",
        issuedOn: day(425), status: "Filed", issuer: "GSTN",
      },
      {
        id: "DOC-PAN-11", kind: "trust_document", label: "PAN & incorporation certificate",
        summary: "Identity documents verified at onboarding.",
        issuedOn: day(440), status: "Verified", issuer: "Vyapar Compliance",
      },
    ],
  });


  return trail;
}

// ============================================================
// Buyer Fraud & Default-Risk Detection
// ============================================================

export type BuyerRiskSeverity = "info" | "low" | "medium" | "high" | "critical";
export type BuyerRiskAction = "monitor" | "reduce_limit" | "freeze_new" | "block";
export type BuyerRiskCategory =
  | "repayment"
  | "velocity"
  | "identity"
  | "device"
  | "dispute"
  | "behavior"
  | "exposure";

export interface BuyerRiskSignal {
  id: string;
  category: BuyerRiskCategory;
  label: string;
  detail: string;
  severity: BuyerRiskSeverity;
  /** Reduction applied to approved limit, in INR. 0 if non-financial. */
  reductionInr: number;
  /** Reduction expressed as % of approved limit (for display). */
  reductionPct: number;
  /** Suggested action for this single signal. */
  action: BuyerRiskAction;
  triggeredAt: string;
  ruleId: string;
}

export interface BuyerRiskMetrics {
  // Repayment behavior
  latePaymentsLast90d: number;
  daysPastDueMax: number; // worst overdue currently outstanding
  rolling30dDefaultedAmount: number;
  // Velocity
  drawdownsLast24h: number;
  drawdownsLast7d: number;
  newSuppliersLast7d: number;
  // Identity / device
  deviceChangesLast30d: number;
  ipCountryMismatches: number;
  gstinReverifyFailed: boolean;
  // Disputes
  openDisputes: number;
  chargebacksLast180d: number;
  // Behavior
  cartAbandonAfterCreditCheck: number;
  refundedThenRedrawCount: number;
  // Exposure
  exposureToHighRiskSuppliers: number; // INR
  utilizationPct: number; // 0-100 of approved limit
}

export interface BuyerRiskAssessment {
  buyerId: string;
  signals: BuyerRiskSignal[];
  /** 0-100 composite risk score (higher = riskier). */
  riskScore: number;
  /** Final action applied across all signals. */
  action: BuyerRiskAction;
  /** Total INR reduction recommended (sum of signal reductions, capped at approvedLimit). */
  totalReductionInr: number;
  /** Effective available limit after reductions / blocks. */
  effectiveLimit: number;
  /** Human-readable summary of why. */
  rationale: string;
  evaluatedAt: string;
}

const RULE_TONE: Record<BuyerRiskSeverity, string> = {
  info: "bg-muted text-muted-foreground border-border",
  low: "bg-success/10 text-success border-success/30",
  medium: "bg-yellow-500/15 text-yellow-700 border-yellow-500/30",
  high: "bg-orange-500/15 text-orange-700 border-orange-500/30",
  critical: "bg-destructive/15 text-destructive border-destructive/30",
};

export function buyerRiskTone(s: BuyerRiskSeverity): string {
  return RULE_TONE[s];
}

const ACTION_RANK: Record<BuyerRiskAction, number> = {
  monitor: 0,
  reduce_limit: 1,
  freeze_new: 2,
  block: 3,
};

function escalate(a: BuyerRiskAction, b: BuyerRiskAction): BuyerRiskAction {
  return ACTION_RANK[a] >= ACTION_RANK[b] ? a : b;
}

/** Pure rule engine — given metrics + current limit, emit signals & final action. */
export function evaluateBuyerRisk(
  buyerId: string,
  metrics: BuyerRiskMetrics,
  approvedLimit: number,
): BuyerRiskAssessment {
  const signals: BuyerRiskSignal[] = [];
  const now = new Date().toISOString();

  const add = (s: Omit<BuyerRiskSignal, "triggeredAt" | "reductionPct">) => {
    signals.push({
      ...s,
      reductionPct: approvedLimit > 0 ? +(s.reductionInr / approvedLimit * 100).toFixed(1) : 0,
      triggeredAt: now,
    });
  };

  // ---- Repayment rules ----
  if (metrics.daysPastDueMax >= 30) {
    add({
      id: "DPD-30", ruleId: "BR-001",
      category: "repayment",
      label: "Severe overdue (30+ days)",
      detail: `Outstanding installment is ${metrics.daysPastDueMax} days past due.`,
      severity: "critical",
      reductionInr: approvedLimit,
      action: "block",
    });
  } else if (metrics.daysPastDueMax >= 7) {
    add({
      id: "DPD-7", ruleId: "BR-002",
      category: "repayment",
      label: "Overdue installment (7+ days)",
      detail: `Installment ${metrics.daysPastDueMax} days late — new drawdowns frozen.`,
      severity: "high",
      reductionInr: Math.round(approvedLimit * 0.5),
      action: "freeze_new",
    });
  }

  if (metrics.latePaymentsLast90d >= 3) {
    add({
      id: "LATE-3x90", ruleId: "BR-003",
      category: "repayment",
      label: "Repeated late payments",
      detail: `${metrics.latePaymentsLast90d} late payments in the last 90 days.`,
      severity: "high",
      reductionInr: Math.round(approvedLimit * 0.3),
      action: "reduce_limit",
    });
  } else if (metrics.latePaymentsLast90d >= 2) {
    add({
      id: "LATE-2x90", ruleId: "BR-004",
      category: "repayment",
      label: "Multiple late payments",
      detail: `${metrics.latePaymentsLast90d} late payments in the last 90 days.`,
      severity: "medium",
      reductionInr: Math.round(approvedLimit * 0.15),
      action: "reduce_limit",
    });
  }

  if (metrics.rolling30dDefaultedAmount > 0) {
    add({
      id: "DEFAULT-30D", ruleId: "BR-005",
      category: "repayment",
      label: "Recent default written off",
      detail: `₹${metrics.rolling30dDefaultedAmount.toLocaleString("en-IN")} defaulted in the last 30 days.`,
      severity: "critical",
      reductionInr: Math.round(approvedLimit * 0.7),
      action: "freeze_new",
    });
  }

  // ---- Velocity rules ----
  if (metrics.drawdownsLast24h >= 5) {
    add({
      id: "VEL-24H", ruleId: "BR-010",
      category: "velocity",
      label: "Drawdown velocity spike",
      detail: `${metrics.drawdownsLast24h} credit drawdowns in 24h vs typical ≤2.`,
      severity: "high",
      reductionInr: Math.round(approvedLimit * 0.25),
      action: "freeze_new",
    });
  } else if (metrics.drawdownsLast7d >= 8) {
    add({
      id: "VEL-7D", ruleId: "BR-011",
      category: "velocity",
      label: "Elevated weekly drawdowns",
      detail: `${metrics.drawdownsLast7d} drawdowns in 7 days.`,
      severity: "medium",
      reductionInr: Math.round(approvedLimit * 0.1),
      action: "reduce_limit",
    });
  }

  if (metrics.newSuppliersLast7d >= 5) {
    add({
      id: "VEL-NEW-SUPP", ruleId: "BR-012",
      category: "velocity",
      label: "Burst of new supplier relationships",
      detail: `${metrics.newSuppliersLast7d} brand-new suppliers transacted in 7 days.`,
      severity: "medium",
      reductionInr: Math.round(approvedLimit * 0.1),
      action: "reduce_limit",
    });
  }

  // ---- Identity / device rules ----
  if (metrics.gstinReverifyFailed) {
    add({
      id: "ID-GST-FAIL", ruleId: "BR-020",
      category: "identity",
      label: "GSTIN re-verification failed",
      detail: `Latest GSTIN check returned mismatched legal name / status.`,
      severity: "critical",
      reductionInr: approvedLimit,
      action: "block",
    });
  }

  if (metrics.deviceChangesLast30d >= 4) {
    add({
      id: "DEV-CHURN", ruleId: "BR-021",
      category: "device",
      label: "Frequent device changes",
      detail: `${metrics.deviceChangesLast30d} new devices used in 30 days.`,
      severity: "high",
      reductionInr: Math.round(approvedLimit * 0.2),
      action: "reduce_limit",
    });
  }

  if (metrics.ipCountryMismatches >= 1) {
    add({
      id: "IP-GEO", ruleId: "BR-022",
      category: "device",
      label: "Foreign IP login detected",
      detail: `${metrics.ipCountryMismatches} session(s) outside India in last 30 days.`,
      severity: "medium",
      reductionInr: Math.round(approvedLimit * 0.1),
      action: "reduce_limit",
    });
  }

  // ---- Disputes ----
  if (metrics.chargebacksLast180d >= 2) {
    add({
      id: "CB-180D", ruleId: "BR-030",
      category: "dispute",
      label: "Repeated chargebacks",
      detail: `${metrics.chargebacksLast180d} chargebacks in 180 days.`,
      severity: "high",
      reductionInr: Math.round(approvedLimit * 0.3),
      action: "freeze_new",
    });
  }
  if (metrics.openDisputes >= 3) {
    add({
      id: "DSP-OPEN", ruleId: "BR-031",
      category: "dispute",
      label: "Multiple open disputes",
      detail: `${metrics.openDisputes} disputes currently open.`,
      severity: "medium",
      reductionInr: Math.round(approvedLimit * 0.1),
      action: "reduce_limit",
    });
  }

  // ---- Behavior ----
  if (metrics.refundedThenRedrawCount >= 2) {
    add({
      id: "BHV-REFUND-LOOP", ruleId: "BR-040",
      category: "behavior",
      label: "Refund-then-redraw pattern",
      detail: `${metrics.refundedThenRedrawCount} cycles of refund followed by immediate new drawdown.`,
      severity: "high",
      reductionInr: Math.round(approvedLimit * 0.25),
      action: "freeze_new",
    });
  }
  if (metrics.cartAbandonAfterCreditCheck >= 5) {
    add({
      id: "BHV-PROBE", ruleId: "BR-041",
      category: "behavior",
      label: "Credit-check probing",
      detail: `${metrics.cartAbandonAfterCreditCheck} large carts abandoned right after credit eligibility check.`,
      severity: "low",
      reductionInr: 0,
      action: "monitor",
    });
  }

  // ---- Exposure ----
  if (metrics.exposureToHighRiskSuppliers > approvedLimit * 0.4) {
    add({
      id: "EXP-HIGHRISK", ruleId: "BR-050",
      category: "exposure",
      label: "High exposure to flagged suppliers",
      detail: `₹${metrics.exposureToHighRiskSuppliers.toLocaleString("en-IN")} concentrated with high-risk suppliers.`,
      severity: "medium",
      reductionInr: Math.round(approvedLimit * 0.15),
      action: "reduce_limit",
    });
  }
  if (metrics.utilizationPct >= 95) {
    add({
      id: "EXP-UTIL", ruleId: "BR-051",
      category: "exposure",
      label: "Limit nearly fully utilized",
      detail: `${metrics.utilizationPct}% of approved limit currently drawn.`,
      severity: "low",
      reductionInr: 0,
      action: "monitor",
    });
  }

  // ---- Aggregate ----
  let action: BuyerRiskAction = "monitor";
  for (const s of signals) action = escalate(action, s.action);

  // For block: reduction = full limit, effective = 0.
  // For freeze_new / reduce_limit: cap reductions at approvedLimit.
  const rawReduction = signals.reduce((a, s) => a + s.reductionInr, 0);
  const totalReductionInr =
    action === "block" ? approvedLimit : Math.min(approvedLimit, rawReduction);
  const effectiveLimit = action === "block" ? 0 : Math.max(0, approvedLimit - totalReductionInr);

  // Risk score: blend of severity counts + reduction ratio.
  const sevWeight: Record<BuyerRiskSeverity, number> = {
    info: 1, low: 3, medium: 8, high: 16, critical: 28,
  };
  const sevTotal = signals.reduce((a, s) => a + sevWeight[s.severity], 0);
  const reductionRatio = approvedLimit > 0 ? totalReductionInr / approvedLimit : 0;
  const riskScore = Math.min(
    100,
    Math.round(sevTotal + reductionRatio * 35 + (action === "block" ? 25 : 0)),
  );

  const rationale =
    action === "block"
      ? "Account blocked from new BNPL drawdowns pending compliance review."
      : action === "freeze_new"
        ? "New drawdowns frozen until outstanding risks are cleared."
        : action === "reduce_limit"
          ? `Approved limit temporarily reduced by ₹${totalReductionInr.toLocaleString("en-IN")} based on detected risk signals.`
          : signals.length === 0
            ? "No risk signals detected. Limit unchanged."
            : "Low-severity signals only — monitoring, no limit change.";

  return {
    buyerId,
    signals,
    riskScore,
    action,
    totalReductionInr,
    effectiveLimit,
    rationale,
    evaluatedAt: now,
  };
}

/** Demo metrics tuned to surface a realistic mix of signals. */
export function mockBuyerRiskMetrics(profile: BuyerCreditProfile): BuyerRiskMetrics {
  const utilizationPct = profile.approvedLimit > 0
    ? Math.round((profile.utilized / profile.approvedLimit) * 100)
    : 0;
  // Surface some signals if trust is mid/low; keep clean for very high trust.
  const risky = profile.trustScore < 800;
  return {
    latePaymentsLast90d: risky ? 2 : 0,
    daysPastDueMax: risky ? 9 : 0,
    rolling30dDefaultedAmount: 0,
    drawdownsLast24h: risky ? 3 : 1,
    drawdownsLast7d: risky ? 6 : 2,
    newSuppliersLast7d: risky ? 5 : 1,
    deviceChangesLast30d: risky ? 2 : 0,
    ipCountryMismatches: 0,
    gstinReverifyFailed: false,
    openDisputes: risky ? 1 : 0,
    chargebacksLast180d: 0,
    cartAbandonAfterCreditCheck: risky ? 6 : 1,
    refundedThenRedrawCount: 0,
    exposureToHighRiskSuppliers: risky ? Math.round(profile.approvedLimit * 0.5) : 0,
    utilizationPct,
  };
}

export function summarizeAuditTrail(trail: CreditLimitAuditEntry[]) {
  const positive = trail.filter((e) => e.delta > 0).reduce((a, e) => a + e.delta, 0);
  const negative = trail.filter((e) => e.delta < 0).reduce((a, e) => a + Math.abs(e.delta), 0);
  const events = trail.length;
  const factorImpact: Record<string, number> = {};
  for (const e of trail) {
    if (!e.factor) continue;
    factorImpact[e.factor] = (factorImpact[e.factor] ?? 0) + e.delta;
  }
  return { positive, negative, events, factorImpact };
}

// ============================================================
// Limit Increase / New Credit Line Request Workflow
// ============================================================

export type LimitRequestType = "limit_increase" | "new_credit_line";
export type LimitRequestStatus = "draft" | "submitted" | "under_review" | "approved" | "rejected" | "more_info";

export interface MilestoneCheck {
  id: string;
  label: string;
  description: string;
  required: number | string;
  current: number | string;
  passed: boolean;
}

export interface LimitRequest {
  id: string;
  buyerId: string;
  type: LimitRequestType;
  requestedAmount: number;        // for limit_increase: new total cap; for new_credit_line: the new line amount
  currentLimit: number;
  reason: string;
  supportingDocs: string[];       // names only (mock)
  status: LimitRequestStatus;
  submittedAt: string;
  decidedAt?: string;
  reviewerNote?: string;
  milestones: MilestoneCheck[];
  eligible: boolean;
  estimatedAprAfter: number;
}

export interface MilestoneEvaluation {
  milestones: MilestoneCheck[];
  passedCount: number;
  totalCount: number;
  eligible: boolean;
  maxRequestable: number;
  blockingReasons: string[];
}

const STORAGE_KEY = "vyapar_limit_requests";

export function evaluateMilestones(profile: BuyerCreditProfile, type: LimitRequestType): MilestoneEvaluation {
  const paidLines = profile.creditLines.filter((l) => l.status === "paid").length;
  const overdueLines = profile.creditLines.filter((l) => l.status === "overdue").length;
  const utilizationPct = profile.approvedLimit > 0
    ? Math.round((profile.utilized / profile.approvedLimit) * 100)
    : 0;

  const baseRequirements = [
    {
      id: "ontime",
      label: "On-time repayment rate ≥ 90%",
      description: "Sustained repayment discipline across recent credit lines.",
      required: "≥ 90%",
      current: `${Math.round(profile.onTimeRate * 100)}%`,
      passed: profile.onTimeRate >= 0.9,
    },
    {
      id: "trust",
      label: "Trust score ≥ 650",
      description: "Composite reputation across delivery, quality & compliance.",
      required: "≥ 650",
      current: profile.trustScore,
      passed: profile.trustScore >= 650,
    },
    {
      id: "tenure",
      label: "Account active ≥ 6 months",
      description: "Minimum platform history for underwriting.",
      required: "≥ 6 months",
      current: `${profile.monthsActive} months`,
      passed: profile.monthsActive >= 6,
    },
    {
      id: "paid",
      label: "≥ 2 fully repaid credit lines",
      description: "Demonstrated full repayment cycles.",
      required: "≥ 2",
      current: paidLines,
      passed: paidLines >= 2,
    },
    {
      id: "no-overdue",
      label: "No overdue installments",
      description: "All current obligations within due date.",
      required: "0",
      current: overdueLines,
      passed: overdueLines === 0,
    },
  ];

  const extra: MilestoneCheck[] =
    type === "limit_increase"
      ? [{
          id: "utilization",
          label: "Utilization ≥ 40%",
          description: "Show meaningful, healthy use of existing limit.",
          required: "≥ 40%",
          current: `${utilizationPct}%`,
          passed: utilizationPct >= 40,
        }]
      : [{
          id: "gmv",
          label: "Cumulative GMV ≥ ₹15L",
          description: "Sufficient transaction volume for an additional line.",
          required: "≥ ₹15,00,000",
          current: `₹${profile.totalGmv.toLocaleString("en-IN")}`,
          passed: profile.totalGmv >= 15_00_000,
        }];

  const milestones = [...baseRequirements, ...extra];
  const passedCount = milestones.filter((m) => m.passed).length;
  const eligible = passedCount === milestones.length;

  // Eligible cap: limit_increase up to 2.0× current; new_credit_line up to 0.6× current
  const multiplier = type === "limit_increase" ? 2.0 : 0.6;
  const maxRequestable = Math.max(25_000, Math.round((profile.approvedLimit * multiplier) / 5000) * 5000);

  return {
    milestones,
    passedCount,
    totalCount: milestones.length,
    eligible,
    maxRequestable,
    blockingReasons: milestones.filter((m) => !m.passed).map((m) => m.label),
  };
}

export function loadLimitRequests(buyerId: string): LimitRequest[] {
  try {
    const raw = typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_KEY) : null;
    if (!raw) return [];
    const all = JSON.parse(raw) as LimitRequest[];
    return all.filter((r) => r.buyerId === buyerId).sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
  } catch {
    return [];
  }
}

function saveAllRequests(all: LimitRequest[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
}

export function submitLimitRequest(input: {
  buyerId: string;
  type: LimitRequestType;
  requestedAmount: number;
  currentLimit: number;
  reason: string;
  supportingDocs: string[];
  evaluation: MilestoneEvaluation;
  trustScore: number;
}): LimitRequest {
  const now = new Date().toISOString();
  const req: LimitRequest = {
    id: `LR-${Date.now().toString(36).toUpperCase()}`,
    buyerId: input.buyerId,
    type: input.type,
    requestedAmount: input.requestedAmount,
    currentLimit: input.currentLimit,
    reason: input.reason,
    supportingDocs: input.supportingDocs,
    status: input.evaluation.eligible ? "submitted" : "draft",
    submittedAt: now,
    milestones: input.evaluation.milestones,
    eligible: input.evaluation.eligible,
    estimatedAprAfter: aprFor(Math.min(1000, input.trustScore + (input.evaluation.eligible ? 30 : 0))),
  };

  // Auto-progress eligible requests through a mock review pipeline.
  if (req.status === "submitted") {
    req.status = "under_review";
  }

  const all = (() => {
    try {
      const raw = typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_KEY) : null;
      return raw ? (JSON.parse(raw) as LimitRequest[]) : [];
    } catch { return []; }
  })();
  saveAllRequests([req, ...all]);
  return req;
}

export function decideLimitRequest(id: string, decision: "approved" | "rejected" | "more_info", note?: string): LimitRequest | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const all = raw ? (JSON.parse(raw) as LimitRequest[]) : [];
    const idx = all.findIndex((r) => r.id === id);
    if (idx < 0) return null;
    all[idx] = {
      ...all[idx],
      status: decision,
      decidedAt: new Date().toISOString(),
      reviewerNote: note ?? all[idx].reviewerNote,
    };
    saveAllRequests(all);
    return all[idx];
  } catch { return null; }
}

export function deleteLimitRequest(id: string): void {
  if (typeof window === "undefined") return;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const all = raw ? (JSON.parse(raw) as LimitRequest[]) : [];
    saveAllRequests(all.filter((r) => r.id !== id));
  } catch { /* noop */ }
}

export const LIMIT_REQUEST_STATUS_META: Record<LimitRequestStatus, { label: string; tone: string }> = {
  draft:        { label: "Draft",        tone: "bg-muted text-muted-foreground border-border" },
  submitted:    { label: "Submitted",    tone: "bg-secondary text-secondary-foreground border-border" },
  under_review: { label: "Under Review", tone: "bg-yellow-500/15 text-yellow-700 border-yellow-500/30" },
  approved:     { label: "Approved",     tone: "bg-success/15 text-success border-success/30" },
  rejected:     { label: "Rejected",     tone: "bg-destructive/15 text-destructive border-destructive/30" },
  more_info:    { label: "Needs Info",   tone: "bg-orange-500/15 text-orange-700 border-orange-500/30" },
};

// ============================================================
// Factor-by-factor delta attribution
// ============================================================

export interface FactorDelta {
  label: string;
  weight: number;
  before: number;       // 0-100 score at window start
  after: number;        // 0-100 score now
  scoreDelta: number;
  weightedBefore: number; // contribution to composite (0-100 scale)
  weightedAfter: number;
  weightedDelta: number;
  limitContribution: number; // INR attributed to this factor's movement
  contributionPct: number;   // share of total limit movement (abs based)
  events: CreditLimitAuditEntry[];
  description: string;
}

export interface FactorDeltaReport {
  windowDays: number;
  fromDate: string;
  toDate: string;
  baselineLimit: number;
  currentLimit: number;
  limitDelta: number;
  baselineComposite: number;
  currentComposite: number;
  compositeDelta: number;
  factors: FactorDelta[];
  /** Limit movement recorded in the audit trail that isn't tied to a factor (e.g. underwriter uplift). */
  unattributedDelta: number;
  eventCount: number;
}

const round5k = (n: number) => Math.round(n / 5000) * 5000;

/**
 * Compares each credit factor's score at the start of the window against today,
 * and attributes the change in approved limit to each factor by re-running the
 * limit model one factor at a time (cumulative marginal attribution).
 */
export function computeFactorDeltas(
  profile: BuyerCreditProfile,
  trail: CreditLimitAuditEntry[],
  windowDays = 90,
): FactorDeltaReport {
  const today = new Date();
  const cutoff = new Date(today.getTime() - windowDays * 86400000);
  const inWindow = trail
    .filter((e) => new Date(e.date) >= cutoff)
    .sort((a, b) => a.date.localeCompare(b.date)); // chronological

  const baseGmv = profile.totalGmv * 0.25;

  // Baseline score per factor = factorBefore of its earliest in-window event.
  const baselineFactors: CreditFactor[] = profile.factors.map((f) => {
    const first = inWindow.find((e) => e.factor === f.label && e.factorBefore != null);
    return { ...f, score: first?.factorBefore ?? f.score };
  });

  const baselineLimit = computeLimit(baselineFactors, baseGmv);
  const currentLimit = computeLimit(profile.factors, baseGmv);

  const weightedOf = (fs: CreditFactor[]) => fs.reduce((a, f) => a + (f.score * f.weight) / 100, 0);

  // Cumulative marginal attribution — sums exactly to (currentLimit - baselineLimit).
  const working = baselineFactors.map((f) => ({ ...f }));
  let running = baselineLimit;
  const contributions: number[] = [];
  profile.factors.forEach((f, i) => {
    working[i] = { ...working[i], score: f.score };
    const next = computeLimit(working, baseGmv);
    contributions.push(next - running);
    running = next;
  });

  const totalAbs = contributions.reduce((a, c) => a + Math.abs(c), 0) || 1;

  const factors: FactorDelta[] = profile.factors.map((f, i) => {
    const before = baselineFactors[i].score;
    const events = inWindow.filter((e) => e.factor === f.label).sort((a, b) => b.date.localeCompare(a.date));
    return {
      label: f.label,
      weight: f.weight,
      before,
      after: f.score,
      scoreDelta: f.score - before,
      weightedBefore: +((before * f.weight) / 100).toFixed(1),
      weightedAfter: +((f.score * f.weight) / 100).toFixed(1),
      weightedDelta: +(((f.score - before) * f.weight) / 100).toFixed(1),
      limitContribution: round5k(contributions[i]),
      contributionPct: +((Math.abs(contributions[i]) / totalAbs) * 100).toFixed(1),
      events,
      description: f.description,
    };
  });

  const unattributedDelta = inWindow
    .filter((e) => !e.factor)
    .reduce((a, e) => a + e.delta, 0);

  return {
    windowDays,
    fromDate: cutoff.toISOString().slice(0, 10),
    toDate: today.toISOString().slice(0, 10),
    baselineLimit,
    currentLimit,
    limitDelta: currentLimit - baselineLimit,
    baselineComposite: Math.round(weightedOf(baselineFactors)),
    currentComposite: Math.round(weightedOf(profile.factors)),
    compositeDelta: +(weightedOf(profile.factors) - weightedOf(baselineFactors)).toFixed(1),
    factors,
    unattributedDelta,
    eventCount: inWindow.length,
  };
}
