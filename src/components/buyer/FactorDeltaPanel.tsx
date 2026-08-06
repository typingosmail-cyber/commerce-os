import React, { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import {
  ArrowUpRight, ArrowDownRight, Minus, ChevronDown, ChevronRight, Scale, Sparkles, UserCog,
} from "lucide-react";
import {
  computeFactorDeltas,
  type BuyerCreditProfile,
  type CreditLimitAuditEntry,
  type FactorDelta,
} from "@/lib/bnpl";

const fmt = (n: number) => `${n < 0 ? "-" : ""}₹${Math.abs(n).toLocaleString("en-IN")}`;
const signed = (n: number) => (n > 0 ? `+${fmt(n)}` : n < 0 ? fmt(n) : "₹0");

const WINDOWS = [30, 90, 180, 400] as const;

function DeltaChip({ value, suffix = "" }: { value: number; suffix?: string }) {
  const tone =
    value > 0 ? "text-success border-success/30 bg-success/10"
    : value < 0 ? "text-destructive border-destructive/30 bg-destructive/10"
    : "text-muted-foreground";
  const Icon = value > 0 ? ArrowUpRight : value < 0 ? ArrowDownRight : Minus;
  return (
    <Badge variant="outline" className={`${tone} text-[10px] gap-0.5 font-semibold`}>
      <Icon className="h-3 w-3" />
      {value > 0 ? "+" : ""}{value}{suffix}
    </Badge>
  );
}

function FactorRow({ f }: { f: FactorDelta }) {
  const [open, setOpen] = useState(false);
  const improved = f.scoreDelta > 0;
  const declined = f.scoreDelta < 0;

  return (
    <div className={`rounded-lg border p-4 ${improved ? "border-success/30 bg-success/5" : declined ? "border-destructive/30 bg-destructive/5" : ""}`}>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm text-foreground">{f.label}</span>
          <Badge variant="outline" className="text-[10px]">{f.weight}% weight</Badge>
          <DeltaChip value={f.scoreDelta} suffix=" pts" />
        </div>
        <div className="text-right">
          <p className="text-[11px] text-muted-foreground">Limit impact</p>
          <p className={`text-sm font-display font-bold ${f.limitContribution > 0 ? "text-success" : f.limitContribution < 0 ? "text-destructive" : "text-muted-foreground"}`}>
            {signed(f.limitContribution)}
          </p>
        </div>
      </div>

      {/* Before / after bars */}
      <div className="mt-3 space-y-2">
        <div className="flex items-center gap-3">
          <span className="w-12 text-[11px] text-muted-foreground shrink-0">Before</span>
          <Progress value={f.before} className="h-2 opacity-50" />
          <span className="w-12 text-right text-xs text-muted-foreground shrink-0">{f.before}/100</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="w-12 text-[11px] text-muted-foreground shrink-0">Now</span>
          <Progress value={f.after} className="h-2" />
          <span className="w-12 text-right text-xs font-semibold text-foreground shrink-0">{f.after}/100</span>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 text-[11px]">
        <div className="rounded-md border bg-background p-2">
          <p className="text-muted-foreground">Weighted before</p>
          <p className="font-semibold text-foreground">{f.weightedBefore} pts</p>
        </div>
        <div className="rounded-md border bg-background p-2">
          <p className="text-muted-foreground">Weighted now</p>
          <p className="font-semibold text-foreground">{f.weightedAfter} pts</p>
        </div>
        <div className="rounded-md border bg-background p-2">
          <p className="text-muted-foreground">Share of movement</p>
          <p className="font-semibold text-foreground">{f.contributionPct}%</p>
        </div>
      </div>

      {f.events.length > 0 && (
        <>
          <button
            onClick={() => setOpen((o) => !o)}
            className="mt-3 flex items-center gap-1 text-xs text-primary hover:underline"
          >
            {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
            {f.events.length} event{f.events.length > 1 ? "s" : ""} drove this change
          </button>
          {open && (
            <div className="mt-2 space-y-2 border-l-2 border-border pl-3">
              {f.events.map((e) => (
                <div key={e.id} className="text-xs">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="font-medium text-foreground">{e.title}</span>
                    <span className="text-[11px] text-muted-foreground">
                      {new Date(e.date).toLocaleDateString("en-IN")} ·{" "}
                      {e.factorBefore}→{e.factorAfter} · {signed(e.delta)}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{e.description}</p>
                </div>
              ))}
            </div>
          )}
        </>
      )}
      {f.events.length === 0 && (
        <p className="mt-3 text-[11px] text-muted-foreground italic">No recorded events in this window — score held steady.</p>
      )}
    </div>
  );
}

export function FactorDeltaPanel({
  profile, trail,
}: { profile: BuyerCreditProfile; trail: CreditLimitAuditEntry[] }) {
  const [windowDays, setWindowDays] = useState<number>(90);
  const report = useMemo(() => computeFactorDeltas(profile, trail, windowDays), [profile, trail, windowDays]);

  const movers = [...report.factors].sort((a, b) => Math.abs(b.limitContribution) - Math.abs(a.limitContribution));
  const topGain = movers.find((f) => f.limitContribution > 0);
  const topDrag = movers.find((f) => f.limitContribution < 0);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Scale className="h-5 w-5 text-primary" /> Factor Delta View
              </CardTitle>
              <CardDescription>
                What changed between {new Date(report.fromDate).toLocaleDateString("en-IN")} and today, and how each
                factor moved your approved limit.
              </CardDescription>
            </div>
            <div className="flex rounded-md border overflow-hidden">
              {WINDOWS.map((w) => (
                <button
                  key={w}
                  onClick={() => setWindowDays(w)}
                  className={`px-3 py-1.5 text-xs transition-colors ${windowDays === w ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
                >
                  {w >= 400 ? "All time" : `${w}d`}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">Limit before</p>
              <p className="text-xl font-display font-bold text-muted-foreground">{fmt(report.baselineLimit)}</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">Limit now</p>
              <p className="text-xl font-display font-bold text-primary">{fmt(report.currentLimit)}</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">Net movement</p>
              <p className={`text-xl font-display font-bold ${report.limitDelta >= 0 ? "text-success" : "text-destructive"}`}>
                {signed(report.limitDelta)}
              </p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">Composite score</p>
              <p className="text-xl font-display font-bold text-foreground">
                {report.baselineComposite} → {report.currentComposite}
                <span className="ml-1 align-middle"><DeltaChip value={report.compositeDelta} /></span>
              </p>
            </div>
          </div>

          {(topGain || topDrag) && (
            <div className="mt-4 rounded-lg border border-primary/30 bg-primary/5 p-3 text-xs flex gap-2">
              <Sparkles className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <span className="text-foreground">
                {topGain && <>Biggest lift: <strong>{topGain.label}</strong> ({signed(topGain.limitContribution)}). </>}
                {topDrag && <>Biggest drag: <strong>{topDrag.label}</strong> ({signed(topDrag.limitContribution)}). </>}
                Based on {report.eventCount} audited event{report.eventCount === 1 ? "" : "s"} in this window.
              </span>
            </div>
          )}

          {report.unattributedDelta !== 0 && (
            <div className="mt-2 rounded-lg border p-3 text-xs flex gap-2">
              <UserCog className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
              <span className="text-muted-foreground">
                {signed(report.unattributedDelta)} of recorded limit movement came from discretionary underwriter
                decisions not tied to a single factor.
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Factor-by-Factor Breakdown</CardTitle>
          <CardDescription>Before / after scores with the INR attributed to each move.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {movers.map((f) => <FactorRow key={f.label} f={f} />)}
        </CardContent>
      </Card>
    </div>
  );
}
