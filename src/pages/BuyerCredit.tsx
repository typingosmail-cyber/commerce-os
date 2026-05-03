import React, { useState, useMemo } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/lib/auth-context";
import { mockProfile, simulateOrder, aprFor, computeLimit, generateSchedule, nextDueInstallment } from "@/lib/bnpl";
import {
  CreditCard, TrendingUp, ShieldCheck, Clock, Sparkles, AlertTriangle,
  ArrowUpRight, Wallet, Calculator, Award, ChevronDown, ChevronRight, CalendarDays,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

const fmt = (n: number) => `₹${n.toLocaleString("en-IN")}`;

const TIER_COLORS: Record<string, string> = {
  Starter: "bg-muted text-muted-foreground",
  Growth: "bg-secondary text-secondary-foreground",
  Pro: "bg-primary text-primary-foreground",
  Enterprise: "bg-success text-success-foreground",
};

export default function BuyerCredit() {
  const { user } = useAuth();
  const baseTrust = user?.trustScore ?? 720;
  const profile = useMemo(() => mockProfile(user?.id ?? "demo", baseTrust), [user, baseTrust]);

  const [orderAmount, setOrderAmount] = useState(150000);
  const [tenure, setTenure] = useState<30 | 60 | 90>(60);
  const sim = simulateOrder(profile, orderAmount, tenure);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const schedules = useMemo(
    () => Object.fromEntries(profile.creditLines.map((cl) => [cl.id, generateSchedule(cl)])),
    [profile],
  );

  const utilization = profile.approvedLimit > 0 ? (profile.utilized / profile.approvedLimit) * 100 : 0;

  const projectedLimit = useMemo(() => {
    const future = profile.factors.map(f => ({ ...f, score: Math.min(100, f.score + 8) }));
    return computeLimit(future, profile.totalGmv * 0.3);
  }, [profile]);

  const requestDrawdown = () => {
    if (!sim.eligible) {
      toast({ title: "Cannot draw down", description: sim.reason, variant: "destructive" });
      return;
    }
    toast({
      title: "Credit Approved ✓",
      description: `${fmt(orderAmount)} disbursed for ${tenure} days @ ${profile.apr}% APR`,
    });
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="container py-8 space-y-6 flex-1">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <CreditCard className="h-5 w-5 text-primary" />
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Vyapar Credit
              </span>
            </div>
            <h1 className="text-3xl font-display font-bold text-foreground">
              Buy Now, Pay Later
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Dynamic credit limits underwritten by your trust score & transaction history.
            </p>
          </div>
          <Badge className={`${TIER_COLORS[profile.tier]} text-sm px-3 py-1.5`}>
            <Award className="h-3.5 w-3.5 mr-1.5" /> {profile.tier} Tier
          </Badge>
        </div>

        {/* Hero stats */}
        <div className="grid md:grid-cols-4 gap-4">
          <Card className="md:col-span-2 bg-gradient-to-br from-primary to-primary/80 text-primary-foreground">
            <CardContent className="p-6">
              <p className="text-xs uppercase tracking-wider opacity-80 mb-2">Available Credit</p>
              <p className="text-4xl font-display font-bold">{fmt(profile.available)}</p>
              <div className="mt-4 space-y-2">
                <div className="flex justify-between text-xs opacity-90">
                  <span>Used {fmt(profile.utilized)}</span>
                  <span>Limit {fmt(profile.approvedLimit)}</span>
                </div>
                <Progress value={utilization} className="h-2 bg-primary-foreground/20" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground">Interest Rate</span>
                <TrendingUp className="h-4 w-4 text-success" />
              </div>
              <p className="text-2xl font-display font-bold text-foreground">{profile.apr}%</p>
              <p className="text-xs text-muted-foreground mt-1">APR · falls as trust grows</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground">On-time Repayment</span>
                <ShieldCheck className="h-4 w-4 text-success" />
              </div>
              <p className="text-2xl font-display font-bold text-foreground">
                {Math.round(profile.onTimeRate * 100)}%
              </p>
              <p className="text-xs text-muted-foreground mt-1">Across 18 prior lines</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="overview">
          <TabsList>
            <TabsTrigger value="overview">Score Breakdown</TabsTrigger>
            <TabsTrigger value="simulate">Quick Drawdown</TabsTrigger>
            <TabsTrigger value="active">Active Lines</TabsTrigger>
            <TabsTrigger value="grow">Grow Limit</TabsTrigger>
            <TabsTrigger value="audit">Audit Trail</TabsTrigger>
          </TabsList>

          {/* Score breakdown */}
          <TabsContent value="overview" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">How Your Limit Was Calculated</CardTitle>
                <CardDescription>
                  Weighted average of 5 factors. Each percentage point unlocks more credit.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                {profile.factors.map((f) => (
                  <div key={f.label}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm text-foreground">{f.label}</span>
                        <Badge variant="outline" className="text-[10px]">{f.weight}% weight</Badge>
                      </div>
                      <span className="text-sm font-semibold text-foreground">{f.score}/100</span>
                    </div>
                    <Progress value={f.score} className="h-2" />
                    <p className="text-xs text-muted-foreground mt-1.5">{f.description}</p>
                  </div>
                ))}

                <div className="pt-4 border-t flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Composite Score</p>
                    <p className="text-2xl font-display font-bold text-foreground">
                      {Math.round(
                        profile.factors.reduce((a, f) => a + (f.score * f.weight) / 100, 0)
                      )}/100
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Approved Limit</p>
                    <p className="text-2xl font-display font-bold text-primary">{fmt(profile.approvedLimit)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Simulator */}
          <TabsContent value="simulate" className="space-y-4 mt-4">
            <div className="grid md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Calculator className="h-4 w-4" /> Order Calculator
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div>
                    <Label className="text-xs">Order Amount</Label>
                    <Input
                      type="number"
                      value={orderAmount}
                      onChange={(e) => setOrderAmount(Number(e.target.value) || 0)}
                      className="mt-1"
                    />
                    <Slider
                      value={[orderAmount]}
                      max={Math.max(profile.approvedLimit, 500000)}
                      step={5000}
                      onValueChange={(v) => setOrderAmount(v[0])}
                      className="mt-3"
                    />
                  </div>

                  <div>
                    <Label className="text-xs">Repayment Tenure</Label>
                    <div className="grid grid-cols-3 gap-2 mt-1">
                      {([30, 60, 90] as const).map((t) => (
                        <Button
                          key={t}
                          variant={tenure === t ? "default" : "outline"}
                          size="sm"
                          onClick={() => setTenure(t)}
                        >
                          {t} days
                        </Button>
                      ))}
                    </div>
                  </div>

                  <Button className="w-full" onClick={requestDrawdown} disabled={!sim.eligible}>
                    <Sparkles className="h-4 w-4 mr-1.5" />
                    {sim.eligible ? "Request Drawdown" : "Limit Exceeded"}
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Cost Breakdown</CardTitle>
                  <CardDescription>{sim.reason}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 text-sm">
                    <Row label="Principal" value={fmt(orderAmount)} />
                    <Row label={`Interest @ ${profile.apr}% × ${tenure}d`} value={fmt(sim.interest)} />
                    <Row label="Platform fee (0.5%)" value={fmt(sim.platformFee)} />
                    <div className="h-px bg-border" />
                    <Row label="Total repayable" value={fmt(sim.totalRepay)} bold />
                    <Row label={`EMI (${tenure / 30} installment${tenure > 30 ? "s" : ""})`} value={fmt(sim.emi)} />
                  </div>
                  {!sim.eligible && (
                    <div className="mt-4 p-3 rounded-lg bg-destructive/10 text-destructive text-xs flex gap-2">
                      <AlertTriangle className="h-4 w-4 shrink-0" />
                      <span>{sim.reason}. Repay outstanding lines or upgrade tier to unlock more.</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Active credit lines */}
          <TabsContent value="active" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Credit Lines & Repayment Schedule</CardTitle>
                <CardDescription>Auto-calculated installments based on tenure & disbursement date.</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-8"></TableHead>
                      <TableHead>Order</TableHead>
                      <TableHead>Supplier</TableHead>
                      <TableHead>Outstanding</TableHead>
                      <TableHead>Next Due</TableHead>
                      <TableHead>Tenure</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {profile.creditLines.map((cl) => {
                      const schedule = schedules[cl.id];
                      const next = nextDueInstallment(schedule);
                      const isOpen = expanded[cl.id];
                      return (
                        <React.Fragment key={cl.id}>
                          <TableRow key={cl.id} className="cursor-pointer" onClick={() => setExpanded((p) => ({ ...p, [cl.id]: !p[cl.id] }))}>
                            <TableCell>
                              {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                            </TableCell>
                            <TableCell className="font-mono text-xs">{cl.orderRef}</TableCell>
                            <TableCell>{cl.supplierName}</TableCell>
                            <TableCell className="font-semibold">{fmt(cl.outstanding)}</TableCell>
                            <TableCell className="text-xs">
                              {next && cl.status === "active" ? (
                                <div className="flex flex-col">
                                  <span>{next.dueDate}</span>
                                  <span className={`text-[10px] ${next.status === "overdue" ? "text-destructive" : next.status === "due" ? "text-warning" : "text-muted-foreground"}`}>
                                    {next.daysUntilDue < 0 ? `${Math.abs(next.daysUntilDue)}d overdue` : `in ${next.daysUntilDue}d`}
                                  </span>
                                </div>
                              ) : <span className="text-muted-foreground">—</span>}
                            </TableCell>
                            <TableCell>{cl.tenureDays}d</TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  cl.status === "paid" ? "outline"
                                  : cl.status === "overdue" ? "destructive"
                                  : "secondary"
                                }
                                className="capitalize text-[10px]"
                              >
                                {cl.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                              {cl.status === "active" && next ? (
                                <Button size="sm" variant="outline" onClick={() => toast({ title: "EMI paid", description: `${fmt(next.total)} debited for installment #${next.installmentNo}` })}>
                                  Pay EMI
                                </Button>
                              ) : (
                                <span className="text-xs text-muted-foreground">—</span>
                              )}
                            </TableCell>
                          </TableRow>
                          {isOpen && (
                            <TableRow key={`${cl.id}-schedule`} className="bg-muted/30 hover:bg-muted/30">
                              <TableCell colSpan={8} className="p-4">
                                <div className="flex items-center gap-2 mb-3 text-xs font-medium text-foreground">
                                  <CalendarDays className="h-3.5 w-3.5" />
                                  Repayment schedule · disbursed {cl.disbursedAt} · {cl.apr}% APR
                                </div>
                                <div className="rounded-md border bg-background overflow-hidden">
                                  <Table>
                                    <TableHeader>
                                      <TableRow>
                                        <TableHead className="h-9">#</TableHead>
                                        <TableHead className="h-9">Due Date</TableHead>
                                        <TableHead className="h-9">Principal</TableHead>
                                        <TableHead className="h-9">Interest</TableHead>
                                        <TableHead className="h-9">Fee</TableHead>
                                        <TableHead className="h-9">Total EMI</TableHead>
                                        <TableHead className="h-9">Remaining</TableHead>
                                        <TableHead className="h-9">Status</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {schedule.map((inst) => (
                                        <TableRow key={inst.installmentNo}>
                                          <TableCell className="py-2 font-mono text-xs">{inst.installmentNo}</TableCell>
                                          <TableCell className="py-2 text-xs">{inst.dueDate}</TableCell>
                                          <TableCell className="py-2 text-xs">{fmt(inst.principal)}</TableCell>
                                          <TableCell className="py-2 text-xs">{fmt(inst.interest)}</TableCell>
                                          <TableCell className="py-2 text-xs">{fmt(inst.fee)}</TableCell>
                                          <TableCell className="py-2 text-xs font-semibold">{fmt(inst.total)}</TableCell>
                                          <TableCell className="py-2 text-xs text-muted-foreground">{fmt(inst.remainingPrincipal)}</TableCell>
                                          <TableCell className="py-2">
                                            <Badge
                                              variant={
                                                inst.status === "paid" ? "outline"
                                                : inst.status === "overdue" ? "destructive"
                                                : inst.status === "due" ? "default"
                                                : "secondary"
                                              }
                                              className="capitalize text-[10px]"
                                            >
                                              {inst.status}
                                            </Badge>
                                          </TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Grow limit */}
          <TabsContent value="grow" className="mt-4 space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <Card className="bg-gradient-to-br from-success/10 to-success/5 border-success/30">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <ArrowUpRight className="h-4 w-4 text-success" /> Projected Limit
                  </CardTitle>
                  <CardDescription>If you complete the next 3 milestones</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-display font-bold text-foreground">{fmt(projectedLimit)}</p>
                  <p className="text-sm text-success mt-1">
                    +{fmt(projectedLimit - profile.approvedLimit)} unlock potential
                  </p>
                  <div className="mt-4 text-xs text-muted-foreground">
                    Trust upgrade → APR drops to {aprFor(Math.min(1000, baseTrust + 80))}%
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Limit Boosters</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {[
                    { icon: ShieldCheck, label: "Complete platinum verification", boost: "+₹2,00,000" },
                    { icon: Clock, label: "5 more on-time repayments", boost: "+₹75,000" },
                    { icon: Wallet, label: "Maintain ₹50K wallet balance", boost: "+₹50,000" },
                    { icon: TrendingUp, label: "Cross ₹50L cumulative GMV", boost: "+₹3,00,000" },
                  ].map((b) => (
                    <div key={b.label} className="flex items-center justify-between p-2.5 rounded-lg border">
                      <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center">
                          <b.icon className="h-4 w-4 text-primary" />
                        </div>
                        <span className="text-sm text-foreground">{b.label}</span>
                      </div>
                      <Badge variant="outline" className="text-success border-success/40 text-xs">
                        {b.boost}
                      </Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Tier Roadmap</CardTitle>
                <CardDescription>Higher tiers unlock larger limits and lower APR.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-4 gap-3">
                  {([
                    { t: "Starter", trust: "0–499", apr: "18-22%", limit: "₹25K-₹2L" },
                    { t: "Growth", trust: "500–699", apr: "14-18%", limit: "₹2L-₹10L" },
                    { t: "Pro", trust: "700–849", apr: "11-14%", limit: "₹10L-₹50L" },
                    { t: "Enterprise", trust: "850+", apr: "9-11%", limit: "₹50L+" },
                  ] as const).map((row) => (
                    <div
                      key={row.t}
                      className={`p-4 rounded-lg border ${profile.tier === row.t ? "border-primary bg-primary/5" : ""}`}
                    >
                      <Badge className={`${TIER_COLORS[row.t]} text-[10px] mb-2`}>{row.t}</Badge>
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between"><span className="text-muted-foreground">Trust</span><span>{row.trust}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">APR</span><span>{row.apr}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Limit</span><span>{row.limit}</span></div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
      <Footer />
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between ${bold ? "font-semibold text-foreground" : "text-muted-foreground"}`}>
      <span>{label}</span>
      <span className={bold ? "text-foreground" : "text-foreground"}>{value}</span>
    </div>
  );
}
