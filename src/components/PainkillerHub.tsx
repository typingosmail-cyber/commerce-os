import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ShieldCheck, Zap, IndianRupee, Wallet, ArrowRight, Brain, FileSearch,
  Handshake, Truck, ShoppingCart, Building2, Sparkles, AlertTriangle,
  TrendingDown, Clock, CheckCircle2,
} from "lucide-react";

type Persona = "buyer" | "supplier";

interface Painkiller {
  id: string;
  icon: React.ElementType;
  pain: string;
  cure: string;
  proof: string;
  cta: { label: string; path: string };
  highlights: string[];
  accent: string; // tailwind text color
  bgAccent: string;
}

const BUYER_PAINKILLERS: Painkiller[] = [
  {
    id: "trust",
    icon: ShieldCheck,
    pain: "Supplier turned out to be a fraud",
    cure: "Live trust score, GST + document checks, fraud radar on every supplier before you talk.",
    proof: "94% of risky suppliers flagged before first PO",
    cta: { label: "See trust engine", path: "/admin/fraud" },
    highlights: ["Risk timeline audit", "False-positive recalibration", "Critical-risk auto-alerts"],
    accent: "text-success",
    bgAccent: "bg-success/10",
  },
  {
    id: "speed",
    icon: Zap,
    pain: "Sourcing takes 2–3 weeks of back-and-forth",
    cure: "Trade OS turns one intent into matched suppliers, negotiated quotes and a signed contract.",
    proof: "Intent → contract in under 12 minutes (median)",
    cta: { label: "Launch Trade OS", path: "/trade-os" },
    highlights: ["8-agent autonomous pipeline", "AI negotiation transcripts", "Escrow auto-wired"],
    accent: "text-primary",
    bgAccent: "bg-primary/10",
  },
  {
    id: "price",
    icon: TrendingDown,
    pain: "No idea if you're being overcharged",
    cure: "Live price benchmarks, bulk-pricing calculator and 'best price guaranteed' deal cards.",
    proof: "Avg. 11–18% savings vs. offline quotes",
    cta: { label: "See price intelligence", path: "/intelligence" },
    highlights: ["90-day price trends", "Multi-supplier compare", "Bulk-tier calculator"],
    accent: "text-secondary-foreground",
    bgAccent: "bg-secondary/30",
  },
  {
    id: "capital",
    icon: Wallet,
    pain: "Cash blocked, can't take big orders",
    cure: "Instant BNPL limits and escrow-protected milestone payments — pay only on delivery.",
    proof: "Up to ₹50L revolving limit, decisions in 90 sec",
    cta: { label: "Check BNPL limit", path: "/buyer/credit" },
    highlights: ["Auto-repayment from receivables", "0% escrow for Platinum", "Dispute-backed releases"],
    accent: "text-destructive",
    bgAccent: "bg-destructive/10",
  },
];

const SUPPLIER_PAINKILLERS: Painkiller[] = [
  {
    id: "leads",
    icon: Brain,
    pain: "Leads are mostly tyre-kickers",
    cure: "Intent-scored RFQs with budget, deadline and trust signals — see who's actually buying.",
    proof: "3.2× higher RFQ→order conversion",
    cta: { label: "Open supplier feed", path: "/supplier/dashboard" },
    highlights: ["AI intent scoring", "Demand forecasts", "Auto-quote drafts"],
    accent: "text-primary",
    bgAccent: "bg-primary/10",
  },
  {
    id: "badge",
    icon: ShieldCheck,
    pain: "Hard to stand out vs. cheap unverified sellers",
    cure: "Earn Bronze → Platinum verification badges that boost ranking and unlock perks.",
    proof: "Gold+ suppliers get 4.1× more inquiries",
    cta: { label: "Get verified", path: "/supplier/verification" },
    highlights: ["GSTIN + bank + KYC", "0% escrow at Platinum", "BNPL-eligible buyers"],
    accent: "text-success",
    bgAccent: "bg-success/10",
  },
  {
    id: "payout",
    icon: IndianRupee,
    pain: "Buyers delay payment for 60–90 days",
    cure: "Escrow-locked funds on dispatch, instant payout on delivery confirmation.",
    proof: "Avg. payout T+1 vs. industry T+62",
    cta: { label: "Open Escrow Center", path: "/escrow" },
    highlights: ["Milestone releases", "Dispute SLA 48h", "Auto-reconciliation"],
    accent: "text-destructive",
    bgAccent: "bg-destructive/10",
  },
  {
    id: "growth",
    icon: Sparkles,
    pain: "No clue what's moving in the market",
    cure: "Supplier analytics, demand forecasting and benchmark vs. category leaders.",
    proof: "Top 10% suppliers grow 28% QoQ",
    cta: { label: "View analytics", path: "/supplier/analytics" },
    highlights: ["Revenue projections", "Category benchmarks", "Conversion funnel"],
    accent: "text-secondary-foreground",
    bgAccent: "bg-secondary/30",
  },
];

const BUYER_STEPS = [
  { icon: FileSearch, title: "Drop your intent", desc: "Type, paste a BOM or talk to it." },
  { icon: Brain, title: "AI matches & ranks", desc: "Trust × Price × Delivery composite." },
  { icon: Handshake, title: "Auto-negotiate", desc: "Multi-round AI negotiation, you approve." },
  { icon: Truck, title: "Escrow + deliver", desc: "Contract, payment, logistics — wired." },
];

const SUPPLIER_STEPS = [
  { icon: Building2, title: "Verify business", desc: "GSTIN + bank + KYC in minutes." },
  { icon: Brain, title: "Receive scored leads", desc: "Only buyers who match your capacity." },
  { icon: Handshake, title: "Quote & negotiate", desc: "AI drafts, you tune the price." },
  { icon: IndianRupee, title: "Get paid on dispatch", desc: "Escrow releases T+1, no chasing." },
];

export function PainkillerHub() {
  const navigate = useNavigate();
  const [persona, setPersona] = useState<Persona>("buyer");

  const list = persona === "buyer" ? BUYER_PAINKILLERS : SUPPLIER_PAINKILLERS;
  const steps = persona === "buyer" ? BUYER_STEPS : SUPPLIER_STEPS;

  return (
    <section className="bg-gradient-to-b from-background to-muted/40 border-y">
      <div className="container py-14 md:py-20">
        {/* Header */}
        <div className="flex flex-col items-center text-center max-w-3xl mx-auto">
          <Badge variant="outline" className="mb-3 gap-1 border-secondary/40 text-secondary-foreground bg-secondary/10">
            <Sparkles className="h-3 w-3" /> The B2B Painkiller
          </Badge>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground leading-tight">
            Sourcing is broken. <span className="text-primary">We fixed the four things</span> that bleed your business.
          </h2>
          <p className="text-muted-foreground mt-3 text-base">
            Not another marketplace. An autonomous Trade OS that engineers trust, kills delays,
            crushes price opacity and unlocks working capital — for both sides of every deal.
          </p>

          {/* Persona toggle */}
          <div className="mt-6 inline-flex bg-muted p-1 rounded-full border">
            <button
              onClick={() => setPersona("buyer")}
              className={`px-5 py-2 rounded-full text-sm font-semibold transition-all flex items-center gap-1.5 ${
                persona === "buyer" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <ShoppingCart className="h-4 w-4" /> I'm buying
            </button>
            <button
              onClick={() => setPersona("supplier")}
              className={`px-5 py-2 rounded-full text-sm font-semibold transition-all flex items-center gap-1.5 ${
                persona === "supplier" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Building2 className="h-4 w-4" /> I'm selling
            </button>
          </div>
        </div>

        {/* Painkiller cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-10">
          {list.map((pk) => (
            <Card
              key={pk.id}
              className="group relative overflow-hidden hover:shadow-xl hover:-translate-y-0.5 transition-all border-border/60"
            >
              <div className={`absolute inset-x-0 top-0 h-1 ${pk.bgAccent}`} />
              <CardContent className="p-5 flex flex-col h-full">
                <div className={`h-11 w-11 rounded-xl ${pk.bgAccent} flex items-center justify-center mb-4`}>
                  <pk.icon className={`h-5 w-5 ${pk.accent}`} />
                </div>
                <div className="flex items-start gap-1.5 text-xs text-destructive font-medium mb-1">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                  <span>{pk.pain}</span>
                </div>
                <p className="text-sm font-semibold text-foreground mt-2 leading-snug">{pk.cure}</p>
                <div className="flex items-center gap-1.5 mt-3 text-xs text-success font-medium">
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                  <span>{pk.proof}</span>
                </div>
                <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
                  {pk.highlights.map((h) => (
                    <li key={h} className="flex items-center gap-1.5">
                      <span className="h-1 w-1 rounded-full bg-muted-foreground/50" /> {h}
                    </li>
                  ))}
                </ul>
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-auto pt-4 justify-start px-0 text-primary hover:bg-transparent hover:text-primary group-hover:translate-x-0.5 transition-transform"
                  onClick={() => navigate(pk.cta.path)}
                >
                  {pk.cta.label} <ArrowRight className="h-3.5 w-3.5 ml-1" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Flow strip */}
        <div className="mt-12 rounded-2xl border bg-card p-6 md:p-8">
          <div className="flex flex-wrap items-end justify-between gap-3 mb-6">
            <div>
              <h3 className="text-xl font-bold text-foreground">
                {persona === "buyer" ? "From intent to executed deal" : "From signup to first payout"}
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                {persona === "buyer"
                  ? "One flow. Four steps. Fully autonomous — or human-in-the-loop when you want it."
                  : "Get verified, get matched, get paid. The platform does the heavy lifting."}
              </p>
            </div>
            <Badge variant="secondary" className="gap-1">
              <Clock className="h-3 w-3" /> Median: {persona === "buyer" ? "12 min" : "24 hrs"}
            </Badge>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {steps.map((s, i) => (
              <div key={s.title} className="relative">
                <div className="flex items-center gap-3 p-4 rounded-xl bg-muted/40 border border-border/50 h-full">
                  <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <s.icon className="h-4 w-4 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Step {i + 1}</p>
                    <p className="text-sm font-semibold text-foreground leading-tight">{s.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{s.desc}</p>
                  </div>
                </div>
                {i < steps.length - 1 && (
                  <ArrowRight className="hidden md:block absolute -right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40 z-10" />
                )}
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-3 mt-6">
            {persona === "buyer" ? (
              <>
                <Button size="lg" onClick={() => navigate("/trade-os")} className="gap-2">
                  <Brain className="h-4 w-4" /> Try Trade OS free
                </Button>
                <Button size="lg" variant="outline" onClick={() => navigate("/buyer/dashboard")}>
                  Post a requirement
                </Button>
                <Button size="lg" variant="ghost" onClick={() => navigate("/buyer/credit")}>
                  Get BNPL limit <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </>
            ) : (
              <>
                <Button size="lg" onClick={() => navigate("/supplier/onboarding")} className="gap-2">
                  <Building2 className="h-4 w-4" /> List your business — free
                </Button>
                <Button size="lg" variant="outline" onClick={() => navigate("/supplier/verification")}>
                  Get verified
                </Button>
                <Button size="lg" variant="ghost" onClick={() => navigate("/supplier/analytics")}>
                  See growth tools <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Bottom proof bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-8">
          {[
            { k: "₹0", v: "Escrow fee at Platinum tier" },
            { k: "48h", v: "Dispute resolution SLA" },
            { k: "T+1", v: "Supplier payout on delivery" },
            { k: "94%", v: "Fraud signals caught pre-PO" },
          ].map((m) => (
            <div key={m.v} className="text-center p-4 rounded-xl bg-card border">
              <p className="text-2xl font-bold text-primary">{m.k}</p>
              <p className="text-xs text-muted-foreground mt-1">{m.v}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
