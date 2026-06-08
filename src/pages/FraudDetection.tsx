import { useMemo, useState } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  ShieldAlert, AlertTriangle, FileWarning, Activity, Network, Search,
  TrendingUp, Eye, Ban, CheckCircle2, Clock, Users, ScanSearch, Sparkles,
} from "lucide-react";
import {
  getMockRiskProfiles, getMockCases, summarizeFraud, RISK_COLOR,
  type SupplierRiskProfile, type RiskLevel, type FraudCase,
} from "@/lib/fraud-detection";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, Legend, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
} from "recharts";
import FraudCaseWorkflow from "@/components/admin/FraudCaseWorkflow";
import { openCaseFromSupplier } from "@/lib/fraud-cases";
import FalsePositiveDialog from "@/components/admin/FalsePositiveDialog";
import AlertRulesPanel from "@/components/admin/AlertRulesPanel";
import RiskTimelineAudit from "@/components/admin/RiskTimelineAudit";
import FraudAlertsPanel from "@/components/admin/FraudAlertsPanel";
import { applyFalsePositiveOverlay } from "@/lib/false-positive";
import { detectAndDispatch } from "@/lib/fraud-alerts";
import { useNotifications } from "@/lib/notifications";

const CATEGORY_ICON = {
  documents: FileWarning,
  gst: ShieldAlert,
  transactions: Activity,
  behavior: TrendingUp,
  network: Network,
} as const;

const STATUS_STYLE: Record<FraudCase["status"], string> = {
  open: "bg-destructive/15 text-destructive border-destructive/30",
  investigating: "bg-yellow-500/15 text-yellow-700 border-yellow-500/30",
  escalated: "bg-orange-500/15 text-orange-700 border-orange-500/30",
  resolved: "bg-success/15 text-success border-success/30",
};

export default function FraudDetection() {
  const [profiles, setProfiles] = useState<SupplierRiskProfile[]>(() => applyFalsePositiveOverlay(getMockRiskProfiles()));
  const [cases, setCases] = useState<FraudCase[]>(() => getMockCases(getMockRiskProfiles()));
  const [search, setSearch] = useState("");
  const [filterLevel, setFilterLevel] = useState<RiskLevel | "all">("all");
  const [selected, setSelected] = useState<SupplierRiskProfile | null>(null);
  const [scanning, setScanning] = useState(false);

  const summary = useMemo(() => summarizeFraud(profiles), [profiles]);

  const filtered = useMemo(() => profiles.filter(p => {
    const matchesSearch = !search ||
      p.supplierName.toLowerCase().includes(search.toLowerCase()) ||
      p.supplierId.toLowerCase().includes(search.toLowerCase()) ||
      p.gstin.toLowerCase().includes(search.toLowerCase());
    const matchesLevel = filterLevel === "all" || p.riskLevel === filterLevel;
    return matchesSearch && matchesLevel;
  }), [profiles, search, filterLevel]);

  const distribution = (["critical", "high", "medium", "low"] as RiskLevel[]).map(l => ({
    name: l.charAt(0).toUpperCase() + l.slice(1),
    value: summary.counts[l],
    level: l,
  }));

  const pieColors = ["hsl(var(--destructive))", "hsl(24 95% 53%)", "hsl(45 93% 47%)", "hsl(var(--success))"];

  const signalCategoryData = useMemo(() => {
    const buckets: Record<string, number> = { documents: 0, gst: 0, transactions: 0, behavior: 0, network: 0 };
    profiles.forEach(p => p.signals.forEach(s => { buckets[s.category] = (buckets[s.category] || 0) + 1; }));
    return Object.entries(buckets).map(([k, v]) => ({ category: k.charAt(0).toUpperCase() + k.slice(1), count: v }));
  }, [profiles]);

  const radarData = useMemo(() => {
    if (!selected) return [];
    return [
      { axis: "Doc Sim", value: selected.docSimilarityScore },
      { axis: "GST Churn", value: Math.min(100, selected.gstChangesLast12m * 25) },
      { axis: "Tx Anomaly", value: selected.txAnomalyScore },
      { axis: "Refunds", value: selected.refundRate * 100 },
      { axis: "Disputes", value: selected.disputeRate * 100 },
      { axis: "Velocity", value: Math.min(100, selected.velocitySpike * 15) },
      { axis: "Device", value: Math.min(100, selected.ipDeviceClusters * 20) },
    ];
  }, [selected]);

  const refresh = () => setProfiles(applyFalsePositiveOverlay(getMockRiskProfiles()));

  const handleRescan = () => {
    setScanning(true);
    setTimeout(() => {
      const refreshed = applyFalsePositiveOverlay(getMockRiskProfiles()).map(p => ({
        ...p,
        riskScore: Math.min(100, p.riskScore + Math.round((Math.random() - 0.5) * 8)),
      }));
      setProfiles(refreshed);
      setScanning(false);
      toast.success("AI fraud scan complete", { description: `Re-evaluated ${refreshed.length} suppliers across 9 risk vectors.` });
    }, 1400);
  };

  const handleAction = (p: SupplierRiskProfile, action: "suspend" | "review" | "clear") => {
    if (action === "suspend") toast.error(`${p.supplierName} suspended`, { description: "Listings hidden, escrow funds frozen pending review." });
    if (action === "review") {
      const c = openCaseFromSupplier(p);
      toast.info(`Case ${c.id} opened for ${p.supplierName}`, { description: "Open the Cases tab to investigate." });
    }
    if (action === "clear") toast.success(`${p.supplierName} cleared`, { description: "Marked as false positive — score recalibrated." });
    setSelected(null);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="container py-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <ShieldAlert className="h-6 w-6 text-destructive" />
              <h1 className="text-2xl md:text-3xl font-bold">Fraud Detection Center</h1>
              <Badge variant="outline" className="ml-2 text-[10px]"><Sparkles className="h-3 w-3 mr-1" /> AI-Powered</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Continuous monitoring across documents, GST records, transactions & behavioral signals.
            </p>
          </div>
          <Button onClick={handleRescan} disabled={scanning} className="gap-2">
            {scanning ? <><Activity className="h-4 w-4 animate-pulse" /> Scanning…</> : <><ScanSearch className="h-4 w-4" /> Run Fraud Scan</>}
          </Button>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs text-muted-foreground">Suppliers Monitored</p>
                <Users className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="text-2xl font-bold">{summary.total}</p>
              <p className="text-[11px] text-muted-foreground mt-1">Across all categories</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs text-muted-foreground">Flagged (High+)</p>
                <AlertTriangle className="h-4 w-4 text-destructive" />
              </div>
              <p className="text-2xl font-bold text-destructive">{summary.counts.critical + summary.counts.high}</p>
              <p className="text-[11px] text-muted-foreground mt-1">{summary.flaggedPct}% of total</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs text-muted-foreground">Avg Risk Score</p>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="text-2xl font-bold">{summary.avgScore}<span className="text-sm text-muted-foreground">/100</span></p>
              <Progress value={summary.avgScore} className="h-1.5 mt-2" />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs text-muted-foreground">Active Signals</p>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="text-2xl font-bold">{summary.totalSignals}</p>
              <p className="text-[11px] text-muted-foreground mt-1">Across 5 detection vectors</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="suppliers" className="space-y-4">
          <TabsList>
            <TabsTrigger value="suppliers">Risky Suppliers</TabsTrigger>
            <TabsTrigger value="timeline">Risk Timeline</TabsTrigger>
            <TabsTrigger value="cases">Open Cases</TabsTrigger>
            <TabsTrigger value="alerts">Alert Rules</TabsTrigger>
            <TabsTrigger value="analytics">Risk Analytics</TabsTrigger>
            <TabsTrigger value="signals">Detection Signals</TabsTrigger>
          </TabsList>

          {/* SUPPLIERS TAB */}
          <TabsContent value="suppliers" className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex flex-col md:flex-row gap-3 md:items-center justify-between">
                  <div>
                    <CardTitle className="text-base">Supplier Risk Registry</CardTitle>
                    <CardDescription>Ranked by composite fraud risk score</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <div className="relative">
                      <Search className="h-4 w-4 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <Input placeholder="Search supplier or GSTIN..." className="pl-8 h-9 w-64" value={search} onChange={e => setSearch(e.target.value)} />
                    </div>
                    <Select value={filterLevel} onValueChange={v => setFilterLevel(v as RiskLevel | "all")}>
                      <SelectTrigger className="h-9 w-36"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Levels</SelectItem>
                        <SelectItem value="critical">Critical</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="low">Low</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Supplier</TableHead>
                      <TableHead>GSTIN / City</TableHead>
                      <TableHead>Risk Score</TableHead>
                      <TableHead>Top Signal</TableHead>
                      <TableHead>Signals</TableHead>
                      <TableHead>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map(p => (
                      <TableRow key={p.supplierId} className="cursor-pointer" onClick={() => setSelected(p)}>
                        <TableCell>
                          <div className="font-medium text-sm">{p.supplierName}</div>
                          <div className="text-[11px] text-muted-foreground">{p.supplierId} · {p.category}</div>
                        </TableCell>
                        <TableCell>
                          <div className="text-xs font-mono">{p.gstin}</div>
                          <div className="text-[11px] text-muted-foreground">{p.city}</div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-20">
                              <Progress value={p.riskScore} className="h-1.5" />
                            </div>
                            <span className="text-sm font-semibold">{p.riskScore}</span>
                            <Badge variant="outline" className={`${RISK_COLOR[p.riskLevel]} text-[10px] capitalize`}>{p.riskLevel}</Badge>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs max-w-[200px] truncate">
                          {p.signals[0]?.label ?? <span className="text-muted-foreground">No flags</span>}
                        </TableCell>
                        <TableCell><Badge variant="secondary" className="text-[10px]">{p.signals.length}</Badge></TableCell>
                        <TableCell>
                          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={e => { e.stopPropagation(); setSelected(p); }}>
                            <Eye className="h-3 w-3 mr-1" /> Review
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {filtered.length === 0 && (
                      <TableRow><TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-8">No suppliers match filters</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TIMELINE TAB */}
          <TabsContent value="timeline" className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex flex-col md:flex-row gap-3 md:items-center justify-between">
                  <div>
                    <CardTitle className="text-base">Supplier Risk Timeline</CardTitle>
                    <CardDescription>Audit how each risk signal accumulated, with links back to source records.</CardDescription>
                  </div>
                  <Select
                    value={selected?.supplierId ?? profiles[0]?.supplierId}
                    onValueChange={v => setSelected(profiles.find(p => p.supplierId === v) ?? null)}
                  >
                    <SelectTrigger className="h-9 w-72"><SelectValue placeholder="Choose supplier" /></SelectTrigger>
                    <SelectContent>
                      {profiles.map(p => (
                        <SelectItem key={p.supplierId} value={p.supplierId}>
                          {p.supplierName} · {p.riskScore}/100
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
            </Card>
            {(selected ?? profiles[0]) && <RiskTimelineAudit profile={selected ?? profiles[0]} />}
          </TabsContent>

          {/* CASES TAB */}
          <TabsContent value="cases" className="space-y-4">
            <FraudCaseWorkflow />
          </TabsContent>


          {/* ALERT RULES TAB */}
          <TabsContent value="alerts" className="space-y-4">
            <AlertRulesPanel />
          </TabsContent>

          {/* ANALYTICS TAB */}
          <TabsContent value="analytics" className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Risk Distribution</CardTitle>
                <CardDescription>Suppliers by risk tier</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie data={distribution} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90} paddingAngle={2}>
                      {distribution.map((_, i) => <Cell key={i} fill={pieColors[i]} />)}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Signals by Category</CardTitle>
                <CardDescription>Where fraud is being detected</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={signalCategoryData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="category" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="count" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          {/* SIGNALS TAB */}
          <TabsContent value="signals" className="space-y-4">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { icon: FileWarning, title: "Document Similarity", desc: "Hash-based comparison of GST/PAN/incorporation files against the entire supplier base. Flags when ≥70% of fields match prior submissions.", metric: "9 of 9 docs scanned per supplier" },
                { icon: ShieldAlert, title: "GST Change Frequency", desc: "Tracks GSTIN, legal name & address changes via MCA/GSTN webhooks. ≥2 changes in 12 months triggers a medium flag.", metric: "Live sync every 24h" },
                { icon: Activity, title: "Transaction Anomalies", desc: "Statistical model compares order timing, value distribution, and frequency against the supplier's category baseline using z-scores.", metric: "Baseline: rolling 90-day window" },
                { icon: TrendingUp, title: "Behavioral Patterns", desc: "Refund rate, dispute rate & post-funding cancellation patterns vs platform benchmarks.", metric: "Industry refund baseline: 4%" },
                { icon: Network, title: "Device & Network Clustering", desc: "Detects shared device fingerprints, IP addresses & browser signatures across supposedly independent supplier accounts.", metric: "Clustered identity detection" },
                { icon: Sparkles, title: "Composite Risk Score", desc: "Weighted aggregation of all signals into a 0–100 score. Auto-recommends suspend / hold / monitor actions.", metric: "Updated on every transaction" },
              ].map((s, i) => {
                const Icon = s.icon;
                return (
                  <Card key={i}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center gap-2">
                        <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Icon className="h-4 w-4 text-primary" />
                        </div>
                        <CardTitle className="text-sm">{s.title}</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-xs text-muted-foreground mb-2">{s.desc}</p>
                      <Badge variant="outline" className="text-[10px]">{s.metric}</Badge>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Detail Dialog */}
      <Dialog open={!!selected} onOpenChange={o => !o && setSelected(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {selected && (
            <>
              <DialogHeader>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <DialogTitle className="flex items-center gap-2">
                      {selected.supplierName}
                      <Badge variant="outline" className={`${RISK_COLOR[selected.riskLevel]} text-[10px] capitalize`}>{selected.riskLevel} risk</Badge>
                    </DialogTitle>
                    <DialogDescription>
                      {selected.supplierId} · {selected.gstin} · {selected.city} · Joined {selected.joinedDays}d ago
                    </DialogDescription>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-3xl font-bold">{selected.riskScore}<span className="text-sm text-muted-foreground">/100</span></p>
                    <p className="text-[11px] text-muted-foreground">Composite risk</p>
                  </div>
                </div>
              </DialogHeader>

              <div className="grid md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm">Risk Vector Map</CardTitle></CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={220}>
                      <RadarChart data={radarData}>
                        <PolarGrid stroke="hsl(var(--border))" />
                        <PolarAngleAxis dataKey="axis" tick={{ fontSize: 10 }} />
                        <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 9 }} />
                        <Radar dataKey="value" stroke="hsl(var(--destructive))" fill="hsl(var(--destructive))" fillOpacity={0.35} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm">Recommended Action</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    <div className="p-3 rounded-lg border bg-muted/30">
                      <p className="text-sm font-medium">{selected.recommendedAction}</p>
                      <p className="text-[11px] text-muted-foreground mt-1">Last reviewed: {new Date(selected.lastReviewed).toLocaleString()}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="p-2 rounded border"><div className="text-muted-foreground text-[10px]">Refund Rate</div><div className="font-semibold">{(selected.refundRate * 100).toFixed(1)}%</div></div>
                      <div className="p-2 rounded border"><div className="text-muted-foreground text-[10px]">Dispute Rate</div><div className="font-semibold">{(selected.disputeRate * 100).toFixed(1)}%</div></div>
                      <div className="p-2 rounded border"><div className="text-muted-foreground text-[10px]">Velocity Spike</div><div className="font-semibold">{selected.velocitySpike.toFixed(1)}×</div></div>
                      <div className="p-2 rounded border"><div className="text-muted-foreground text-[10px]">Device Clusters</div><div className="font-semibold">{selected.ipDeviceClusters}</div></div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Detected Signals ({selected.signals.length})</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {selected.signals.length === 0 && <p className="text-sm text-muted-foreground">No risk signals detected.</p>}
                  {selected.signals.map(s => {
                    const Icon = CATEGORY_ICON[s.category];
                    return (
                      <div key={s.id} className="flex items-start gap-3 p-3 rounded-lg border">
                        <div className="h-8 w-8 rounded-md bg-muted flex items-center justify-center shrink-0">
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium">{s.label}</p>
                            <Badge variant="outline" className={`${RISK_COLOR[s.severity]} text-[9px] capitalize`}>{s.severity}</Badge>
                            <Badge variant="secondary" className="text-[9px]">+{s.weight}</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">{s.detail}</p>
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>

              <div className="pt-2">
                <RiskTimelineAudit profile={selected} />
              </div>

              <div className="flex gap-2 justify-end pt-2">

                <FalsePositiveDialog
                  profile={selected}
                  reviewer="R. Sharma"
                  reviewerRole="Compliance Reviewer"
                  onDone={() => { refresh(); setSelected(null); }}
                  trigger={
                    <Button variant="outline" size="sm">
                      <CheckCircle2 className="h-4 w-4 mr-1" /> Mark False Positive
                    </Button>
                  }
                />
                <Button variant="outline" size="sm" onClick={() => handleAction(selected, "review")}>
                  <Eye className="h-4 w-4 mr-1" /> Open Case
                </Button>
                <Button variant="destructive" size="sm" onClick={() => handleAction(selected, "suspend")}>
                  <Ban className="h-4 w-4 mr-1" /> Suspend Supplier
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
}
