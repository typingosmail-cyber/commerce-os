import { BADGE_TIERS, getTier, type BadgeDefinition, type BadgeTier } from "./verification";

/**
 * Deterministically derive a verification tier for any supplier ID.
 * In the prototype we don't persist real verification per supplier, so we map
 * the supplier's trust score (0–1000) to a BadgeTier. This makes the same
 * supplier always render the same badge across search, RFQ matching, and
 * storefronts.
 */
export function getSupplierTier(supplierScore: number): BadgeDefinition {
  // Map trust score → verification score (0–100) with a slight curve so
  // mid-trust suppliers don't all collapse into one tier.
  const verificationScore = Math.min(100, Math.round((supplierScore / 1000) * 105));
  return getTier(verificationScore);
}

/** Numeric rank: higher = more trusted. Used for sorting & boosts. */
export function tierRank(tier: BadgeTier): number {
  const order: BadgeTier[] = ["unverified", "bronze", "silver", "gold", "platinum"];
  return order.indexOf(tier);
}

/**
 * Match-score boost (0–100 scale, before weighting) granted by the badge tier.
 * Platinum suppliers get a meaningful lift to surface them at the top of search
 * and RFQ matches.
 */
export function tierMatchBoost(tier: BadgeTier): number {
  switch (tier) {
    case "platinum": return 100;
    case "gold": return 80;
    case "silver": return 55;
    case "bronze": return 30;
    default: return 0;
  }
}

/**
 * Friction perks unlocked at each tier — surfaced to the buyer so they
 * understand *why* a higher-tier supplier is a safer pick.
 */
export interface TierPerks {
  escrowFeePct: number;          // platform escrow fee charged to buyer
  responseSlaHours: number;      // guaranteed first-response SLA
  bnplEligible: boolean;         // buyer can pay with BNPL credit
  prepayRequired: boolean;       // does the supplier require advance payment?
  guaranteeCovered: boolean;     // covered by Vyapar Deal Guarantee
}

export function getTierPerks(tier: BadgeTier): TierPerks {
  switch (tier) {
    case "platinum":
      return { escrowFeePct: 0, responseSlaHours: 1, bnplEligible: true, prepayRequired: false, guaranteeCovered: true };
    case "gold":
      return { escrowFeePct: 0.5, responseSlaHours: 2, bnplEligible: true, prepayRequired: false, guaranteeCovered: true };
    case "silver":
      return { escrowFeePct: 1.0, responseSlaHours: 6, bnplEligible: false, prepayRequired: false, guaranteeCovered: true };
    case "bronze":
      return { escrowFeePct: 1.5, responseSlaHours: 12, bnplEligible: false, prepayRequired: false, guaranteeCovered: false };
    default:
      return { escrowFeePct: 2.5, responseSlaHours: 48, bnplEligible: false, prepayRequired: true, guaranteeCovered: false };
  }
}

export function describeFrictionPerk(tier: BadgeTier): string[] {
  const p = getTierPerks(tier);
  const out: string[] = [];
  if (p.escrowFeePct === 0) out.push("0% escrow fee");
  else out.push(`${p.escrowFeePct}% escrow fee`);
  out.push(`Replies in ${p.responseSlaHours <= 1 ? "≤1 hr" : `≤${p.responseSlaHours} hrs`}`);
  if (p.bnplEligible) out.push("BNPL eligible");
  if (p.guaranteeCovered) out.push("Deal Guarantee");
  if (p.prepayRequired) out.push("Advance payment required");
  return out;
}

export { BADGE_TIERS };
export type { BadgeDefinition, BadgeTier };
