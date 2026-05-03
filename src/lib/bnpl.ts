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
  status: "paid" | "due" | "upcoming" | "overdue";
  daysUntilDue: number;
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
