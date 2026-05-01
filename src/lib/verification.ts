export type DocStatus = "pending" | "uploaded" | "verified" | "rejected";
export type BadgeTier = "unverified" | "bronze" | "silver" | "gold" | "platinum";

export interface VerificationDoc {
  id: string;
  name: string;
  description: string;
  required: boolean;
  status: DocStatus;
  fileName?: string;
  uploadedAt?: string;
  reviewerNote?: string;
  weight: number; // contribution to score
}

export interface GSTCrossCheck {
  gstinMatches: boolean;
  legalNameMatches: boolean;
  addressMatches: boolean;
  panLinked: boolean;
  filingsUpToDate: boolean;
  riskFlags: string[];
  lastChecked: string;
}

export interface BadgeDefinition {
  tier: BadgeTier;
  label: string;
  minScore: number;
  perks: string[];
  color: string; // tailwind classes
  icon: string;
}

export const BADGE_TIERS: BadgeDefinition[] = [
  {
    tier: "unverified",
    label: "Unverified",
    minScore: 0,
    perks: ["Basic listing", "Limited buyer visibility"],
    color: "bg-muted text-muted-foreground",
    icon: "ShieldOff",
  },
  {
    tier: "bronze",
    label: "Bronze Verified",
    minScore: 30,
    perks: ["GST verified badge", "Eligible for inquiries", "Trust score boost +50"],
    color: "bg-amber-700/20 text-amber-700 border-amber-700/30",
    icon: "Shield",
  },
  {
    tier: "silver",
    label: "Silver Trusted",
    minScore: 60,
    perks: ["Featured in search", "Escrow eligibility", "Priority response queue"],
    color: "bg-slate-400/20 text-slate-600 border-slate-400/40",
    icon: "ShieldCheck",
  },
  {
    tier: "gold",
    label: "Gold Premium",
    minScore: 80,
    perks: ["Top 10% placement", "BNPL credit unlocked", "Dedicated account manager"],
    color: "bg-yellow-500/20 text-yellow-700 border-yellow-500/40",
    icon: "Award",
  },
  {
    tier: "platinum",
    label: "Platinum Elite",
    minScore: 95,
    perks: ["Hero placement on category pages", "0% escrow fees", "Verified factory tour badge", "Co-marketing with Vyapar OS"],
    color: "bg-gradient-to-r from-indigo-500/20 to-purple-500/20 text-indigo-700 border-indigo-500/40",
    icon: "Crown",
  },
];

export const DEFAULT_DOCS: VerificationDoc[] = [
  { id: "gst", name: "GST Certificate", description: "Latest GST registration certificate (PDF)", required: true, status: "pending", weight: 20 },
  { id: "pan", name: "PAN Card", description: "Business or proprietor PAN", required: true, status: "pending", weight: 10 },
  { id: "incorporation", name: "Incorporation / Udyam", description: "Company incorporation or MSME Udyam certificate", required: true, status: "pending", weight: 15 },
  { id: "address", name: "Address Proof", description: "Utility bill or rent agreement (≤ 3 months)", required: true, status: "pending", weight: 10 },
  { id: "bank", name: "Bank Account Proof", description: "Cancelled cheque or bank verification letter", required: true, status: "pending", weight: 15 },
  { id: "iso", name: "ISO / Quality Cert.", description: "ISO 9001, BIS, or industry quality certifications", required: false, status: "pending", weight: 10 },
  { id: "factory", name: "Factory Photos", description: "5+ photos of manufacturing/warehouse facility", required: false, status: "pending", weight: 10 },
  { id: "export", name: "Export License (IEC)", description: "Importer-Exporter Code (if exporting)", required: false, status: "pending", weight: 5 },
  { id: "trademark", name: "Trademark / Brand Cert.", description: "Trademark registration for own brand", required: false, status: "pending", weight: 5 },
];

export function computeScore(docs: VerificationDoc[], gstCheck: GSTCrossCheck | null): number {
  const docScore = docs.reduce((sum, d) => sum + (d.status === "verified" ? d.weight : 0), 0);
  let gstBonus = 0;
  if (gstCheck) {
    if (gstCheck.gstinMatches) gstBonus += 4;
    if (gstCheck.legalNameMatches) gstBonus += 4;
    if (gstCheck.addressMatches) gstBonus += 3;
    if (gstCheck.panLinked) gstBonus += 3;
    if (gstCheck.filingsUpToDate) gstBonus += 6;
    gstBonus -= gstCheck.riskFlags.length * 3;
  }
  return Math.max(0, Math.min(100, docScore + gstBonus));
}

export function getTier(score: number): BadgeDefinition {
  return [...BADGE_TIERS].reverse().find(t => score >= t.minScore) ?? BADGE_TIERS[0];
}

export function getNextTier(score: number): BadgeDefinition | null {
  return BADGE_TIERS.find(t => score < t.minScore) ?? null;
}

export function mockGSTCrossCheck(gstin: string): GSTCrossCheck {
  const seed = gstin.length;
  const flags: string[] = [];
  if (seed % 7 === 0) flags.push("Recent address change detected");
  return {
    gstinMatches: true,
    legalNameMatches: true,
    addressMatches: seed % 3 !== 0,
    panLinked: true,
    filingsUpToDate: seed % 5 !== 0,
    riskFlags: flags,
    lastChecked: new Date().toISOString(),
  };
}
