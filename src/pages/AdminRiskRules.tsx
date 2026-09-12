import { useMemo, useState } from "react";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  ArrowDown, ArrowUp, RotateCcw, Save, ShieldAlert, Sliders, TrendingDown, Users,
} from "lucide-react";
import {
  mockProfile, mockBuyerRiskMetrics, buyerRiskTone,
  type BuyerRiskAction, type BuyerRiskMetrics, type BuyerRiskSeverity,
} from "@/lib/bnpl";
import {
  ACTION_LABEL, ACTION_ORDER, CATEGORY_LABEL, METRIC_INPUT, METRIC_LABEL,
  SEVERITY_ORDER, SIM_BUYERS, diffEvaluations, evaluateWithPolicy, loadPolicy,
  metricValue, resetPolicy, savePolicy,
  type PolicyMetricKey, type PolicyRule, type RiskPolicy,
} from "@/lib/risk-policy";

const inr = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;

function unitSuffix(unit: PolicyRule["unit"], v: number) {
  if (unit === "inr") return inr(v);
  if (unit === "percent") return `${v}%`;
  if (unit === "days") return `${v} days`;
  if (unit === "flag") return v ? "Yes" : "No";
  return `${v}`;
}

const ACTION_TONE: Record<BuyerRiskAction, string> = {
  monitor: "bg-muted text-muted-foreground border-border",
  reduce_limit: "bg-yellow-500/15 text-yellow-700 border-yellow-500/30",
  freeze_new: "bg-orange-500/15 text-orange-700 border-orange-500/30",
  block: "bg-destructive/15 text-destructive border-destructive/30",
};

export default function AdminRiskRules() {
  const [draft, setDraft] = useState<RiskPolicy>(() => loadPolicy());
  const [saved, setSaved] = useState<RiskPolicy>(() => loadPolicy());
  const [buyerId, setBuyerId] = useState(SIM_BUYERS[1].id);
  const [overrides, setOverrides] = useState<Partial<Record<PolicyMetricKey, number>>>({});

  const buyer = SIM_BUYERS.find((b) => b.id === buyerId)!;
  const profile = useMemo(() => mockProfile(buyer.id, buyer.trustScore), [buyer]);
  const baseMetrics = useMemo(() => mockBuyerRiskMetrics(profile), [profile]);

  const metrics: BuyerRiskMetrics = useMemo(() => {
    const m = { ...baseMetrics } as Record<string, number | boolean>;
    for (const [k, v] of Object.entries(overrides)) {
      if (v === undefined) continue;
      m[k] = k === "gstinReverifyFailed" ? v === 1 : v;
    }
    return m as unknown as BuyerRiskMetrics;
  }, [baseMetrics, overrides]);

  const limit = profile.approvedLimit;
  const before = useMemo(() => evaluateWithPolicy(buyer.id, metrics, limit, saved), [buyer, metrics, limit, saved]);
  const after = useMemo(() => evaluateWithPolicy(buyer.id, metrics, limit, draft), [buyer, metrics, limit, draft]);
  const diff = useMemo(() => diffEvaluations(before, after), [before, after]);
  const dirty = JSON.stringify(draft.rules) !== JSON.stringify(saved.rules);

  const patchRule = (ruleId: string, patch: Partial<PolicyRule>) =>
    setDraft((p) => ({ ...p, rules: p.rules.map((r) => (r.ruleId === ruleId ? { ...r, ...patch } : r)) }));

  const groups = useMemo(() => {
    const map = new Map<string, PolicyRule[]>();
    for (const r of draft.rules) {
      const key = r.category;
      map.set(key, [...(map.get(key) ?? []), r]);
    }
    return [...map.entries()];
  }, [draft]);

  const limitDelta = after.effectiveLimit - before.effectiveLimit;

  const overriddenMetrics = useMemo(() => {
    const keys = [...new Set(draft.rules.map((r) => r.metric))];
    return keys;
  }, [draft]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8 max-w-7xl">
        <header className="mb-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <ShieldAlert className="h-4 w-4" /> Risk administration
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Risk rule configuration</h1>
          <p className="text-muted-foreground mt-1">
            Tune DPD, drawdown velocity, dispute and exposure thresholds and see the outcome for a
            selected buyer before you publish.
          </p>
        </header>

        {/* Simulation summary */}
        <div className="grid gap-4 md:grid-cols-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1"><Users className="h-3.5 w-3.5" /> Simulating for</CardDescription>
            </CardHeader>
            <CardContent>
              <Select value={buyerId} onValueChange={(v) => { setBuyerId(v); setOverrides({}); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SIM_BUYERS.map((b) => (
                    <SelectItem key={b.id} value={b.id}>{b.name} · {b.city}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-2">
                Trust {buyer.trustScore} · Approved {inr(limit)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2"><CardDescription>Effective limit</CardDescription></CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{inr(after.effectiveLimit)}</div>
              <div className={`text-xs mt-1 flex items-center gap-1 ${limitDelta === 0 ? "text-muted-foreground" : limitDelta > 0 ? "text-success" : "text-destructive"}`}>
                {limitDelta === 0 ? "Unchanged vs published rules" : (
                  <>
                    {limitDelta > 0 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                    {inr(Math.abs(limitDelta))} vs published
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2"><CardDescription>Risk score</CardDescription></CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{after.riskScore}<span className="text-sm text-muted-foreground">/100</span></div>
              <Progress value={after.riskScore} className="h-1.5 mt-2" />
              <p className="text-xs text-muted-foreground mt-1">Published: {before.riskScore}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2"><CardDescription>Resulting action</CardDescription></CardHeader>
            <CardContent>
              <Badge variant="outline" className={ACTION_TONE[after.action]}>{ACTION_LABEL[after.action]}</Badge>
              <p className="text-xs text-muted-foreground mt-2">
                {after.signals.length} signal(s) fired · reduction {inr(after.totalReductionInr)}
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-wrap items-center gap-2 mb-6">
          <Button
            onClick={() => { const next = savePolicy(draft); setSaved(next); setDraft(next); toast.success("Rule policy published", { description: `Version ${next.version} is now live for all buyers.` }); }}
            disabled={!dirty}
          >
            <Save className="h-4 w-4 mr-2" /> Publish changes
          </Button>
          <Button variant="outline" onClick={() => { setDraft(saved); toast("Draft reverted to published policy"); }} disabled={!dirty}>
            Discard draft
          </Button>
          <Button variant="ghost" onClick={() => { const d = resetPolicy(); setSaved(d); setDraft(d); setOverrides({}); toast("Restored factory thresholds"); }}>
            <RotateCcw className="h-4 w-4 mr-2" /> Reset to defaults
          </Button>
          {dirty && <Badge variant="outline" className="bg-yellow-500/15 text-yellow-700 border-yellow-500/30">Unpublished draft</Badge>}
          <span className="text-xs text-muted-foreground ml-auto">Live policy v{saved.version}</span>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr] items-start">
          {/* Rule editor */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg"><Sliders className="h-4 w-4" /> Thresholds</CardTitle>
              <CardDescription>Each change re-simulates {buyer.name} instantly.</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue={groups[0]?.[0]}>
                <TabsList className="flex flex-wrap h-auto">
                  {groups.map(([cat, rules]) => (
                    <TabsTrigger key={cat} value={cat}>
                      {CATEGORY_LABEL[cat as keyof typeof CATEGORY_LABEL]} ({rules.length})
                    </TabsTrigger>
                  ))}
                </TabsList>
                {groups.map(([cat, rules]) => (
                  <TabsContent key={cat} value={cat} className="space-y-5 pt-4">
                    {rules.map((r) => {
                      const fired = after.firedRuleIds.includes(r.ruleId);
                      const observed = metricValue(metrics, r.metric);
                      return (
                        <div key={r.ruleId} className={`rounded-lg border p-4 ${fired ? "border-destructive/40 bg-destructive/5" : ""}`}>
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-medium">{r.label}</span>
                                <Badge variant="outline" className="text-xs">{r.ruleId}</Badge>
                                <Badge variant="outline" className={`text-xs ${buyerRiskTone(r.severity)}`}>{r.severity}</Badge>
                                {fired && <Badge variant="outline" className="text-xs bg-destructive/15 text-destructive border-destructive/30">Firing now</Badge>}
                              </div>
                              <p className="text-xs text-muted-foreground mt-1">
                                {METRIC_LABEL[r.metric]} · observed {unitSuffix(METRIC_INPUT[r.metric].unit, observed)}
                                {r.suppressedBy ? ` · skipped when ${r.suppressedBy} fires` : ""}
                              </p>
                            </div>
                            <Switch checked={r.enabled} onCheckedChange={(v) => patchRule(r.ruleId, { enabled: v })} />
                          </div>

                          {r.enabled && (
                            <div className="grid gap-4 md:grid-cols-2 mt-4">
                              <div>
                                <div className="flex justify-between text-xs mb-1">
                                  <Label>Trigger when {r.op} </Label>
                                  <span className="font-medium">
                                    {r.thresholdMode === "pctOfLimit" ? `${r.threshold}% of limit` : unitSuffix(r.unit, r.threshold)}
                                  </span>
                                </div>
                                <Slider
                                  value={[r.threshold]} min={r.min} max={r.max} step={r.step}
                                  onValueChange={([v]) => patchRule(r.ruleId, { threshold: v })}
                                  disabled={r.unit === "flag"}
                                />
                              </div>
                              <div>
                                <div className="flex justify-between text-xs mb-1">
                                  <Label>Limit reduction</Label>
                                  <span className="font-medium">{r.reductionPct}% ({inr((limit * r.reductionPct) / 100)})</span>
                                </div>
                                <Slider
                                  value={[r.reductionPct]} min={0} max={100} step={5}
                                  onValueChange={([v]) => patchRule(r.ruleId, { reductionPct: v })}
                                />
                              </div>
                              <div>
                                <Label className="text-xs">Severity</Label>
                                <Select value={r.severity} onValueChange={(v) => patchRule(r.ruleId, { severity: v as BuyerRiskSeverity })}>
                                  <SelectTrigger className="mt-1 h-9"><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    {SEVERITY_ORDER.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <Label className="text-xs">Action</Label>
                                <Select value={r.action} onValueChange={(v) => patchRule(r.ruleId, { action: v as BuyerRiskAction })}>
                                  <SelectTrigger className="mt-1 h-9"><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    {ACTION_ORDER.map((a) => <SelectItem key={a} value={a}>{ACTION_LABEL[a]}</SelectItem>)}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </TabsContent>
                ))}
              </Tabs>
            </CardContent>
          </Card>

          {/* Simulation panel */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Buyer inputs</CardTitle>
                <CardDescription>Override observed metrics to stress-test the policy.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {overriddenMetrics.map((key) => {
                  const cfg = METRIC_INPUT[key];
                  const value = metricValue(metrics, key);
                  const isOverride = overrides[key] !== undefined;
                  return (
                    <div key={key}>
                      <div className="flex justify-between text-xs mb-1">
                        <Label className={isOverride ? "text-primary" : ""}>{METRIC_LABEL[key]}</Label>
                        <span className="font-medium">{unitSuffix(cfg.unit, value)}</span>
                      </div>
                      <Slider
                        value={[value]} min={cfg.min} max={cfg.max} step={cfg.step}
                        onValueChange={([v]) => setOverrides((o) => ({ ...o, [key]: v }))}
                      />
                    </div>
                  );
                })}
                <Button variant="outline" size="sm" onClick={() => setOverrides({})} disabled={!Object.keys(overrides).length}>
                  Reset to live data
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2"><TrendingDown className="h-4 w-4" /> Outcome</CardTitle>
                <CardDescription>{after.rationale}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-md border p-3">
                    <div className="text-xs text-muted-foreground">Published policy</div>
                    <div className="font-semibold">{inr(before.effectiveLimit)}</div>
                    <Badge variant="outline" className={`mt-1 text-xs ${ACTION_TONE[before.action]}`}>{ACTION_LABEL[before.action]}</Badge>
                  </div>
                  <div className="rounded-md border p-3 border-primary/40 bg-primary/5">
                    <div className="text-xs text-muted-foreground">Draft policy</div>
                    <div className="font-semibold">{inr(after.effectiveLimit)}</div>
                    <Badge variant="outline" className={`mt-1 text-xs ${ACTION_TONE[after.action]}`}>{ACTION_LABEL[after.action]}</Badge>
                  </div>
                </div>

                <Separator />
                <div>
                  <div className="text-sm font-medium mb-2">Signals firing ({after.signals.length})</div>
                  {after.signals.length === 0 && <p className="text-sm text-muted-foreground">No rule fires for this buyer.</p>}
                  <div className="space-y-2">
                    {after.signals.map((s) => (
                      <div key={s.id} className="rounded-md border p-2.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-medium">{s.label}</span>
                          <span className="text-xs font-medium text-destructive">-{inr(s.reductionInr)}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{s.detail}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {diff.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <div className="text-sm font-medium mb-2">What your edits changed</div>
                      <div className="space-y-1.5">
                        {diff.map((d) => (
                          <div key={d.ruleId} className="flex items-center justify-between text-xs rounded-md bg-muted/50 px-2.5 py-2">
                            <span>{d.label}</span>
                            <span className={d.after === "fired" ? "text-destructive font-medium" : "text-success font-medium"}>
                              {d.before === d.after
                                ? `${inr(d.reductionBefore)} → ${inr(d.reductionAfter)}`
                                : d.after === "fired" ? "now fires" : "no longer fires"}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {after.nearMisses.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <div className="text-sm font-medium mb-2">Closest to triggering</div>
                      <div className="space-y-1.5">
                        {after.nearMisses.map((n) => (
                          <div key={n.ruleId} className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>{n.label}</span>
                            <span>{n.observed.toLocaleString("en-IN")} / {Math.round(n.threshold).toLocaleString("en-IN")}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
