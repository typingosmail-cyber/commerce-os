import type { BadgeTier } from "./verification";
import type { MatchedSupplier } from "./supplier-matching";

export interface TierQuestion {
  id: string;
  text: string;
  tiers: BadgeTier[]; // tiers this question targets
  rationale: string;
}

export interface NegotiationTerm {
  id: string;
  label: string;
  detail: string;
  tiers: BadgeTier[];
}

export interface RFQAddendum {
  shortlistTiers: BadgeTier[];
  questions: TierQuestion[];
  terms: NegotiationTerm[];
}

const QUESTION_LIBRARY: TierQuestion[] = [
  // High-tier (Gold/Platinum) — push for premium commercial terms
  {
    id: "q-volume-discount",
    text: "What volume-tier discounts apply for 2x, 5x, and 10x the requested quantity?",
    tiers: ["platinum", "gold"],
    rationale: "Top-tier suppliers typically offer slab pricing.",
  },
  {
    id: "q-net-terms",
    text: "Can you extend Net 30 / Net 60 credit terms via BNPL on this order?",
    tiers: ["platinum", "gold"],
    rationale: "BNPL eligible — unlock working capital.",
  },
  {
    id: "q-account-manager",
    text: "Will a dedicated account manager be assigned for this order and follow-ups?",
    tiers: ["platinum"],
    rationale: "Platinum SLA includes named account ownership.",
  },
  {
    id: "q-custom-pack",
    text: "Can you support custom packaging / private labeling? Share MOQ and lead-time impact.",
    tiers: ["platinum", "gold"],
    rationale: "High-tier suppliers typically have private-label capacity.",
  },
  // Mid-tier (Silver) — quality + flexibility
  {
    id: "q-certifications",
    text: "Please share applicable quality certifications (ISO, IS, ASTM) and recent test reports.",
    tiers: ["silver", "bronze"],
    rationale: "Verify documented quality compliance.",
  },
  {
    id: "q-sample",
    text: "Can you ship a paid/free sample before the bulk order? What is the sample lead time?",
    tiers: ["silver", "bronze"],
    rationale: "De-risk first-time orders with samples.",
  },
  {
    id: "q-moq-flex",
    text: "Is there flexibility on MOQ for a trial order?",
    tiers: ["silver", "bronze"],
    rationale: "Mid-tier suppliers often flex MOQ on trial orders.",
  },
  // Bronze / Unverified — risk control
  {
    id: "q-gst-invoice",
    text: "Confirm GST invoice will be issued with full HSN code and tax breakup.",
    tiers: ["bronze", "unverified"],
    rationale: "Mandatory for input tax credit.",
  },
  {
    id: "q-advance-pct",
    text: "What advance percentage do you require? Are you open to milestone-based release via escrow?",
    tiers: ["bronze", "unverified"],
    rationale: "Newer suppliers usually require advance — escrow protects buyer.",
  },
  {
    id: "q-third-party-qc",
    text: "Do you accept third-party pre-dispatch inspection (e.g. SGS / Bureau Veritas)?",
    tiers: ["unverified"],
    rationale: "Unverified suppliers require independent quality checks.",
  },
  // Universal
  {
    id: "q-lead-confirm",
    text: "Confirm guaranteed lead time from PO date and penalty for delay.",
    tiers: ["platinum", "gold", "silver", "bronze", "unverified"],
    rationale: "Lock delivery commitment with penalty clause.",
  },
];

const TERM_LIBRARY: NegotiationTerm[] = [
  {
    id: "t-escrow-0",
    label: "0% escrow fee",
    detail: "Buyer pays no escrow fee — covered by supplier tier perk.",
    tiers: ["platinum"],
  },
  {
    id: "t-escrow-half",
    label: "0.5% escrow fee",
    detail: "Reduced escrow fee for Gold-tier counterparty.",
    tiers: ["gold"],
  },
  {
    id: "t-escrow-std",
    label: "Standard escrow protection",
    detail: "Funds held in Vyapar escrow, released on delivery confirmation.",
    tiers: ["silver", "bronze", "unverified"],
  },
  {
    id: "t-bnpl",
    label: "Net 30 BNPL credit",
    detail: "Buyer may opt for BNPL — 30-day credit, auto-repaid from receivables.",
    tiers: ["platinum", "gold"],
  },
  {
    id: "t-sla-1h",
    label: "≤1 hr response SLA",
    detail: "Quote response within 1 hour or auto-reroute to next-best supplier.",
    tiers: ["platinum"],
  },
  {
    id: "t-sla-6h",
    label: "≤6 hr response SLA",
    detail: "Quote response within 6 hours.",
    tiers: ["silver", "gold"],
  },
  {
    id: "t-deal-guarantee",
    label: "Vyapar Deal Guarantee",
    detail: "Order covered by money-back guarantee on quality or delivery failure.",
    tiers: ["platinum", "gold", "silver"],
  },
  {
    id: "t-milestone",
    label: "50/50 milestone payment",
    detail: "50% on dispatch confirmation, 50% on delivery — via escrow.",
    tiers: ["silver", "bronze"],
  },
  {
    id: "t-advance-escrow",
    label: "100% advance held in escrow",
    detail: "Full payment routed via escrow; released only on third-party QC pass.",
    tiers: ["unverified"],
  },
  {
    id: "t-penalty",
    label: "0.5% / day late-delivery penalty",
    detail: "Applied on order value beyond the committed delivery date, capped at 10%.",
    tiers: ["platinum", "gold", "silver", "bronze", "unverified"],
  },
];

/**
 * Build an addendum (tier-aware questions + negotiation terms) for a shortlist
 * of matched suppliers. We dedupe across tiers represented in the shortlist.
 */
export function buildRFQAddendum(shortlist: MatchedSupplier[]): RFQAddendum {
  const tiers = Array.from(new Set(shortlist.map((s) => s.tier))) as BadgeTier[];

  const questions = QUESTION_LIBRARY.filter((q) =>
    q.tiers.some((t) => tiers.includes(t))
  );
  const terms = TERM_LIBRARY.filter((t) =>
    t.tiers.some((tier) => tiers.includes(tier))
  );

  return { shortlistTiers: tiers, questions, terms };
}

/** Render the selected addendum as a plain-text block appended to RFQ description. */
export function formatAddendumText(
  questions: TierQuestion[],
  terms: NegotiationTerm[]
): string {
  if (questions.length === 0 && terms.length === 0) return "";
  const lines: string[] = ["", "---", "AUTO-INCLUDED SUPPLIER QUESTIONS:"];
  questions.forEach((q, i) => lines.push(`${i + 1}. ${q.text}`));
  if (terms.length > 0) {
    lines.push("", "PROPOSED NEGOTIATION TERMS:");
    terms.forEach((t) => lines.push(`• ${t.label} — ${t.detail}`));
  }
  return lines.join("\n");
}
