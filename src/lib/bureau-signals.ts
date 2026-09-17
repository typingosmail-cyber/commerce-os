import { supabase } from "@/integrations/supabase/client";
import type { BureauMetrics } from "./bnpl";

/** Raw payload returned by the bureau / fraud aggregation API. */
export interface BureauReport {
  buyerId: string;
  provider: "live" | "simulated";
  fetchedAt: string;
  entity: {
    legalName: string;
    gstin: string | null;
    pan: string | null;
    vintageMonths: number;
  };
  bureau: {
    commercialScore: number;
    scoreBand: "low" | "moderate" | "elevated" | "high";
    maxDpdLast12m: number;
    accountsWithDpd90Plus: number;
    writtenOffAmount: number;
    suitFiledCount: number;
    creditEnquiriesLast30d: number;
    totalSanctionedLimit: number;
    utilisationPct: number;
    chequeBouncesLast6m: number;
  };
  compliance: {
    gstFilingDefaults12m: number;
    gstStatus: "active" | "suspended" | "cancelled";
    epfoArrears: boolean;
    directorDisqualified: boolean;
  };
  fraud: {
    consortiumHits: number;
    syntheticIdentityScore: number;
    watchlistHit: boolean;
    pepMatch: boolean;
    negativeMediaMentions: number;
    linkedDefaulterEntities: number;
  };
}

export interface BureauFetchInput {
  buyerId: string;
  gstin?: string;
  pan?: string;
  legalName?: string;
}

const CACHE_KEY = "vyapar_bureau_reports_v1";

type Cache = Record<string, BureauReport>;

function loadCache(): Cache {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (raw) return JSON.parse(raw) as Cache;
  } catch { /* ignore */ }
  return {};
}

export function cachedReport(buyerId: string): BureauReport | undefined {
  return loadCache()[buyerId];
}

export function clearReports() {
  localStorage.removeItem(CACHE_KEY);
}

/** Pull external bureau + fraud consortium signals through the backend function. */
export async function fetchBureauReport(input: BureauFetchInput): Promise<BureauReport> {
  const { data, error } = await supabase.functions.invoke("bureau-signals", { body: input });
  if (error) throw new Error(error.message);
  if (!data || (data as { error?: string }).error) {
    throw new Error((data as { error?: string })?.error ?? "Bureau pull failed");
  }
  const report = data as BureauReport;
  const cache = loadCache();
  cache[input.buyerId] = report;
  localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  return report;
}

/** Map the external payload onto the metrics the risk engine understands. */
export function toBureauMetrics(r: BureauReport): BureauMetrics {
  return {
    bureauCommercialScore: r.bureau.commercialScore,
    bureauMaxDpd12m: r.bureau.maxDpdLast12m,
    bureauAccounts90Plus: r.bureau.accountsWithDpd90Plus,
    bureauWrittenOffAmount: r.bureau.writtenOffAmount,
    bureauSuitFiled: r.bureau.suitFiledCount,
    bureauEnquiries30d: r.bureau.creditEnquiriesLast30d,
    bureauUtilisationPct: r.bureau.utilisationPct,
    bureauChequeBounces6m: r.bureau.chequeBouncesLast6m,
    gstFilingDefaults12m: r.compliance.gstFilingDefaults12m,
    gstRegistrationInactive: r.compliance.gstStatus === "active" ? 0 : 1,
    fraudConsortiumHits: r.fraud.consortiumHits,
    syntheticIdentityScore: r.fraud.syntheticIdentityScore,
    watchlistHit: r.fraud.watchlistHit || r.fraud.pepMatch || r.compliance.directorDisqualified ? 1 : 0,
    linkedDefaulterEntities: r.fraud.linkedDefaulterEntities,
    negativeMediaMentions: r.fraud.negativeMediaMentions,
  };
}

export const SCORE_BAND_TONE: Record<BureauReport["bureau"]["scoreBand"], string> = {
  low: "bg-success/10 text-success border-success/30",
  moderate: "bg-primary/10 text-primary border-primary/30",
  elevated: "bg-yellow-500/15 text-yellow-700 border-yellow-500/30",
  high: "bg-destructive/15 text-destructive border-destructive/30",
};

/** Short human summary lines for a report, for display in the UI. */
export function bureauHighlights(r: BureauReport): { label: string; value: string; bad: boolean }[] {
  return [
    { label: "Commercial score", value: `${r.bureau.commercialScore} (${r.bureau.scoreBand} risk)`, bad: r.bureau.commercialScore < 700 },
    { label: "Worst DPD (12m)", value: `${r.bureau.maxDpdLast12m} days`, bad: r.bureau.maxDpdLast12m >= 30 },
    { label: "Written off elsewhere", value: `₹${r.bureau.writtenOffAmount.toLocaleString("en-IN")}`, bad: r.bureau.writtenOffAmount > 0 },
    { label: "Enquiries (30d)", value: `${r.bureau.creditEnquiriesLast30d}`, bad: r.bureau.creditEnquiriesLast30d >= 5 },
    { label: "Cheque bounces (6m)", value: `${r.bureau.chequeBouncesLast6m}`, bad: r.bureau.chequeBouncesLast6m >= 2 },
    { label: "GST status", value: r.compliance.gstStatus, bad: r.compliance.gstStatus !== "active" },
    { label: "GST filing defaults", value: `${r.compliance.gstFilingDefaults12m}`, bad: r.compliance.gstFilingDefaults12m >= 3 },
    { label: "Fraud consortium hits", value: `${r.fraud.consortiumHits}`, bad: r.fraud.consortiumHits > 0 },
    { label: "Synthetic identity", value: `${r.fraud.syntheticIdentityScore}/100`, bad: r.fraud.syntheticIdentityScore >= 70 },
    { label: "Watchlist / PEP", value: r.fraud.watchlistHit || r.fraud.pepMatch ? "match" : "clear", bad: r.fraud.watchlistHit || r.fraud.pepMatch },
    { label: "Linked defaulters", value: `${r.fraud.linkedDefaulterEntities}`, bad: r.fraud.linkedDefaulterEntities > 0 },
    { label: "Adverse media", value: `${r.fraud.negativeMediaMentions}`, bad: r.fraud.negativeMediaMentions >= 2 },
  ];
}
