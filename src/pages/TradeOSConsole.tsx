import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft, Play, FastForward, CheckCircle2, AlertTriangle, XCircle, Loader2,
  Brain, Bot, ShieldCheck, Activity, Sparkles, Zap, FileText, Coins, Truck, Award, TrendingUp,
} from "lucide-react";
import {
  getDeal, upsertDeal, runNextStep, runFullPipeline, AGENT_PIPELINE, STAGE_ORDER,
  type TradeDeal, type DealStage,
} from "@/lib/trade-os";
import { generateText } from "@/lib/ai-agent";
import { toast } from "sonner";

const STAGE_ICONS: Record<string, React.ElementType> = {
  intent: Brain, understanding: Brain, matching: Bot, trust: ShieldCheck,
  pricing: Activity, negotiation: Sparkles, quality: Award, risk: Zap,
  simulation: TrendingUp, contract: FileText, escrow: Coins, logistics: Truck, completed: CheckCircle2,
};

function StatusIcon({ status }: { status: string }) {
  if (status === "ok") return <CheckCircle2 className="w-4 h-4 text-success" />;
  if (status === "warn") return <AlertTriangle className="w-4 h-4 text-warning" />;
  if (status === "error") return <XCircle className="w-4 h-4 text-destructive" />;
  return <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />;
}

export default function TradeOSConsole() {
  const { id } = useParams<{ id: string }>();
  const [deal, setDeal] = useState<TradeDeal | undefined>(() => (id ? getDeal(id) : undefined));
  const [autoRunning, setAutoRunning] = useState(false);
  const [brief, setBrief] = useState("");
  const [briefLoading, setBriefLoading] = useState(false);

  const generateBrief = async () => {
    if (!deal) return;
    setBriefLoading(true);
    try {
      const lead = deal.candidates.find((c) => c.id === deal.finalSupplierId);
      const payload = {
        spec: deal.spec,
        finalPrice: deal.finalPrice,
        contract: deal.contract,
        escrow: deal.escrow,
        logistics: deal.logistics,
        leadSupplier: lead,
        topCandidates: deal.candidates.slice(0, 3),
        simulations: deal.simulations,
      };
      const out = await generateText("deal_brief", JSON.stringify(payload));
      setBrief(out);
    } catch (e) {
      toast.error((e as Error).message || "Brief generation failed.");
    } finally {
      setBriefLoading(false);
    }
  };


  useEffect(() => { if (id) setDeal(getDeal(id)); }, [id]);

  const stageIdx = useMemo(() => (deal ? STAGE_ORDER.indexOf(deal.stage) : -1), [deal]);
  const progress = useMemo(() => (deal ? ((stageIdx + 1) / STAGE_ORDER.length) * 100 : 0), [deal, stageIdx]);

  if (!deal) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <main className="flex-1 container mx-auto px-4 py-12 text-center">
          <h2 className="text-2xl font-semibold mb-2">Deal not found</h2>
          <Button asChild><Link to="/trade-os"><ArrowLeft className="w-4 h-4 mr-1" /> Back to Trade OS</Link></Button>
        </main>
      </div>
    );
  }

  const isDone = deal.stage === "completed";

  const handleNext = () => {
    const updated = { ...deal };
    const result = runNextStep(updated);
    setDeal({ ...result.deal });
    toast.success(`Stage advanced → ${result.deal.stage}`);
  };

  const handleAuto = async () => {
    setAutoRunning(true);
    let current = { ...deal };
    while (current.stage !== "completed") {
      const result = runNextStep(current);
      current = { ...result.deal };
      setDeal({ ...current });
      await new Promise((r) => setTimeout(r, 450));
    }
    setAutoRunning(false);
    toast.success("Pipeline complete. Deal executed.");
  };

  const handleResetAndRun = () => {
    const fresh = { ...deal, stage: "intent" as DealStage, logs: deal.logs.slice(0, 1), candidates: [], negotiations: [], simulations: [], learning: [], contract: undefined, escrow: undefined, logistics: undefined, finalPrice: undefined, finalSupplierId: undefined };
    const updated = runFullPipeline(fresh);
    setDeal({ ...updated });
    toast.success("Re-ran full pipeline.");
  };

  const topCandidate = deal.candidates[0];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
          <div>
            <Button asChild size="sm" variant="ghost" className="mb-2 -ml-3">
              <Link to="/trade-os"><ArrowLeft className="w-4 h-4 mr-1" /> All deals</Link>
            </Button>
            <h1 className="text-2xl md:text-3xl font-bold font-display">{deal.spec.product}</h1>
            <div className="flex flex-wrap items-center gap-2 mt-2 text-sm text-muted-foreground">
              <Badge variant="secondary">{deal.spec.inferredCategory}</Badge>
              <span>{deal.spec.quantity.toLocaleString()} {deal.spec.unit}</span>
              <span>•</span>
              <span>Deadline {deal.spec.deliveryDeadline}</span>
              <span>•</span>
              <span className="capitalize">{deal.spec.riskProfile} risk</span>
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={handleNext} disabled={isDone || autoRunning}>
              <Play className="w-4 h-4 mr-1" /> Next stage
            </Button>
            <Button size="sm" onClick={handleAuto} disabled={isDone || autoRunning}>
              {autoRunning ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <FastForward className="w-4 h-4 mr-1" />}
              Auto-run all
            </Button>
            {isDone && (
              <Button size="sm" variant="outline" onClick={handleResetAndRun}>
                Re-run
              </Button>
            )}
          </div>
        </div>

        {/* Progress */}
        <Card className="mb-6">
          <CardContent className="pt-6 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="font-medium">Pipeline progress</span>
              <span className="text-muted-foreground">{stageIdx + 1} / {STAGE_ORDER.length} • {deal.stage}</span>
            </div>
            <Progress value={progress} className="h-2" />
            <div className="grid grid-cols-7 md:grid-cols-13 gap-1.5 pt-2">
              {STAGE_ORDER.map((s, i) => {
                const Icon = STAGE_ICONS[s] || Activity;
                const done = i <= stageIdx;
                return (
                  <div key={s} className={`text-center px-1 py-2 rounded-md border ${done ? "bg-primary/10 border-primary/40" : "bg-muted/30 border-transparent"}`}>
                    <Icon className={`w-4 h-4 mx-auto ${done ? "text-primary" : "text-muted-foreground"}`} />
                    <div className="text-[10px] mt-0.5 capitalize truncate">{s}</div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: tabs with agent outputs */}
          <div className="lg:col-span-2">
            <Tabs defaultValue="agents">
              <TabsList className="flex-wrap h-auto">
                <TabsTrigger value="agents">Agents</TabsTrigger>
                <TabsTrigger value="suppliers">Suppliers ({deal.candidates.length})</TabsTrigger>
                <TabsTrigger value="negotiation">Negotiation</TabsTrigger>
                <TabsTrigger value="simulation">Simulations</TabsTrigger>
                <TabsTrigger value="contract">Contract</TabsTrigger>
                <TabsTrigger value="escrow">Escrow</TabsTrigger>
                <TabsTrigger value="logistics">Logistics</TabsTrigger>
                <TabsTrigger value="learning">Learning</TabsTrigger>
              </TabsList>

              <TabsContent value="agents">
                <Card>
                  <CardHeader><CardTitle className="text-base">Agent activity log</CardTitle></CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[500px] pr-3">
                      <div className="space-y-3">
                        {deal.logs.map((log, i) => (
                          <div key={i} className="flex gap-3 items-start pb-3 border-b border-border last:border-0">
                            <StatusIcon status={log.status} />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-semibold text-sm">{log.agent}</span>
                                <span className="text-xs text-muted-foreground">
                                  {new Date(log.ts).toLocaleTimeString()}
                                </span>
                              </div>
                              <div className="text-sm mt-0.5">{log.message}</div>
                              {log.data && Object.keys(log.data).length > 0 && (
                                <div className="mt-1 text-xs text-muted-foreground font-mono bg-muted/40 px-2 py-1 rounded">
                                  {JSON.stringify(log.data)}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="suppliers">
                <Card>
                  <CardHeader><CardTitle className="text-base">Ranked suppliers</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    {deal.candidates.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Matching agent has not run yet.</p>
                    ) : deal.candidates.map((c, i) => (
                      <div key={c.id} className={`p-3 rounded-lg border ${i === 0 ? "border-primary bg-primary/5" : "border-border"}`}>
                        <div className="flex items-start justify-between gap-3 flex-wrap">
                          <div>
                            <div className="font-semibold">{i + 1}. {c.name}</div>
                            <div className="text-xs text-muted-foreground">{c.city} • {c.certifications.join(", ")}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-bold text-primary">{c.matchScore}</div>
                            <div className="text-xs text-muted-foreground">match score</div>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3 text-xs">
                          <Stat label="Trust" value={`${c.trustScore}/100`} />
                          <Stat label="Price" value={`₹${c.pricePerUnit}`} />
                          <Stat label="Lead time" value={`${c.leadTimeDays}d`} />
                          <Stat label="Defect risk" value={`${c.defectRiskPct}%`} />
                        </div>
                        {c.reasons.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {c.reasons.map((r) => <Badge key={r} variant="outline" className="text-[10px]">{r}</Badge>)}
                          </div>
                        )}
                        {c.flags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {c.flags.map((f) => <Badge key={f} variant="destructive" className="text-[10px]">{f}</Badge>)}
                          </div>
                        )}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="negotiation">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Negotiation transcript</CardTitle>
                    <CardDescription>
                      {topCandidate ? `With ${topCandidate.name}` : "Pending"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {deal.negotiations.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No rounds yet.</p>
                    ) : deal.negotiations.map((r) => (
                      <div key={r.round} className="p-3 rounded-lg border">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-semibold text-sm">Round {r.round}</span>
                          {r.accepted && <Badge className="bg-success text-success-foreground">Accepted</Badge>}
                        </div>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div className="bg-primary/5 rounded p-2">
                            <div className="text-xs text-muted-foreground">Buyer offer</div>
                            <div className="font-bold">₹{r.buyerOffer}</div>
                          </div>
                          <div className="bg-secondary/10 rounded p-2">
                            <div className="text-xs text-muted-foreground">Supplier counter</div>
                            <div className="font-bold">₹{r.supplierCounter}</div>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground mt-2 italic">{r.rationale}</p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="simulation">
                <Card>
                  <CardHeader><CardTitle className="text-base">Deal scenarios</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    {deal.simulations.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No simulations yet.</p>
                    ) : deal.simulations.map((s) => (
                      <div key={s.name} className={`p-4 rounded-lg border ${s.recommended ? "border-secondary bg-secondary/5" : ""}`}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-semibold">{s.name}</span>
                          {s.recommended && <Badge className="bg-secondary text-secondary-foreground">Recommended</Badge>}
                        </div>
                        <p className="text-xs text-muted-foreground mb-2">{s.rationale}</p>
                        <div className="grid grid-cols-3 gap-2 text-sm">
                          <Stat label="Total" value={`₹${s.totalCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}`} />
                          <Stat label="Avg lead" value={`${s.weightedLeadTime.toFixed(1)}d`} />
                          <Stat label="Avg risk" value={`${s.weightedRisk.toFixed(1)}%`} />
                        </div>
                        <div className="mt-2 text-xs text-muted-foreground">
                          Allocation: {s.suppliers.map((x) => `${(x.share * 100).toFixed(0)}%`).join(" / ")}
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="contract">
                <Card>
                  <CardHeader><CardTitle className="text-base">Generated contract</CardTitle></CardHeader>
                  <CardContent>
                    {!deal.contract ? <p className="text-sm text-muted-foreground">No contract drafted yet.</p> : (
                      <div className="space-y-4">
                        <div className="flex gap-2 flex-wrap text-xs">
                          <Badge variant="outline">ID: {deal.contract.id}</Badge>
                          <Badge variant="outline">{deal.contract.incoterms}</Badge>
                          <Badge variant="outline">{deal.contract.jurisdiction}</Badge>
                        </div>
                        <Stat label="Total contract value" value={`₹${deal.contract.totalValue.toLocaleString()}`} />
                        <Separator />
                        <div>
                          <div className="font-semibold text-sm mb-2">Milestones</div>
                          {deal.contract.milestones.map((m) => (
                            <div key={m.name} className="flex justify-between text-sm py-1 border-b last:border-0">
                              <span>{m.name}</span>
                              <span className="text-muted-foreground">{m.pct}% • day {m.days}</span>
                            </div>
                          ))}
                        </div>
                        <div>
                          <div className="font-semibold text-sm mb-2">Penalty clauses</div>
                          <ul className="text-sm space-y-1 list-disc pl-5 text-muted-foreground">
                            {deal.contract.penalties.map((p, i) => <li key={i}>{p}</li>)}
                          </ul>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="escrow">
                <Card>
                  <CardHeader><CardTitle className="text-base">Escrow & payments</CardTitle></CardHeader>
                  <CardContent>
                    {!deal.escrow ? <p className="text-sm text-muted-foreground">Escrow not opened yet.</p> : (
                      <div className="space-y-4">
                        <div className="grid grid-cols-3 gap-3">
                          <Stat label="Total escrowed" value={`₹${deal.escrow.totalValue.toLocaleString()}`} />
                          <Stat label="Insurance premium" value={`${deal.escrow.insurancePremiumPct}%`} />
                          <Stat label="BNPL" value={deal.escrow.bnplEnabled ? "Enabled" : "Disabled"} />
                        </div>
                        <Separator />
                        <div>
                          <div className="font-semibold text-sm mb-2">Milestone releases</div>
                          {deal.escrow.releases.map((r, i) => (
                            <div key={i} className="flex justify-between text-sm py-1 border-b last:border-0">
                              <span>{r.milestone}</span>
                              <span className={r.releasedAt ? "text-success" : "text-muted-foreground"}>
                                {r.releasedAt ? `Released • ${r.pct}%` : `Pending • ${r.pct}%`}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="logistics">
                <Card>
                  <CardHeader><CardTitle className="text-base">Shipment plan</CardTitle></CardHeader>
                  <CardContent>
                    {!deal.logistics ? <p className="text-sm text-muted-foreground">No logistics plan yet.</p> : (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          <Stat label="Carrier" value={deal.logistics.carrier} />
                          <Stat label="ETA" value={`${deal.logistics.etaDays} days`} />
                          <Stat label="Delay risk" value={`${deal.logistics.riskOfDelayPct}%`} />
                          <Stat label="Tracking" value={deal.logistics.trackingId} />
                        </div>
                        <Separator />
                        <div>
                          <div className="font-semibold text-sm mb-2">Checkpoints</div>
                          <div className="space-y-2">
                            {deal.logistics.checkpoints.map((cp, i) => (
                              <div key={i} className="flex items-center gap-2 text-sm">
                                {cp.status === "done"
                                  ? <CheckCircle2 className="w-4 h-4 text-success" />
                                  : <div className="w-4 h-4 rounded-full border-2 border-muted-foreground/40" />
                                }
                                <span className="flex-1">{cp.name}</span>
                                <span className="text-xs text-muted-foreground">
                                  {new Date(cp.ts).toLocaleDateString()}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="learning">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Learning loop signals</CardTitle>
                    <CardDescription>Outcomes fed back into matching, pricing, and risk models.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {deal.learning.length === 0 ? <p className="text-sm text-muted-foreground">No signals captured yet.</p> : (
                      <div className="space-y-2">
                        {deal.learning.map((s, i) => (
                          <div key={i} className="flex justify-between items-center p-2 rounded border">
                            <span className="text-sm">{s.metric}</span>
                            <div className="text-right">
                              <div className="font-semibold text-sm">{s.value}</div>
                              <div className="text-xs text-success">+{s.delta}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Right: deal spec + outcome */}
          <div className="space-y-4">
            <Card>
              <CardHeader><CardTitle className="text-base">Deal specification</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm">
                <SpecRow label="Product" value={deal.spec.product} />
                <SpecRow label="Quantity" value={`${deal.spec.quantity.toLocaleString()} ${deal.spec.unit}`} />
                <SpecRow label="Target price" value={deal.spec.targetPrice ? `₹${deal.spec.targetPrice}/${deal.spec.unit}` : "—"} />
                <SpecRow label="Deadline" value={deal.spec.deliveryDeadline} />
                <SpecRow label="Risk profile" value={deal.spec.riskProfile} />
                <SpecRow label="Confidence" value={`${(deal.spec.confidence * 100).toFixed(0)}%`} />
                {Object.keys(deal.spec.specifications).length > 0 && (
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Attributes</div>
                    <div className="flex flex-wrap gap-1">
                      {Object.entries(deal.spec.specifications).map(([k, v]) => (
                        <Badge key={k} variant="outline" className="text-xs">{k}: {v}</Badge>
                      ))}
                    </div>
                  </div>
                )}
                {deal.spec.compliance.length > 0 && (
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Compliance</div>
                    <div className="flex flex-wrap gap-1">
                      {deal.spec.compliance.map((c) => <Badge key={c} variant="secondary" className="text-xs">{c}</Badge>)}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {isDone && deal.finalPrice && (
              <Card className="border-success/40 bg-success/5">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-success" /> Deal executed
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <SpecRow label="Final price" value={`₹${deal.finalPrice}/${deal.spec.unit}`} />
                  <SpecRow label="Total value" value={`₹${(deal.contract?.totalValue || 0).toLocaleString()}`} />
                  <SpecRow label="Lead supplier" value={deal.candidates.find((c) => c.id === deal.finalSupplierId)?.name || "—"} />
                  <SpecRow label="ETA" value={deal.logistics ? `${deal.logistics.etaDays} days` : "—"} />
                  {deal.outcomeNote && <p className="text-xs text-muted-foreground italic pt-2">{deal.outcomeNote}</p>}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-muted/40 rounded p-2">
      <div className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</div>
      <div className="font-semibold text-sm truncate">{value}</div>
    </div>
  );
}

function SpecRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-muted-foreground capitalize">{label}</span>
      <span className="font-medium text-right">{value}</span>
    </div>
  );
}
