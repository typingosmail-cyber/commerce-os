import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { cachedReport, toBureauMetrics } from "@/lib/bureau-signals";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import {
  mockProfile, evaluateBuyerRisk, mockBuyerRiskMetrics, buyerRiskTone,
  type BuyerRiskCategory,
} from "@/lib/bnpl";
import {
  generateRiskAuditTrail, summarizeRiskAudit, ruleDef, riskAuditToCsv,
  submitAppeal, loadAppeals, APPEAL_REASONS,
  type RiskLimitEvent,
} from "@/lib/risk-audit";
import {
  ShieldAlert, Search, Download, ArrowDownRight, ArrowUpRight, ChevronDown,
  Gauge, Fingerprint, Activity, Scale, Zap, Wallet, Clock, FileSearch, Ban,
  Snowflake, Eye, ShieldCheck, ArrowLeft,
} from "lucide-react";

const fmt = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;

const CATEGORY_META: Record<BuyerRiskCategory, { label: string; icon: React.ElementType }> = {
  repayment: { label: "Repayment", icon: Wallet },
  velocity: { label: "Velocity", icon: Zap },
  identity: { label: "Identity", icon: Fingerprint },
  device: { label: "Device & login", icon: Activity },
  dispute: { label: "Disputes", icon: Scale },
  behavior: { label: "Behaviour", icon: Gauge },
  exposure: { label: "Exposure", icon: ShieldAlert },
};

const ACTION_META = {
  monitor: { label: "Monitoring only", icon: Eye, tone: "bg-muted text-muted-foreground border-border" },
  reduce_limit: { label: "Limit reduced", icon: ArrowDownRight, tone: "bg-orange-500/15 text-orange-700 border-orange-500/30" },
  freeze_new: { label: "New drawdowns frozen", icon: Snowflake, tone: "bg-yellow-500/15 text-yellow-700 border-yellow-500/30" },
  block: { label: "Account blocked", icon: Ban, tone: "bg-destructive/15 text-destructive border-destructive/30" },
} as const;

const STATUS_META: Record<RiskLimitEvent["status"], { label: string; tone: string }> = {
  active: { label: "Currently in force", tone: "bg-destructive/10 text-destructive border-destructive/30" },
  restored: { label: "Later restored", tone: "bg-success/10 text-success border-success/30" },
  expired: { label: "Cleared", tone: "bg-success/10 text-success border-success/30" },
  under_appeal: { label: "Under appeal", tone: "bg-yellow-500/15 text-yellow-700 border-yellow-500/30" },
  overturned: { label: "Overturned", tone: "bg-success/10 text-success border-success/30" },
};

export default function BuyerRiskAudit() {
  const { user } = useAuth();
  const profile = useMemo(() => mockProfile(user?.id ?? "demo", 720), [user]);
  const assessment = useMemo(
    () => {
      const report = cachedReport(profile.buyerId);
      return evaluateBuyerRisk(
        profile.buyerId,
        mockBuyerRiskMetrics(profile),
        profile.approvedLimit,
        report ? toBureauMetrics(report) : undefined,
      );
    },
    [profile],
  );
  const allEvents = useMemo(() => generateRiskAuditTrail(profile, assessment), [profile, assessment]);
  const summary = useMemo(() => summarizeRiskAudit(allEvents, assessment), [allEvents, assessment]);

  const [appeals, setAppeals] = useState(() => loadAppeals());
  const [query, setQuery] = useState("");
  const [vector, setVector] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");
  const [impact, setImpact] = useState<string>("all");
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [appealFor, setAppealFor] = useState<RiskLimitEvent | null>(null);
  const [appealReason, setAppealReason] = useState<string>(APPEAL_REASONS[0]);
  const [appealNote, setAppealNote] = useState("");
  const [appealRef, setAppealRef] = useState("");

  const events = useMemo(() => {
    const q = query.trim().toLowerCase();
    return allEvents.filter((e) => {
      if (vector !== "all" && e.category !== vector) return false;
      if (status !== "all" && e.status !== status) return false;
      if (impact === "reduction" && e.delta >= 0) return false;
      if (impact === "restoration" && e.delta <= 0) return false;
      if (!q) return true;
      return [
        e.title, e.detail, e.ruleId, e.signalId, e.evidence.observed, e.evidence.threshold,
        ...e.evidence.references.map((r) => `${r.id} ${r.label}`),
      ].join(" ").toLowerCase().includes(q);
    });
  }, [allEvents, query, vector, status, impact]);

  const netInView = events.reduce((a, e) => a + e.delta, 0);
  const appealFor_ = appealFor;

  const exportCsv = () => {
    const blob = new Blob([riskAuditToCsv(events)], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `risk-audit-trail-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${events.length} risk events.`);
  };

  const sendAppeal = () => {
    if (!appealFor_) return;
    submitAppeal({
      eventId: appealFor_.id,
      ruleId: appealFor_.ruleId,
      reason: appealReason,
      note: appealNote,
      evidenceRef: appealRef || undefined,
    });
    setAppeals(loadAppeals());
    setAppealFor(null);
    setAppealNote("");
    setAppealRef("");
    toast.success("Review request submitted — the risk desk responds within 1 business day.");
  };

  const appealedIds = new Set(appeals.map((a) => a.eventId));

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Link to="/buyer/credit" className="inline-flex items-center gap-1 hover:text-foreground">
                <ArrowLeft className="w-3.5 h-3.5" /> Back to credit
              </Link>
            </div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <ShieldAlert className="w-7 h-7 text-primary" /> Risk audit trail
            </h1>
            <p className="text-muted-foreground max-w-2xl mt-1">
              Every change to your credit limit that came from a fraud or default-risk rule — with the exact
              signal, the threshold it crossed, and the records behind it.
            </p>
          </div>
          <Button variant="outline" onClick={exportCsv}>
            <Download className="w-4 h-4 mr-2" /> Export CSV
          </Button>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          {[
            { label: "Approved limit", value: fmt(profile.approvedLimit), sub: "Before risk holds" },
            { label: "Available now", value: fmt(summary.effectiveLimit), sub: ACTION_META[summary.currentAction].label },
            { label: "Held back by rules", value: `−${fmt(summary.totalReduced)}`, sub: `${summary.activeHolds} hold(s) still applied`, tone: "text-destructive" },
            { label: "Given back", value: `+${fmt(summary.totalRestored)}`, sub: "After signals cleared", tone: "text-success" },
            { label: "Risk score", value: `${summary.riskScore}/100`, sub: "Higher = riskier" },
          ].map((k) => (
            <Card key={k.label}>
              <CardContent className="pt-5">
                <p className="text-[11px] text-muted-foreground">{k.label}</p>
                <p className={`text-xl font-bold ${k.tone ?? ""}`}>{k.value}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{k.sub}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Current stance */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              {React.createElement(ACTION_META[summary.currentAction].icon, { className: "w-4 h-4" })}
              Current position: {ACTION_META[summary.currentAction].label}
            </CardTitle>
            <CardDescription>{assessment.rationale}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-muted-foreground">Limit available after risk holds</span>
                <span className="font-semibold">
                  {fmt(summary.effectiveLimit)} of {fmt(profile.approvedLimit)}
                </span>
              </div>
              <Progress value={(summary.effectiveLimit / Math.max(1, profile.approvedLimit)) * 100} />
            </div>
            <div className="flex flex-wrap gap-2">
              {summary.byCategory.map((c) => {
                const M = CATEGORY_META[c.category];
                return (
                  <Badge key={c.category} variant="outline" className="text-[11px] gap-1">
                    <M.icon className="w-3 h-3" />
                    {M.label}: {c.events} event(s) · {c.impact < 0 ? "−" : "+"}{fmt(Math.abs(c.impact))}
                  </Badge>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Filters */}
        <Card>
          <CardContent className="pt-5">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="relative md:col-span-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Search rule, signal or record ID"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
              <Select value={vector} onValueChange={setVector}>
                <SelectTrigger><SelectValue placeholder="Risk vector" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All risk vectors</SelectItem>
                  {Object.entries(CATEGORY_META).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Any status</SelectItem>
                  <SelectItem value="active">Still applied</SelectItem>
                  <SelectItem value="restored">Later restored</SelectItem>
                  <SelectItem value="expired">Cleared</SelectItem>
                </SelectContent>
              </Select>
              <Select value={impact} onValueChange={setImpact}>
                <SelectTrigger><SelectValue placeholder="Impact" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Reductions and restorations</SelectItem>
                  <SelectItem value="reduction">Reductions only</SelectItem>
                  <SelectItem value="restoration">Restorations only</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-muted-foreground">
              <span>{events.length} of {allEvents.length} events</span>
              <span>
                Net in view:{" "}
                <span className={netInView < 0 ? "text-destructive font-semibold" : "text-success font-semibold"}>
                  {netInView < 0 ? "−" : "+"}{fmt(Math.abs(netInView))}
                </span>
              </span>
              {(query || vector !== "all" || status !== "all" || impact !== "all") && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 px-2"
                  onClick={() => { setQuery(""); setVector("all"); setStatus("all"); setImpact("all"); }}
                >
                  Clear filters
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Timeline */}
        {events.length === 0 ? (
          <Card><CardContent className="py-12 text-center text-muted-foreground">
            No risk-driven limit changes match these filters.
          </CardContent></Card>
        ) : (
          <div className="space-y-3">
            {events.map((e) => {
              const def = ruleDef(e.ruleId);
              const M = CATEGORY_META[e.category];
              const isOpen = !!open[e.id];
              const appealed = appealedIds.has(e.id);
              return (
                <Card key={e.id} className={e.status === "active" ? "border-destructive/40" : ""}>
                  <Collapsible open={isOpen} onOpenChange={(v) => setOpen((p) => ({ ...p, [e.id]: v }))}>
                    <CardContent className="pt-5">
                      <div className="flex items-start gap-3">
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${e.delta < 0 ? "bg-destructive/10 text-destructive" : e.delta > 0 ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>
                          <M.icon className="w-4.5 h-4.5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-semibold">{e.title}</p>
                            <Badge variant="outline" className={`text-[10px] ${buyerRiskTone(e.severity)}`}>
                              {e.severity}
                            </Badge>
                            <Badge variant="outline" className={`text-[10px] ${STATUS_META[appealed ? "under_appeal" : e.status].tone}`}>
                              {STATUS_META[appealed ? "under_appeal" : e.status].label}
                            </Badge>
                            <Badge variant="secondary" className="text-[10px] font-mono">{e.ruleId}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">{e.detail}</p>
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-muted-foreground">
                            <span className="inline-flex items-center gap-1"><Clock className="w-3 h-3" />{e.date}</span>
                            <span>{M.label} rule · decided by {e.decidedBy === "underwriter" ? "an underwriter" : "the risk engine"}</span>
                            {e.restoredOn && <span className="text-success">Restored on {e.restoredOn}</span>}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          {e.delta === 0 ? (
                            <>
                              <p className="text-sm font-semibold text-muted-foreground">No limit change</p>
                              <p className="text-[11px] text-muted-foreground">Watch-listed only</p>
                            </>
                          ) : (
                            <>
                              <p className={`text-lg font-bold ${e.delta < 0 ? "text-destructive" : "text-success"}`}>
                                {e.delta < 0 ? <ArrowDownRight className="w-4 h-4 inline mr-0.5" /> : <ArrowUpRight className="w-4 h-4 inline mr-0.5" />}
                                {e.delta < 0 ? "−" : "+"}{fmt(Math.abs(e.delta))}
                              </p>
                              <p className="text-[11px] text-muted-foreground">
                                {fmt(e.limitBefore)} → {fmt(e.limitAfter)}
                              </p>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 mt-3">
                        <CollapsibleTrigger asChild>
                          <Button size="sm" variant="outline">
                            <FileSearch className="w-3.5 h-3.5 mr-1" />
                            {isOpen ? "Hide" : "Why this happened"}
                            <ChevronDown className={`w-3.5 h-3.5 ml-1 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                          </Button>
                        </CollapsibleTrigger>
                        {e.delta < 0 && !appealed && (
                          <Button size="sm" variant="ghost" onClick={() => setAppealFor(e)}>
                            This looks wrong
                          </Button>
                        )}
                        {appealed && (
                          <span className="text-xs text-muted-foreground self-center">
                            Review requested — risk desk is looking at it.
                          </span>
                        )}
                      </div>

                      <CollapsibleContent className="mt-4 space-y-3">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="rounded-lg border p-3 space-y-1.5">
                            <p className="text-xs font-semibold">Signal that triggered it</p>
                            {[
                              ["Signal", `${e.signalId} — ${e.evidence.metric}`],
                              ["What we measured", e.evidence.observed],
                              ["Rule threshold", e.evidence.threshold],
                              ["Observation window", e.evidence.window],
                              ["Data source", e.evidence.source],
                            ].map(([k, v]) => (
                              <div key={k} className="flex justify-between gap-3 text-xs">
                                <span className="text-muted-foreground shrink-0">{k}</span>
                                <span className="text-right font-medium">{v}</span>
                              </div>
                            ))}
                          </div>
                          <div className="rounded-lg border p-3 space-y-1.5">
                            <p className="text-xs font-semibold">What clears it</p>
                            <p className="text-xs text-muted-foreground">{def.remediation}.</p>
                            <p className="text-xs text-muted-foreground">
                              If the signal stops firing, the hold lifts automatically after{" "}
                              <span className="font-medium text-foreground">{def.autoRestoreDays} day(s)</span>.
                            </p>
                            <div className="pt-1 flex flex-wrap gap-1">
                              <Badge variant="outline" className={`text-[10px] ${ACTION_META[e.action].tone}`}>
                                {ACTION_META[e.action].label}
                              </Badge>
                              <Badge variant="outline" className="text-[10px]">{def.window}</Badge>
                            </div>
                          </div>
                        </div>

                        <div>
                          <p className="text-xs font-semibold mb-2">Underlying records</p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {e.evidence.references.map((r) => (
                              <div key={r.id} className="rounded-lg border p-2.5">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="font-mono text-xs font-semibold">{r.id}</span>
                                  <Badge variant="secondary" className="text-[10px]">{r.label}</Badge>
                                </div>
                                <p className="text-[11px] text-muted-foreground mt-1">{r.detail}</p>
                                <p className="text-[11px] text-muted-foreground">Dated {r.date}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      </CollapsibleContent>
                    </CardContent>
                  </Collapsible>
                </Card>
              );
            })}
          </div>
        )}

        {appeals.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-primary" /> Your review requests
              </CardTitle>
              <CardDescription>Requests you raised against a risk-driven limit change.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {appeals.map((a) => (
                <div key={a.id} className="rounded-lg border p-3 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary" className="text-[10px] font-mono">{a.ruleId}</Badge>
                    <span className="font-medium">{a.reason}</span>
                    <Badge variant="outline" className="text-[10px]">{a.status === "submitted" ? "Submitted" : "In review"}</Badge>
                  </div>
                  {a.note && <p className="text-xs text-muted-foreground mt-1">{a.note}</p>}
                  <p className="text-[11px] text-muted-foreground mt-1">
                    {a.evidenceRef ? `Reference: ${a.evidenceRef} · ` : ""}
                    Raised {new Date(a.submittedAt).toLocaleString("en-IN")}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </main>

      <Dialog open={!!appealFor_} onOpenChange={(v) => !v && setAppealFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ask us to re-check this</DialogTitle>
            <DialogDescription>
              {appealFor_ ? `${appealFor_.title} (${appealFor_.ruleId}) — ${fmt(Math.abs(appealFor_.delta))} held back on ${appealFor_.date}.` : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Reason</Label>
              <Select value={appealReason} onValueChange={setAppealReason}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {APPEAL_REASONS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Reference (payment ID, invoice, dispute number)</Label>
              <Input value={appealRef} onChange={(e) => setAppealRef(e.target.value)} placeholder="e.g. PAY-99321" />
            </div>
            <div>
              <Label className="text-xs">What should we know?</Label>
              <Textarea rows={4} value={appealNote} onChange={(e) => setAppealNote(e.target.value)} placeholder="Explain what the rule got wrong." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAppealFor(null)}>Cancel</Button>
            <Button onClick={sendAppeal} disabled={!appealNote.trim()}>Submit for review</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
}
