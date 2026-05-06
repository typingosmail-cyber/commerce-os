import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertRule, AlertEvent, ComparisonOp, METRICS, TEAMS, VECTOR_LABEL, SEVERITY_STYLE,
  CHANNEL_LABEL, NotifyChannel, AlertSeverity, RiskVector, TeamId,
  loadRules, loadEvents, createRule, updateRule, deleteRule,
  evaluateRulesAgainstProfiles, recordEvents, acknowledgeEvent, clearEvents,
  getMetric, getTeam,
} from "@/lib/fraud-alert-rules";
import { applyFalsePositiveOverlay } from "@/lib/false-positive";
import { getMockRiskProfiles } from "@/lib/fraud-detection";
import { toast } from "sonner";
import {
  Bell, BellRing, Plus, Pencil, Trash2, Play, Users, CheckCheck,
  AlertTriangle, Filter,
} from "lucide-react";

const ALL_VECTORS: RiskVector[] = ["documents", "gst", "transactions", "behavior", "network", "composite"];
const ALL_CHANNELS: NotifyChannel[] = ["in_app", "email", "slack", "sms", "webhook"];

interface RuleDraft {
  name: string;
  enabled: boolean;
  metricId: string;
  op: ComparisonOp;
  threshold: number;
  severity: AlertSeverity;
  cooldownMinutes: number;
  team: TeamId;
  channels: NotifyChannel[];
  notes: string;
}

function defaultDraft(): RuleDraft {
  const m = METRICS[0];
  return {
    name: "", enabled: true, metricId: m.id, op: m.defaultOp, threshold: m.defaultThreshold,
    severity: "warning", cooldownMinutes: 60, team: "risk_ops",
    channels: ["in_app", "email"], notes: "",
  };
}

function fmtValue(value: number, unit: string) {
  if (unit === "percent") return `${value}%`;
  if (unit === "multiplier") return `${value}×`;
  return value.toString();
}

export default function AlertRulesPanel() {
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [events, setEvents] = useState<AlertEvent[]>([]);
  const [filterVector, setFilterVector] = useState<RiskVector | "all">("all");
  const [draftOpen, setDraftOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<RuleDraft>(defaultDraft());

  useEffect(() => {
    setRules(loadRules());
    setEvents(loadEvents());
  }, []);

  const filteredRules = useMemo(
    () => rules.filter((r) => filterVector === "all" || r.vector === filterVector),
    [rules, filterVector],
  );

  const stats = useMemo(() => ({
    total: rules.length,
    enabled: rules.filter((r) => r.enabled).length,
    critical: rules.filter((r) => r.severity === "critical").length,
    triggers24h: events.filter((e) => Date.now() - new Date(e.firedAt).getTime() < 86400000).length,
    unack: events.filter((e) => !e.acknowledged).length,
  }), [rules, events]);

  function openCreate() {
    setEditingId(null);
    setDraft(defaultDraft());
    setDraftOpen(true);
  }

  function openEdit(r: AlertRule) {
    setEditingId(r.id);
    setDraft({
      name: r.name, enabled: r.enabled, metricId: r.metricId, op: r.op, threshold: r.threshold,
      severity: r.severity, cooldownMinutes: r.cooldownMinutes, team: r.team,
      channels: r.channels, notes: r.notes ?? "",
    });
    setDraftOpen(true);
  }

  function handleMetricChange(metricId: string) {
    const m = getMetric(metricId);
    if (!m) return;
    setDraft((d) => ({ ...d, metricId, op: m.defaultOp, threshold: m.defaultThreshold }));
  }

  function toggleChannel(c: NotifyChannel) {
    setDraft((d) => ({
      ...d,
      channels: d.channels.includes(c) ? d.channels.filter((x) => x !== c) : [...d.channels, c],
    }));
  }

  function saveDraft() {
    if (!draft.name.trim()) {
      toast.error("Rule name is required");
      return;
    }
    if (draft.channels.length === 0) {
      toast.error("Select at least one notification channel");
      return;
    }
    const metric = getMetric(draft.metricId);
    if (!metric) return;
    if (editingId) {
      const updated = updateRule(editingId, { ...draft, vector: metric.vector });
      if (updated) {
        setRules(loadRules());
        toast.success("Alert rule updated", { description: `${updated.name} now notifies ${getTeam(updated.team)?.name}` });
      }
    } else {
      const created = createRule({ ...draft, vector: metric.vector });
      setRules(loadRules());
      toast.success("Alert rule created", { description: `${created.name} → ${getTeam(created.team)?.name}` });
    }
    setDraftOpen(false);
  }

  function handleToggle(r: AlertRule) {
    updateRule(r.id, { enabled: !r.enabled });
    setRules(loadRules());
  }

  function handleDelete(r: AlertRule) {
    deleteRule(r.id);
    setRules(loadRules());
    toast.info(`Rule "${r.name}" removed`);
  }

  function runEvaluation() {
    const profiles = applyFalsePositiveOverlay(getMockRiskProfiles());
    const fired = evaluateRulesAgainstProfiles(loadRules(), profiles);
    if (fired.length === 0) {
      toast.info("Evaluation complete — no rules triggered");
      return;
    }
    const merged = recordEvents(fired);
    setEvents(merged);
    setRules(loadRules());
    const teams = new Set(fired.map((e) => getTeam(e.team)?.name).filter(Boolean));
    toast.success(`${fired.length} alerts fired`, {
      description: `Notifying ${[...teams].join(", ")}`,
    });
  }

  function handleAck(id: string) {
    acknowledgeEvent(id);
    setEvents(loadEvents());
  }

  function handleClearEvents() {
    clearEvents();
    setEvents([]);
    toast.info("Alert history cleared");
  }

  const selectedMetric = getMetric(draft.metricId);

  return (
    <div className="space-y-4">
      {/* Stat row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card><CardContent className="pt-4">
          <p className="text-xs text-muted-foreground">Total rules</p>
          <p className="text-xl font-bold">{stats.total}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <p className="text-xs text-muted-foreground">Enabled</p>
          <p className="text-xl font-bold text-success">{stats.enabled}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <p className="text-xs text-muted-foreground">Critical rules</p>
          <p className="text-xl font-bold text-destructive">{stats.critical}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <p className="text-xs text-muted-foreground">Triggers (24h)</p>
          <p className="text-xl font-bold">{stats.triggers24h}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <p className="text-xs text-muted-foreground">Unacknowledged</p>
          <p className="text-xl font-bold text-orange-600">{stats.unack}</p>
        </CardContent></Card>
      </div>

      <Tabs defaultValue="rules" className="space-y-4">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <TabsList>
            <TabsTrigger value="rules"><Bell className="h-3.5 w-3.5 mr-1" /> Alert Rules</TabsTrigger>
            <TabsTrigger value="events"><BellRing className="h-3.5 w-3.5 mr-1" /> Triggered Alerts</TabsTrigger>
            <TabsTrigger value="teams"><Users className="h-3.5 w-3.5 mr-1" /> Teams & Routing</TabsTrigger>
          </TabsList>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={runEvaluation}>
              <Play className="h-3.5 w-3.5 mr-1" /> Evaluate now
            </Button>
            <Button size="sm" onClick={openCreate}>
              <Plus className="h-3.5 w-3.5 mr-1" /> New rule
            </Button>
          </div>
        </div>

        {/* RULES */}
        <TabsContent value="rules" className="space-y-3">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <CardTitle className="text-base">Configured rules</CardTitle>
                  <CardDescription>Define a threshold per risk vector and route to a team.</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Filter className="h-3.5 w-3.5 text-muted-foreground" />
                  <Select value={filterVector} onValueChange={(v) => setFilterVector(v as RiskVector | "all")}>
                    <SelectTrigger className="h-8 w-44 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All vectors</SelectItem>
                      {ALL_VECTORS.map((v) => <SelectItem key={v} value={v}>{VECTOR_LABEL[v]}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Rule</TableHead>
                    <TableHead>Condition</TableHead>
                    <TableHead>Severity</TableHead>
                    <TableHead>Notify</TableHead>
                    <TableHead>Triggers</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRules.map((r) => {
                    const metric = getMetric(r.metricId);
                    const team = getTeam(r.team);
                    return (
                      <TableRow key={r.id} className={r.enabled ? "" : "opacity-60"}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Switch checked={r.enabled} onCheckedChange={() => handleToggle(r)} />
                            <div>
                              <div className="text-sm font-medium">{r.name}</div>
                              <div className="text-[11px] text-muted-foreground">
                                <Badge variant="outline" className="text-[10px] mr-1">{VECTOR_LABEL[r.vector]}</Badge>
                                cooldown {r.cooldownMinutes}m
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs">
                          <span className="font-medium">{metric?.label}</span>{" "}
                          <span className="text-muted-foreground">{r.op}</span>{" "}
                          <span className="font-mono">{fmtValue(r.threshold, metric?.unit ?? "score")}</span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`${SEVERITY_STYLE[r.severity]} text-[10px] capitalize`}>
                            {r.severity}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs">
                          <div className="font-medium">{team?.name}</div>
                          <div className="text-[10px] text-muted-foreground">
                            {r.channels.map((c) => CHANNEL_LABEL[c]).join(" · ")}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm font-semibold">{r.triggers}</div>
                          {r.lastTriggeredAt && (
                            <div className="text-[10px] text-muted-foreground">
                              {new Date(r.lastTriggeredAt).toLocaleString()}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openEdit(r)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive" onClick={() => handleDelete(r)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {filteredRules.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-8">
                        No rules configured. Click "New rule" to get started.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* EVENTS */}
        <TabsContent value="events" className="space-y-3">
          <Card>
            <CardHeader className="pb-3 flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">Triggered alerts</CardTitle>
                <CardDescription>Audit trail of every rule firing.</CardDescription>
              </div>
              {events.length > 0 && (
                <Button variant="outline" size="sm" onClick={handleClearEvents}>Clear history</Button>
              )}
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fired</TableHead>
                    <TableHead>Rule</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Observed</TableHead>
                    <TableHead>Notified</TableHead>
                    <TableHead className="text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {events.slice(0, 50).map((e) => (
                    <TableRow key={e.id}>
                      <TableCell className="text-[11px] text-muted-foreground whitespace-nowrap">
                        {new Date(e.firedAt).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm font-medium">{e.ruleName}</div>
                        <Badge variant="outline" className={`${SEVERITY_STYLE[e.severity]} text-[10px] capitalize mt-0.5`}>
                          {e.severity}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">
                        <div className="font-medium">{e.supplierName}</div>
                        <div className="text-[10px] text-muted-foreground">{e.supplierId}</div>
                      </TableCell>
                      <TableCell className="text-xs">
                        <span className="font-mono">{e.observedValue}</span>{" "}
                        <span className="text-muted-foreground">({e.op} {e.threshold})</span>
                        <div className="text-[10px] text-muted-foreground">{e.metricLabel}</div>
                      </TableCell>
                      <TableCell className="text-xs">
                        <div className="font-medium">{getTeam(e.team)?.name}</div>
                        <div className="text-[10px] text-muted-foreground">
                          {e.channels.map((c) => CHANNEL_LABEL[c]).join(" · ")}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {e.acknowledged ? (
                          <Badge variant="outline" className="bg-success/15 text-success border-success/30 text-[10px]">
                            <CheckCheck className="h-3 w-3 mr-1" /> Acknowledged
                          </Badge>
                        ) : (
                          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => handleAck(e.id)}>
                            Acknowledge
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {events.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-8">
                        No alerts triggered yet. Click "Evaluate now" to test rules against current suppliers.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TEAMS */}
        <TabsContent value="teams" className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
          {TEAMS.map((t) => {
            const ruleCount = rules.filter((r) => r.team === t.id).length;
            return (
              <Card key={t.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">{t.name}</CardTitle>
                    <Badge variant="secondary" className="text-[10px]">{ruleCount} rules</Badge>
                  </div>
                  <CardDescription className="text-xs">{t.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="text-[11px] text-muted-foreground">
                    {t.members} members · default channels
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {t.defaultChannels.map((c) => (
                      <Badge key={c} variant="outline" className="text-[10px]">{CHANNEL_LABEL[c]}</Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>
      </Tabs>

      {/* Create / Edit dialog */}
      <Dialog open={draftOpen} onOpenChange={setDraftOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit alert rule" : "Create alert rule"}</DialogTitle>
            <DialogDescription>
              Choose a risk metric, set a threshold, and pick the team that should be notified.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label className="text-xs">Rule name</Label>
                <Input
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                  placeholder="e.g. Critical document similarity"
                />
              </div>

              <div>
                <Label className="text-xs">Risk metric</Label>
                <Select value={draft.metricId} onValueChange={handleMetricChange}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {METRICS.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {VECTOR_LABEL[m.vector]} · {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs">Comparison</Label>
                <Select value={draft.op} onValueChange={(v) => setDraft({ ...draft, op: v as ComparisonOp })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value=">=">≥ greater or equal</SelectItem>
                    <SelectItem value=">">&gt; greater than</SelectItem>
                    <SelectItem value="<=">≤ less or equal</SelectItem>
                    <SelectItem value="<">&lt; less than</SelectItem>
                    <SelectItem value="==">= equal</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {selectedMetric && (
                <div className="col-span-2">
                  <div className="flex items-center justify-between mb-1">
                    <Label className="text-xs">Threshold</Label>
                    <span className="text-sm font-mono font-semibold">
                      {fmtValue(draft.threshold, selectedMetric.unit)}
                    </span>
                  </div>
                  <Slider
                    min={selectedMetric.min}
                    max={selectedMetric.max}
                    step={selectedMetric.step}
                    value={[draft.threshold]}
                    onValueChange={(v) => setDraft({ ...draft, threshold: v[0] })}
                  />
                  <p className="text-[11px] text-muted-foreground mt-1">{selectedMetric.description}</p>
                </div>
              )}

              <div>
                <Label className="text-xs">Severity</Label>
                <Select value={draft.severity} onValueChange={(v) => setDraft({ ...draft, severity: v as AlertSeverity })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="info">Info</SelectItem>
                    <SelectItem value="warning">Warning</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs">Cooldown (minutes)</Label>
                <Input
                  type="number" min={0} value={draft.cooldownMinutes}
                  onChange={(e) => setDraft({ ...draft, cooldownMinutes: Number(e.target.value) || 0 })}
                />
              </div>

              <div className="col-span-2">
                <Label className="text-xs">Notify team</Label>
                <Select value={draft.team} onValueChange={(v) => setDraft({ ...draft, team: v as TeamId })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TEAMS.map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.name} — {t.description}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="col-span-2">
                <Label className="text-xs">Notification channels</Label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mt-1">
                  {ALL_CHANNELS.map((c) => (
                    <label key={c} className="flex items-center gap-2 text-xs border rounded-md px-2 py-1.5 cursor-pointer">
                      <Checkbox checked={draft.channels.includes(c)} onCheckedChange={() => toggleChannel(c)} />
                      {CHANNEL_LABEL[c]}
                    </label>
                  ))}
                </div>
              </div>

              <div className="col-span-2">
                <Label className="text-xs">Notes / runbook (optional)</Label>
                <Textarea
                  rows={2}
                  value={draft.notes}
                  onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
                  placeholder="What should the team do when this fires?"
                />
              </div>

              <div className="col-span-2 flex items-center gap-2">
                <Switch checked={draft.enabled} onCheckedChange={(v) => setDraft({ ...draft, enabled: v })} />
                <Label className="text-xs">Rule enabled</Label>
              </div>
            </div>

            <div className="rounded-md border bg-muted/30 p-3 text-xs flex items-start gap-2">
              <AlertTriangle className="h-3.5 w-3.5 text-yellow-600 mt-0.5 shrink-0" />
              <div>
                When this rule fires, <span className="font-semibold">{getTeam(draft.team)?.name}</span>{" "}
                will be notified via{" "}
                <span className="font-semibold">{draft.channels.map((c) => CHANNEL_LABEL[c]).join(", ") || "—"}</span>{" "}
                with severity{" "}
                <Badge variant="outline" className={`${SEVERITY_STYLE[draft.severity]} text-[10px] capitalize`}>
                  {draft.severity}
                </Badge>.
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDraftOpen(false)}>Cancel</Button>
            <Button onClick={saveDraft}>{editingId ? "Save changes" : "Create rule"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
