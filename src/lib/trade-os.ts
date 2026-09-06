// Trade OS — Autonomous B2B Trade Operating System
// Frontend prototype: deterministic mock agents + localStorage persistence.
// Implements all 7 vision steps: Intent → Multi-Agent → Trust → Match/Simulate
// → Transaction → Logistics → Learning Loop.

import { recordDealOutcome, computePriors } from "./trade-learning";

const STORAGE_KEY = "vyapar_trade_os_v1";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type DealStage =
  | "intent"
  | "understanding"
  | "matching"
  | "trust"
  | "pricing"
  | "negotiation"
  | "quality"
  | "risk"
  | "simulation"
  | "contract"
  | "escrow"
  | "logistics"
  | "completed"
  | "failed";

export type RiskProfile = "conservative" | "balanced" | "aggressive";

export interface DealSpec {
  product: string;
  specifications: Record<string, string>;
  quantity: number;
  unit: string;
  targetPrice: number;          // INR per unit
  deliveryDeadline: string;     // ISO date
  compliance: string[];
  riskProfile: RiskProfile;
  rawInput: string;
  attachments: string[];        // file names only
  inferredCategory: string;
  confidence: number;           // 0-1
}

export interface AgentLog {
  agent: string;
  ts: number;
  status: "running" | "ok" | "warn" | "error";
  message: string;
  data?: Record<string, unknown>;
}

export interface CandidateSupplier {
  id: string;
  name: string;
  city: string;
  trustScore: number;       // 0-100
  pricePerUnit: number;
  leadTimeDays: number;
  defectRiskPct: number;
  fulfillmentRate: number;  // 0-1
  certifications: string[];
  matchScore: number;       // composite 0-100
  reasons: string[];
  flags: string[];
}

export interface NegotiationRound {
  round: number;
  supplierId: string;
  buyerOffer: number;
  supplierCounter: number;
  rationale: string;
  accepted: boolean;
}

export interface DealSimulation {
  name: string;
  strategy: "single" | "split-2" | "split-3";
  totalCost: number;
  weightedLeadTime: number;
  weightedRisk: number;
  suppliers: Array<{ id: string; share: number; cost: number }>;
  recommended: boolean;
  rationale: string;
}

export interface ContractTerms {
  id: string;
  parties: { buyer: string; suppliers: string[] };
  pricePerUnit: number;
  totalValue: number;
  milestones: Array<{ name: string; pct: number; days: number }>;
  penalties: string[];
  incoterms: string;
  jurisdiction: string;
  generatedAt: number;
}

export interface EscrowState {
  id: string;
  fundedAt: number | null;
  totalValue: number;
  releases: Array<{ milestone: string; pct: number; releasedAt: number | null }>;
  insurancePremiumPct: number;
  bnplEnabled: boolean;
}

export interface LogisticsPlan {
  carrier: string;
  mode: "road" | "rail" | "air";
  route: string[];
  etaDays: number;
  riskOfDelayPct: number;
  costPerUnit: number;
  trackingId: string;
  checkpoints: Array<{ name: string; ts: number; status: "pending" | "done" }>;
}

export interface LearningSignal {
  ts: number;
  metric: string;
  value: number;
  delta: number;
}

export interface TradeDeal {
  id: string;
  createdAt: number;
  updatedAt: number;
  spec: DealSpec;
  stage: DealStage;
  logs: AgentLog[];
  candidates: CandidateSupplier[];
  negotiations: NegotiationRound[];
  simulations: DealSimulation[];
  chosenSimulation?: string;
  contract?: ContractTerms;
  escrow?: EscrowState;
  logistics?: LogisticsPlan;
  learning: LearningSignal[];
  finalPrice?: number;
  finalSupplierId?: string;
  outcomeNote?: string;
}

// ---------------------------------------------------------------------------
// Storage
// ---------------------------------------------------------------------------

export function loadDeals(): TradeDeal[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as TradeDeal[];
  } catch {
    return [];
  }
}

export function saveDeals(deals: TradeDeal[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(deals));
}

export function upsertDeal(deal: TradeDeal): TradeDeal[] {
  const all = loadDeals();
  const idx = all.findIndex((d) => d.id === deal.id);
  deal.updatedAt = Date.now();
  if (idx >= 0) all[idx] = deal;
  else all.unshift(deal);
  saveDeals(all);
  return all;
}

export function getDeal(id: string): TradeDeal | undefined {
  return loadDeals().find((d) => d.id === id);
}

export function deleteDeal(id: string) {
  saveDeals(loadDeals().filter((d) => d.id !== id));
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

function uid(prefix = "id"): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}${Date.now().toString(36).slice(-4)}`;
}

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function pseudoRandom(seed: string, min: number, max: number): number {
  const h = hash(seed);
  return min + (h % 1000) / 1000 * (max - min);
}

function pushLog(deal: TradeDeal, log: Omit<AgentLog, "ts">) {
  deal.logs.push({ ...log, ts: Date.now() });
}

// ---------------------------------------------------------------------------
// STEP 1 — Intent Understanding Agent
// ---------------------------------------------------------------------------

const SPEC_KEYWORDS = ["m6", "m8", "m10", "m12", "ss304", "ss316", "grade 8.8", "grade 10.9", "zinc", "galvanized", "hex", "allen", "din 933", "din 934"];
const CATEGORY_HINTS: Record<string, string[]> = {
  "Fasteners & Hardware": ["bolt", "screw", "nut", "washer", "fastener", "stud", "anchor", "rivet"],
  "Bearings & Gears": ["bearing", "gear", "pulley", "sprocket"],
  "Pipes & Fittings": ["pipe", "fitting", "valve", "flange"],
  "Electrical Components": ["wire", "cable", "switch", "relay", "contactor"],
  "Raw Materials": ["steel", "aluminium", "copper", "plastic"],
};

export function extractIntent(input: {
  text: string;
  quantity?: number;
  unit?: string;
  targetPrice?: number;
  deadline?: string;
  riskProfile?: RiskProfile;
  attachments?: string[];
}): DealSpec {
  const text = (input.text || "").toLowerCase();
  const specs: Record<string, string> = {};
  SPEC_KEYWORDS.forEach((k) => {
    if (text.includes(k)) specs[k.toUpperCase().includes("DIN") ? "standard" : k.match(/^m\d+/) ? "size" : "grade"] = k.toUpperCase();
  });
  if (text.match(/\d+\s*mm/)) specs.length = (text.match(/(\d+)\s*mm/) || ["", ""])[1] + "mm";

  let category = "General Industrial";
  let confidence = 0.55;
  for (const [cat, kws] of Object.entries(CATEGORY_HINTS)) {
    if (kws.some((k) => text.includes(k))) {
      category = cat;
      confidence = 0.85;
      break;
    }
  }

  const compliance: string[] = [];
  if (text.includes("iso")) compliance.push("ISO 9001");
  if (text.includes("bis") || text.includes("is ")) compliance.push("BIS / IS Std");
  if (text.includes("rohs")) compliance.push("RoHS");

  return {
    product: input.text.split("\n")[0].slice(0, 80) || "Unspecified product",
    specifications: specs,
    quantity: input.quantity || 1000,
    unit: input.unit || "Piece",
    targetPrice: input.targetPrice || 0,
    deliveryDeadline: input.deadline || new Date(Date.now() + 21 * 86400000).toISOString().slice(0, 10),
    compliance,
    riskProfile: input.riskProfile || "balanced",
    rawInput: input.text,
    attachments: input.attachments || [],
    inferredCategory: category,
    confidence,
  };
}

// ---------------------------------------------------------------------------
// Mock supplier universe (deterministic from product hash)
// ---------------------------------------------------------------------------

const SUPPLIER_POOL = [
  { id: "sup_bharat_forge", name: "Bharat Forge Components", city: "Pune", certs: ["ISO 9001", "IATF 16949"] },
  { id: "sup_jindal_fasteners", name: "Jindal Precision Fasteners", city: "Mumbai", certs: ["ISO 9001", "BIS"] },
  { id: "sup_sundaram", name: "Sundaram Industrial Supplies", city: "Pune", certs: ["ISO 9001"] },
  { id: "sup_kalyani_steel", name: "Kalyani Steel Works", city: "Pune", certs: ["ISO 14001", "ISO 9001"] },
  { id: "sup_mahindra_parts", name: "Mahindra Auto Parts", city: "Mumbai", certs: ["IATF 16949", "ISO 9001"] },
  { id: "sup_tata_hardware", name: "Tata Hardware Co.", city: "Mumbai", certs: ["ISO 9001", "BIS", "RoHS"] },
  { id: "sup_godrej_industrial", name: "Godrej Industrial", city: "Mumbai", certs: ["ISO 9001"] },
  { id: "sup_pune_precision", name: "Pune Precision Engineering", city: "Pune", certs: ["ISO 9001", "IATF 16949"] },
];

// ---------------------------------------------------------------------------
// STEP 2-4 — Matching, Trust, Pricing, Quality, Risk
// ---------------------------------------------------------------------------

export function generateCandidates(spec: DealSpec): CandidateSupplier[] {
  const seed = spec.product + spec.inferredCategory;
  const fairPrice = spec.targetPrice > 0
    ? spec.targetPrice
    : Math.round(pseudoRandom(seed + "fair", 12, 95));

  return SUPPLIER_POOL.map((s, i) => {
    const trust = Math.round(pseudoRandom(s.id + seed, 55, 96));
    const priceJitter = pseudoRandom(s.id + spec.product + i, 0.82, 1.18);
    const price = +(fairPrice * priceJitter).toFixed(2);
    const lead = Math.round(pseudoRandom(s.id + "lead", 5, 28));
    const defect = +pseudoRandom(s.id + "def", 0.4, 4.8).toFixed(2);
    const fulfillment = +pseudoRandom(s.id + "ful", 0.82, 0.99).toFixed(3);

    // Composite match score
    const priceScore = Math.max(0, 100 - Math.abs(price - fairPrice) / fairPrice * 200);
    const trustScore = trust;
    const deliveryScore = Math.max(0, 100 - lead * 2.5);
    const composite = Math.round(trustScore * 0.4 + priceScore * 0.35 + deliveryScore * 0.25);

    const reasons: string[] = [];
    if (trust >= 85) reasons.push("High verified trust");
    if (priceScore >= 80) reasons.push("Price within target band");
    if (lead <= 10) reasons.push("Fast lead time");
    if (s.certs.some((c) => spec.compliance.includes(c))) reasons.push("Compliance match");

    const flags: string[] = [];
    if (defect > 3.5) flags.push(`Defect risk ${defect}%`);
    if (fulfillment < 0.88) flags.push(`Fulfillment ${(fulfillment * 100).toFixed(0)}%`);
    if (priceJitter > 1.12) flags.push("Above-market price");

    return {
      id: s.id, name: s.name, city: s.city,
      trustScore: trust, pricePerUnit: price, leadTimeDays: lead,
      defectRiskPct: defect, fulfillmentRate: fulfillment,
      certifications: s.certs, matchScore: composite, reasons, flags,
    };
  }).sort((a, b) => b.matchScore - a.matchScore);
}

// ---------------------------------------------------------------------------
// STEP 2 — Negotiation Agent (multi-round)
// ---------------------------------------------------------------------------

export function runNegotiation(
  supplier: CandidateSupplier,
  spec: DealSpec,
  maxRounds = 4,
): { rounds: NegotiationRound[]; finalPrice: number; success: boolean } {
  const fair = spec.targetPrice > 0 ? spec.targetPrice : supplier.pricePerUnit * 0.92;
  const floor = supplier.pricePerUnit * 0.86;            // supplier won't go below
  let buyer = fair * 0.94;
  let seller = supplier.pricePerUnit;
  const rounds: NegotiationRound[] = [];

  for (let r = 1; r <= maxRounds; r++) {
    const gap = seller - buyer;
    const supplierMove = Math.max(floor, seller - gap * 0.35);
    const buyerMove = Math.min(supplierMove, buyer + gap * 0.4);
    const accepted = Math.abs(supplierMove - buyerMove) / supplierMove < 0.02;

    rounds.push({
      round: r, supplierId: supplier.id,
      buyerOffer: +buyerMove.toFixed(2),
      supplierCounter: +supplierMove.toFixed(2),
      rationale: accepted
        ? "Convergence reached — both sides within 2%."
        : r === 1
        ? "Opening offer based on fair market estimate."
        : `Closing gap (${((gap / seller) * 100).toFixed(1)}% remaining).`,
      accepted,
    });

    buyer = buyerMove;
    seller = supplierMove;
    if (accepted) {
      return { rounds, finalPrice: +supplierMove.toFixed(2), success: true };
    }
  }
  return { rounds, finalPrice: +seller.toFixed(2), success: false };
}

// ---------------------------------------------------------------------------
// STEP 4 — Deal Simulation (single vs multi-supplier split)
// ---------------------------------------------------------------------------

export function simulateDeals(
  spec: DealSpec,
  candidates: CandidateSupplier[],
): DealSimulation[] {
  const top = candidates.slice(0, 3);
  if (top.length === 0) return [];

  const single: DealSimulation = {
    name: "Single supplier — best match",
    strategy: "single",
    totalCost: top[0].pricePerUnit * spec.quantity,
    weightedLeadTime: top[0].leadTimeDays,
    weightedRisk: top[0].defectRiskPct,
    suppliers: [{ id: top[0].id, share: 1, cost: top[0].pricePerUnit * spec.quantity }],
    recommended: false,
    rationale: "Simplest path; single point of accountability.",
  };

  const split2: DealSimulation | null = top.length >= 2 ? {
    name: "Split 60/40 — top two",
    strategy: "split-2",
    totalCost: top[0].pricePerUnit * spec.quantity * 0.6 + top[1].pricePerUnit * spec.quantity * 0.4,
    weightedLeadTime: top[0].leadTimeDays * 0.6 + top[1].leadTimeDays * 0.4,
    weightedRisk: top[0].defectRiskPct * 0.6 + top[1].defectRiskPct * 0.4,
    suppliers: [
      { id: top[0].id, share: 0.6, cost: top[0].pricePerUnit * spec.quantity * 0.6 },
      { id: top[1].id, share: 0.4, cost: top[1].pricePerUnit * spec.quantity * 0.4 },
    ],
    recommended: false,
    rationale: "Reduces single-source risk; pricing slightly higher.",
  } : null;

  const split3: DealSimulation | null = top.length >= 3 ? {
    name: "Split 50/30/20 — diversified",
    strategy: "split-3",
    totalCost:
      top[0].pricePerUnit * spec.quantity * 0.5 +
      top[1].pricePerUnit * spec.quantity * 0.3 +
      top[2].pricePerUnit * spec.quantity * 0.2,
    weightedLeadTime: top[0].leadTimeDays * 0.5 + top[1].leadTimeDays * 0.3 + top[2].leadTimeDays * 0.2,
    weightedRisk: top[0].defectRiskPct * 0.5 + top[1].defectRiskPct * 0.3 + top[2].defectRiskPct * 0.2,
    suppliers: [
      { id: top[0].id, share: 0.5, cost: top[0].pricePerUnit * spec.quantity * 0.5 },
      { id: top[1].id, share: 0.3, cost: top[1].pricePerUnit * spec.quantity * 0.3 },
      { id: top[2].id, share: 0.2, cost: top[2].pricePerUnit * spec.quantity * 0.2 },
    ],
    recommended: false,
    rationale: "Maximum resilience; higher coordination overhead.",
  } : null;

  const sims = [single, split2, split3].filter(Boolean) as DealSimulation[];

  // Recommend based on risk profile
  if (spec.riskProfile === "conservative" && sims.length >= 2) {
    sims[sims.length - 1].recommended = true;
  } else if (spec.riskProfile === "aggressive") {
    sims[0].recommended = true;
  } else {
    sims[Math.min(1, sims.length - 1)].recommended = true;
  }
  return sims;
}

// ---------------------------------------------------------------------------
// STEP 5 — Contract & Escrow generation
// ---------------------------------------------------------------------------

export function generateContract(
  deal: TradeDeal,
  sim: DealSimulation,
  pricePerUnit: number,
): ContractTerms {
  return {
    id: uid("ctr"),
    parties: { buyer: "Buyer Org (Demo)", suppliers: sim.suppliers.map((s) => s.id) },
    pricePerUnit,
    totalValue: +sim.totalCost.toFixed(2),
    milestones: [
      { name: "Order confirmation", pct: 20, days: 0 },
      { name: "Production complete", pct: 40, days: 10 },
      { name: "Dispatch & QC pass", pct: 30, days: 18 },
      { name: "Delivery & acceptance", pct: 10, days: 25 },
    ],
    penalties: [
      "0.5% per day late delivery, capped at 10%",
      "Defect rate >2% triggers re-work at supplier cost",
      "Cancellation fee 5% after production starts",
    ],
    incoterms: "FOB Pune",
    jurisdiction: "Mumbai, Maharashtra",
    generatedAt: Date.now(),
  };
}

export function createEscrow(contract: ContractTerms, riskProfile: RiskProfile): EscrowState {
  const premium = riskProfile === "conservative" ? 2.5 : riskProfile === "balanced" ? 1.2 : 0.6;
  return {
    id: uid("esc"),
    fundedAt: null,
    totalValue: contract.totalValue,
    releases: contract.milestones.map((m) => ({ milestone: m.name, pct: m.pct, releasedAt: null })),
    insurancePremiumPct: premium,
    bnplEnabled: riskProfile !== "conservative",
  };
}

// ---------------------------------------------------------------------------
// STEP 6 — Logistics Agent
// ---------------------------------------------------------------------------

export function planLogistics(deal: TradeDeal): LogisticsPlan {
  const seed = deal.id + (deal.finalSupplierId || "");
  const eta = Math.round(pseudoRandom(seed + "eta", 6, 16));
  const carriers = ["BlueDart Logistics", "Delhivery Freight", "Safexpress", "VRL Logistics"];
  const carrier = carriers[hash(seed) % carriers.length];
  const risk = +pseudoRandom(seed + "risk", 4, 22).toFixed(1);

  return {
    carrier,
    mode: "road",
    route: ["Pune Plant", "Khopoli Hub", "Mumbai DC", "Buyer Warehouse"],
    etaDays: eta,
    riskOfDelayPct: risk,
    costPerUnit: +pseudoRandom(seed + "cost", 0.4, 2.1).toFixed(2),
    trackingId: uid("trk").toUpperCase(),
    checkpoints: [
      { name: "Picked up", ts: Date.now(), status: "done" },
      { name: "In transit — Khopoli", ts: Date.now() + 86400000, status: "pending" },
      { name: "Arrived at Mumbai DC", ts: Date.now() + 3 * 86400000, status: "pending" },
      { name: "Out for delivery", ts: Date.now() + (eta - 1) * 86400000, status: "pending" },
      { name: "Delivered", ts: Date.now() + eta * 86400000, status: "pending" },
    ],
  };
}

// ---------------------------------------------------------------------------
// Orchestrator — runs all agents in sequence with logging
// ---------------------------------------------------------------------------

export function createDealFromSpec(spec: DealSpec): TradeDeal {
  return {
    id: uid("deal"),
    createdAt: Date.now(),
    updatedAt: Date.now(),
    spec,
    stage: "intent",
    logs: [{
      agent: "Intent Capture", ts: Date.now(), status: "ok",
      message: `Captured intent: ${spec.product} × ${spec.quantity} ${spec.unit}`,
      data: { confidence: spec.confidence, category: spec.inferredCategory },
    }],
    candidates: [],
    negotiations: [],
    simulations: [],
    learning: [],
  };
}

export interface AgentStep {
  key: DealStage;
  label: string;
  run: (deal: TradeDeal) => void;
}

export const AGENT_PIPELINE: AgentStep[] = [
  {
    key: "understanding",
    label: "Understanding Agent",
    run: (d) => {
      const ambiguous = Object.keys(d.spec.specifications).length < 2;
      pushLog(d, {
        agent: "Understanding",
        status: ambiguous ? "warn" : "ok",
        message: ambiguous
          ? "Specs sparse — recommending DIN 933 hex bolt, grade 8.8 zinc plated as default."
          : `Spec normalized with ${Object.keys(d.spec.specifications).length} attributes.`,
        data: { specs: d.spec.specifications },
      });
    },
  },
  {
    key: "matching",
    label: "Supply Matching Agent",
    run: (d) => {
      d.candidates = generateCandidates(d.spec);
      pushLog(d, {
        agent: "Matching",
        status: "ok",
        message: `Identified ${d.candidates.length} candidate suppliers via semantic + graph match.`,
        data: { topMatch: d.candidates[0]?.name, score: d.candidates[0]?.matchScore },
      });
    },
  },
  {
    key: "trust",
    label: "Trust & Verification Agent",
    run: (d) => {
      const avg = d.candidates.reduce((s, c) => s + c.trustScore, 0) / Math.max(1, d.candidates.length);
      const flagged = d.candidates.filter((c) => c.flags.length > 0).length;
      pushLog(d, {
        agent: "Trust",
        status: flagged > d.candidates.length / 2 ? "warn" : "ok",
        message: `Avg trust ${avg.toFixed(0)}/100. ${flagged} suppliers carry risk flags.`,
        data: { avgTrust: avg, flagged },
      });
    },
  },
  {
    key: "pricing",
    label: "Pricing Intelligence Agent",
    run: (d) => {
      const prices = d.candidates.map((c) => c.pricePerUnit).sort((a, b) => a - b);
      const median = prices[Math.floor(prices.length / 2)];
      const anomalies = d.candidates.filter((c) => Math.abs(c.pricePerUnit - median) / median > 0.15).length;
      pushLog(d, {
        agent: "Pricing",
        status: "ok",
        message: `Fair market ≈ ₹${median.toFixed(2)}/${d.spec.unit}. ${anomalies} anomalous quotes detected.`,
        data: { median, anomalies },
      });
    },
  },
  {
    key: "negotiation",
    label: "Negotiation Agent",
    run: (d) => {
      const top = d.candidates[0];
      if (!top) return;
      const result = runNegotiation(top, d.spec);
      d.negotiations.push(...result.rounds);
      pushLog(d, {
        agent: "Negotiation",
        status: result.success ? "ok" : "warn",
        message: result.success
          ? `Converged in ${result.rounds.length} rounds @ ₹${result.finalPrice}/${d.spec.unit}.`
          : `No full convergence — best price ₹${result.finalPrice}.`,
        data: { rounds: result.rounds.length, finalPrice: result.finalPrice },
      });
      // bake negotiated price into top candidate
      d.candidates[0] = { ...top, pricePerUnit: result.finalPrice };
    },
  },
  {
    key: "quality",
    label: "Quality Prediction Agent",
    run: (d) => {
      const top = d.candidates[0];
      if (!top) return;
      pushLog(d, {
        agent: "Quality",
        status: top.defectRiskPct > 3 ? "warn" : "ok",
        message: `Predicted defect rate ${top.defectRiskPct}%, fulfillment ${(top.fulfillmentRate * 100).toFixed(1)}%.`,
        data: { defectRiskPct: top.defectRiskPct },
      });
    },
  },
  {
    key: "risk",
    label: "Risk Assessment Agent",
    run: (d) => {
      const top = d.candidates[0];
      if (!top) return;
      const score = Math.round(100 - top.trustScore * 0.6 - top.fulfillmentRate * 30 + top.defectRiskPct * 4);
      const tier = score < 25 ? "low" : score < 50 ? "moderate" : "elevated";
      pushLog(d, {
        agent: "Risk",
        status: tier === "elevated" ? "warn" : "ok",
        message: `Composite risk: ${score}/100 (${tier}). Recommending ${tier === "elevated" ? "escrow + insurance" : "standard escrow"}.`,
        data: { riskScore: score, tier },
      });
    },
  },
  {
    key: "simulation",
    label: "Deal Simulator",
    run: (d) => {
      d.simulations = simulateDeals(d.spec, d.candidates);
      const rec = d.simulations.find((s) => s.recommended);
      d.chosenSimulation = rec?.name;
      pushLog(d, {
        agent: "Simulator",
        status: "ok",
        message: `Ran ${d.simulations.length} scenarios. Recommended: ${rec?.name}.`,
        data: { scenarios: d.simulations.length, recommended: rec?.name },
      });
    },
  },
  {
    key: "contract",
    label: "Contract Agent",
    run: (d) => {
      const rec = d.simulations.find((s) => s.recommended) || d.simulations[0];
      if (!rec || !d.candidates[0]) return;
      d.contract = generateContract(d, rec, d.candidates[0].pricePerUnit);
      d.finalPrice = d.candidates[0].pricePerUnit;
      d.finalSupplierId = d.candidates[0].id;
      pushLog(d, {
        agent: "Contract",
        status: "ok",
        message: `Drafted enforceable contract ${d.contract.id} (₹${d.contract.totalValue.toLocaleString()}).`,
        data: { contractId: d.contract.id, total: d.contract.totalValue },
      });
    },
  },
  {
    key: "escrow",
    label: "Escrow & Payments",
    run: (d) => {
      if (!d.contract) return;
      d.escrow = createEscrow(d.contract, d.spec.riskProfile);
      d.escrow.fundedAt = Date.now();
      d.escrow.releases[0].releasedAt = Date.now();
      pushLog(d, {
        agent: "Escrow",
        status: "ok",
        message: `Escrow funded ₹${d.escrow.totalValue.toLocaleString()}. Insurance ${d.escrow.insurancePremiumPct}%. ${d.escrow.bnplEnabled ? "BNPL enabled." : ""}`,
        data: { escrowId: d.escrow.id, premium: d.escrow.insurancePremiumPct },
      });
    },
  },
  {
    key: "logistics",
    label: "Logistics Agent",
    run: (d) => {
      d.logistics = planLogistics(d);
      pushLog(d, {
        agent: "Logistics",
        status: d.logistics.riskOfDelayPct > 15 ? "warn" : "ok",
        message: `${d.logistics.carrier} • ETA ${d.logistics.etaDays} days • delay risk ${d.logistics.riskOfDelayPct}%.`,
        data: { carrier: d.logistics.carrier, eta: d.logistics.etaDays },
      });
    },
  },
  {
    key: "completed",
    label: "Learning Loop",
    run: (d) => {
      const baseline = 72;
      const newAcc = +(baseline + pseudoRandom(d.id + "learn", 0.4, 2.1)).toFixed(2);
      d.learning.push(
        { ts: Date.now(), metric: "Matching accuracy", value: newAcc, delta: +(newAcc - baseline).toFixed(2) },
        { ts: Date.now(), metric: "Negotiation savings %", value: +pseudoRandom(d.id + "sav", 4, 11).toFixed(2), delta: +pseudoRandom(d.id + "savd", 0.1, 0.6).toFixed(2) },
        { ts: Date.now(), metric: "Risk prediction F1", value: +pseudoRandom(d.id + "f1", 0.78, 0.92).toFixed(3), delta: +pseudoRandom(d.id + "f1d", 0.001, 0.012).toFixed(3) },
      );
      recordDealOutcome(d);
      const priors = computePriors();
      d.outcomeNote = `Deal executed end-to-end. Learning store now holds ${priors.deals} outcome${priors.deals === 1 ? "" : "s"}; matching accuracy ${priors.matchingAccuracyPct}%.`;
      pushLog(d, {
        agent: "Learning Loop",
        status: "ok",
        message: "Captured outcomes; pushed 3 signals and 1 deal record to the cross-deal learning store.",
        data: { signals: d.learning.length, storedOutcomes: computePriors().deals },
      });
    },
  },
];

export function runFullPipeline(deal: TradeDeal): TradeDeal {
  for (const step of AGENT_PIPELINE) {
    step.run(deal);
    deal.stage = step.key;
  }
  upsertDeal(deal);
  return deal;
}

export function runNextStep(deal: TradeDeal): { done: boolean; deal: TradeDeal } {
  const stages: DealStage[] = AGENT_PIPELINE.map((s) => s.key);
  const currentIdx = stages.indexOf(deal.stage as DealStage);
  const nextIdx = currentIdx + 1;
  if (nextIdx >= stages.length) return { done: true, deal };
  const step = AGENT_PIPELINE[nextIdx];
  step.run(deal);
  deal.stage = step.key;
  upsertDeal(deal);
  return { done: nextIdx === stages.length - 1, deal };
}

export const STAGE_ORDER: DealStage[] = [
  "intent", "understanding", "matching", "trust", "pricing",
  "negotiation", "quality", "risk", "simulation",
  "contract", "escrow", "logistics", "completed",
];
