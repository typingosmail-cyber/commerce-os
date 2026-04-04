// Escrow & Risk System - Mock Engine

export type EscrowStatus = "created" | "funded" | "milestone_1" | "milestone_2" | "released" | "disputed" | "refunded";

export interface EscrowTransaction {
  id: string;
  orderId: string;
  buyerId: string;
  sellerId: string;
  amount: number;
  platformFee: number;
  status: EscrowStatus;
  riskScore: number; // 0-100
  riskLevel: "low" | "medium" | "high";
  milestones: EscrowMilestone[];
  createdAt: string;
  updatedAt: string;
  disputeReason?: string;
}

export interface EscrowMilestone {
  id: string;
  label: string;
  amount: number;
  status: "pending" | "completed" | "disputed";
  dueDate: string;
  completedAt?: string;
}

export interface RiskAssessment {
  overallScore: number;
  level: "low" | "medium" | "high";
  factors: RiskFactor[];
  recommendation: string;
}

export interface RiskFactor {
  name: string;
  score: number;
  weight: number;
  detail: string;
}

// Risk calculation using Bayesian-like scoring
export function calculateRiskScore(params: {
  sellerTrustScore: number;
  buyerTrustScore: number;
  dealAmount: number;
  categoryRisk: number;
  isFirstDeal: boolean;
  sellerHistory: number;
}): RiskAssessment {
  const factors: RiskFactor[] = [
    {
      name: "Seller Trust Score",
      score: Math.max(0, 100 - (params.sellerTrustScore / 10)),
      weight: 0.3,
      detail: `Score: ${params.sellerTrustScore}/1000`,
    },
    {
      name: "Buyer Reliability",
      score: Math.max(0, 100 - (params.buyerTrustScore / 10)),
      weight: 0.15,
      detail: `Score: ${params.buyerTrustScore}/1000`,
    },
    {
      name: "Deal Size Risk",
      score: params.dealAmount > 500000 ? 70 : params.dealAmount > 100000 ? 45 : 20,
      weight: 0.2,
      detail: `₹${params.dealAmount.toLocaleString()}`,
    },
    {
      name: "Category Volatility",
      score: params.categoryRisk,
      weight: 0.15,
      detail: `Risk index: ${params.categoryRisk}%`,
    },
    {
      name: "First Transaction Penalty",
      score: params.isFirstDeal ? 60 : 10,
      weight: 0.1,
      detail: params.isFirstDeal ? "New relationship" : "Repeat business",
    },
    {
      name: "Historical Performance",
      score: Math.max(0, 100 - params.sellerHistory),
      weight: 0.1,
      detail: `${params.sellerHistory}% success rate`,
    },
  ];

  const overallScore = Math.round(
    factors.reduce((sum, f) => sum + f.score * f.weight, 0)
  );

  const level = overallScore > 60 ? "high" : overallScore > 35 ? "medium" : "low";

  const recommendations: Record<string, string> = {
    low: "Standard escrow with 2-milestone release recommended",
    medium: "Enhanced escrow with 3-milestone release + quality inspection required",
    high: "Full escrow with insurance + mandatory quality audit + partial advance hold",
  };

  return { overallScore, level, factors, recommendation: recommendations[level] };
}

// Game theory payoff calculator
export interface GamePayoff {
  honestPayoff: number;
  cheatPayoff: number;
  nashEquilibrium: string;
  dominantStrategy: string;
}

export function calculateGamePayoff(params: {
  dealValue: number;
  trustScore: number;
  detectionProbability: number;
  penaltyMultiplier: number;
  futureDeals: number;
}): GamePayoff {
  const { dealValue, trustScore, detectionProbability, penaltyMultiplier, futureDeals } = params;

  const reputationValue = (trustScore / 1000) * dealValue * 0.3;
  const futureValue = futureDeals * dealValue * 0.15;
  const honestPayoff = dealValue * 0.12 + reputationValue + futureValue;

  const cheatGain = dealValue * 0.25;
  const penalty = dealValue * penaltyMultiplier * detectionProbability;
  const reputationLoss = reputationValue * 2;
  const futureLoss = futureValue;
  const cheatPayoff = cheatGain - penalty - reputationLoss - futureLoss;

  return {
    honestPayoff: Math.round(honestPayoff),
    cheatPayoff: Math.round(cheatPayoff),
    nashEquilibrium: honestPayoff > cheatPayoff ? "Cooperate (Honest)" : "Defect (requires system adjustment)",
    dominantStrategy: "Honest behavior is dominant when detection > 40% and penalty > 1.5x",
  };
}

// Mock escrow transactions
export const MOCK_ESCROW: EscrowTransaction[] = [
  {
    id: "esc-001",
    orderId: "ord-001",
    buyerId: "buyer-1",
    sellerId: "sup-1",
    amount: 325000,
    platformFee: 6500,
    status: "milestone_1",
    riskScore: 28,
    riskLevel: "low",
    milestones: [
      { id: "m1", label: "Sample Approval", amount: 32500, status: "completed", dueDate: "2026-03-20", completedAt: "2026-03-18" },
      { id: "m2", label: "Production Complete", amount: 162500, status: "pending", dueDate: "2026-04-05" },
      { id: "m3", label: "Delivery & QC", amount: 130000, status: "pending", dueDate: "2026-04-12" },
    ],
    createdAt: "2026-03-15T10:00:00Z",
    updatedAt: "2026-03-18T14:30:00Z",
  },
  {
    id: "esc-002",
    orderId: "ord-002",
    buyerId: "buyer-2",
    sellerId: "sup-2",
    amount: 875000,
    platformFee: 17500,
    status: "disputed",
    riskScore: 62,
    riskLevel: "high",
    milestones: [
      { id: "m1", label: "Advance Payment", amount: 262500, status: "completed", dueDate: "2026-03-10", completedAt: "2026-03-10" },
      { id: "m2", label: "First Batch Delivery", amount: 350000, status: "disputed", dueDate: "2026-03-25" },
      { id: "m3", label: "Final Delivery", amount: 262500, status: "pending", dueDate: "2026-04-05" },
    ],
    createdAt: "2026-03-08T09:00:00Z",
    updatedAt: "2026-03-26T11:00:00Z",
    disputeReason: "Quality mismatch - received Grade B instead of Grade A material",
  },
  {
    id: "esc-003",
    orderId: "ord-003",
    buyerId: "buyer-1",
    sellerId: "sup-3",
    amount: 150000,
    platformFee: 3000,
    status: "released",
    riskScore: 15,
    riskLevel: "low",
    milestones: [
      { id: "m1", label: "Order Confirmed", amount: 45000, status: "completed", dueDate: "2026-02-20", completedAt: "2026-02-20" },
      { id: "m2", label: "Delivery Complete", amount: 105000, status: "completed", dueDate: "2026-03-01", completedAt: "2026-02-28" },
    ],
    createdAt: "2026-02-18T08:00:00Z",
    updatedAt: "2026-03-01T16:00:00Z",
  },
];
