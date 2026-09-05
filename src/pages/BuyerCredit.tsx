import React, { useState, useMemo, useEffect } from "react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/lib/auth-context";
import { mockProfile, simulateOrder, aprFor, computeLimit, generateSchedule, nextDueInstallment, generateAuditTrail, summarizeAuditTrail, auditEventMeta, evaluateBuyerRisk, mockBuyerRiskMetrics, buyerRiskTone, effectiveOutstanding, addPartialRepayment, getPartialRepayments, getPartialPaidForLine, type CreditLimitAuditEntry, type BuyerRiskAssessment, type BuyerRiskAction, type CreditLine, type ScheduleInstallment } from "@/lib/bnpl";
import {
  CreditCard, TrendingUp, ShieldCheck, Clock, Sparkles, AlertTriangle,
  ArrowUpRight, Wallet, Calculator, Award, ChevronDown, ChevronRight, CalendarDays,
  TrendingDown, CheckCircle2, Trophy, AlertOctagon, BadgeCheck, UserCog, History, Download, ArrowDownRight,
  ShieldAlert, Ban, Snowflake, Activity, Fingerprint, Gauge, Scale, Zap, XCircle, Loader2, RefreshCw,
  FileDown, FileSpreadsheet,
} from "lucide-react";
import { downloadScheduleCsv, downloadSchedulePdf } from "@/lib/schedule-export";

import { toast } from "@/hooks/use-toast";
import { FactorDeltaPanel } from "@/components/buyer/FactorDeltaPanel";
import { AuditExportDialog } from "@/components/buyer/AuditExportDialog";

import { LimitRequestPanel } from "@/components/buyer/LimitRequestPanel";
import { AutoRepaymentPanel } from "@/components/buyer/AutoRepaymentPanel";
import { DueRemindersPanel } from "@/components/buyer/DueRemindersPanel";
import { RepaymentLedgerPanel } from "@/components/buyer/RepaymentLedgerPanel";
import { postRepayment, postUnpostedDebits } from "@/lib/repayment-ledger";
import {
  runAutopayForLines, latestAttemptFor, isLineEnrolled, getAutoPayConfig,
  type AutoDebitAttempt,
} from "@/lib/payment-gateway";

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
  const [autopayTick, setAutopayTick] = useState(0);
  const [repayTick, setRepayTick] = useState(0);
  const [repayLine, setRepayLine] = useState<CreditLine | null>(null);
  const schedules = useMemo(
    () => Object.fromEntries(profile.creditLines.map((cl) => [cl.id, generateSchedule(cl)])),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [profile, repayTick],
  );
  const auditTrail = useMemo(() => generateAuditTrail(profile), [profile]);
  const risk = useMemo(() => {
    const metrics = mockBuyerRiskMetrics(profile);
    return evaluateBuyerRisk(profile.buyerId, metrics, profile.approvedLimit);
  }, [profile]);

  // Auto-run autopay on mount for any next-due installments whose scheduled
  // debit date has arrived. Silent — surfaced via the schedule status column.
  useEffect(() => {
    const results = runAutopayForLines(profile.creditLines, schedules);
    const acted = results.filter((r) => r.status === "debited" || r.status === "failed" || r.status === "retry_scheduled");
    // Post every successful gateway collection into the repayment ledger so
    // outstanding balances stay reconciled with what was actually debited.
    const posted = postUnpostedDebits(profile.creditLines);
    if (acted.length > 0 || posted.length > 0) {
      setAutopayTick((n) => n + 1);
      if (posted.length > 0) setRepayTick((n) => n + 1);
    }
  }, [profile, schedules]);

  const triggerAutopay = () => {
    const results = runAutopayForLines(profile.creditLines, schedules);
    const posted = postUnpostedDebits(profile.creditLines);
    setAutopayTick((n) => n + 1);
    if (posted.length > 0) setRepayTick((n) => n + 1);
    const debited = results.filter((r) => r.status === "debited").length;
    const failed = results.filter((r) => r.status === "failed" || r.status === "retry_scheduled").length;
    const pending = results.filter((r) => r.status === "skipped_not_due").length;
    toast({
      title: debited > 0 ? `AutoPay ran on ${debited} line${debited === 1 ? "" : "s"}` : "No installments due right now",
      description: `${debited} debited · ${failed} failed · ${pending} scheduled for later`,
      variant: failed > 0 ? "destructive" : "default",
    });
  };

  const effectiveLimit = risk.effectiveLimit;
  const effectiveAvailable = Math.max(0, effectiveLimit - profile.utilized);
  const utilization = effectiveLimit > 0 ? (profile.utilized / effectiveLimit) * 100 : 100;

  const projectedLimit = useMemo(() => {
    const future = profile.factors.map(f => ({ ...f, score: Math.min(100, f.score + 8) }));
    return computeLimit(future, profile.totalGmv * 0.3);
  }, [profile]);

  const requestDrawdown = () => {
    if (risk.action === "block") {
      toast({ title: "Drawdowns blocked", description: risk.rationale, variant: "destructive" });
      return;
    }
    if (risk.action === "freeze_new") {
      toast({ title: "New drawdowns frozen", description: risk.rationale, variant: "destructive" });
      return;
    }
    if (orderAmount > effectiveAvailable) {
      toast({
        title: "Risk-adjusted limit exceeded",
        description: `Available after risk reductions: ${fmt(effectiveAvailable)}.`,
        variant: "destructive",
      });
      return;
    }
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
          <Card className={`md:col-span-2 ${risk.action === "block" ? "bg-gradient-to-br from-destructive to-destructive/80" : risk.action === "freeze_new" ? "bg-gradient-to-br from-orange-600 to-orange-500" : "bg-gradient-to-br from-primary to-primary/80"} text-primary-foreground`}>
            <CardContent className="p-6">
              <p className="text-xs uppercase tracking-wider opacity-80 mb-2">Available Credit</p>
              <p className="text-4xl font-display font-bold">{fmt(effectiveAvailable)}</p>
              <div className="mt-4 space-y-2">
                <div className="flex justify-between text-xs opacity-90">
                  <span>Used {fmt(profile.utilized)}</span>
                  <span>
                    Limit {fmt(effectiveLimit)}
                    {effectiveLimit < profile.approvedLimit && (
                      <span className="opacity-75 line-through ml-1">{fmt(profile.approvedLimit)}</span>
                    )}
                  </span>
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

        {risk.action !== "monitor" && <RiskBanner risk={risk} />}

        <Tabs defaultValue="overview">
          <TabsList>
            <TabsTrigger value="overview">Score Breakdown</TabsTrigger>
            <TabsTrigger value="deltas">Factor Deltas</TabsTrigger>
            <TabsTrigger value="simulate">Quick Drawdown</TabsTrigger>
            <TabsTrigger value="active">Active Lines</TabsTrigger>
            <TabsTrigger value="risk" className="relative">
              Risk Signals
              {risk.signals.length > 0 && (
                <Badge variant={risk.action === "block" || risk.action === "freeze_new" ? "destructive" : "secondary"} className="ml-1.5 h-4 px-1.5 text-[10px]">
                  {risk.signals.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="grow">Grow Limit</TabsTrigger>
            <TabsTrigger value="request">Request Limit</TabsTrigger>
            <TabsTrigger value="autopay">AutoPay</TabsTrigger>
            <TabsTrigger value="reminders">Reminders</TabsTrigger>
            <TabsTrigger value="ledger">Ledger</TabsTrigger>
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

          <TabsContent value="deltas" className="mt-4">
            <FactorDeltaPanel profile={profile} trail={auditTrail} />
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
              <CardHeader className="flex-row items-start justify-between space-y-0">
                <div>
                  <CardTitle className="text-lg">Credit Lines & Repayment Schedule</CardTitle>
                  <CardDescription>Auto-calculated installments based on tenure & disbursement date.</CardDescription>
                </div>
                <Button size="sm" variant="outline" onClick={triggerAutopay} className="gap-1.5">
                  <Zap className="h-3.5 w-3.5 text-primary" /> Run AutoPay now
                </Button>
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
                            <TableCell className="font-semibold">
                              {(() => { void repayTick; const eff = effectiveOutstanding(cl); return (
                                <div className="flex flex-col">
                                  <span>{fmt(eff)}</span>
                                  {eff < cl.outstanding && (
                                    <span className="text-[10px] text-success">
                                      −{fmt(cl.outstanding - eff)} repaid
                                    </span>
                                  )}
                                </div>
                              ); })()}
                            </TableCell>
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
                              {cl.status === "active" && effectiveOutstanding(cl) > 0 ? (
                                <Button size="sm" variant="outline" onClick={() => setRepayLine(cl)}>
                                  Repay
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
                                  {isLineEnrolled(cl.id) && getAutoPayConfig().enabled ? (
                                    <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 gap-1 ml-1">
                                      <Zap className="h-3 w-3" /> AutoPay on
                                    </Badge>
                                  ) : (
                                    <Badge variant="outline" className="ml-1">Manual</Badge>
                                  )}
                                  <div className="ml-auto flex gap-2">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-7 gap-1.5 text-xs"
                                      onClick={() => {
                                        downloadScheduleCsv(cl, schedule);
                                        toast({ title: "CSV downloaded", description: `${schedule.length} installments for ${cl.orderRef}.` });
                                      }}
                                    >
                                      <FileSpreadsheet className="h-3.5 w-3.5" /> CSV
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-7 gap-1.5 text-xs"
                                      onClick={() => {
                                        const ok = downloadSchedulePdf(cl, schedule);
                                        toast({
                                          title: ok ? "Preparing PDF" : "Popup blocked",
                                          description: ok
                                            ? "Choose \"Save as PDF\" in the print dialog."
                                            : "Allow popups for this site to export the PDF statement.",
                                          variant: ok ? "default" : "destructive",
                                        });
                                      }}
                                    >
                                      <FileDown className="h-3.5 w-3.5" /> PDF
                                    </Button>
                                  </div>
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
                                        <TableHead className="h-9">Paid</TableHead>
                                        <TableHead className="h-9">Remaining</TableHead>
                                        <TableHead className="h-9">Status</TableHead>
                                        <TableHead className="h-9">AutoPay</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {schedule.map((inst) => {
                                        void autopayTick;
                                        const att = latestAttemptFor(cl.id, inst.installmentNo);
                                        return (
                                        <TableRow key={inst.installmentNo}>
                                          <TableCell className="py-2 font-mono text-xs">{inst.installmentNo}</TableCell>
                                          <TableCell className="py-2 text-xs">{inst.dueDate}</TableCell>
                                          <TableCell className="py-2 text-xs">{fmt(inst.principal)}</TableCell>
                                          <TableCell className="py-2 text-xs">{fmt(inst.interest)}</TableCell>
                                          <TableCell className="py-2 text-xs">{fmt(inst.fee)}</TableCell>
                                          <TableCell className="py-2 text-xs font-semibold">{fmt(inst.total)}</TableCell>
                                          <TableCell className="py-2 text-xs text-success">
                                            {inst.paidAmount > 0 ? fmt(inst.paidAmount) : "—"}
                                          </TableCell>
                                          <TableCell className="py-2 text-xs text-muted-foreground">
                                            {fmt(inst.remainingAmount)}
                                          </TableCell>
                                          <TableCell className="py-2">
                                            <Badge
                                              variant={
                                                inst.status === "paid" ? "outline"
                                                : inst.status === "overdue" ? "destructive"
                                                : inst.status === "due" ? "default"
                                                : inst.status === "partial" ? "outline"
                                                : "secondary"
                                              }
                                              className={`capitalize text-[10px] ${inst.status === "partial" ? "bg-warning/10 text-warning border-warning/30" : ""}`}
                                            >
                                              {inst.status}
                                            </Badge>
                                          </TableCell>
                                          <TableCell className="py-2">
                                            <AutopayCell inst={inst} attempt={att} lineId={cl.id} />
                                          </TableCell>
                                        </TableRow>
                                        );
                                      })}
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

          {/* Risk signals */}
          <TabsContent value="risk" className="mt-4 space-y-4">
            <RiskPanel risk={risk} approvedLimit={profile.approvedLimit} />
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

          {/* Limit increase / new credit line requests */}
          <TabsContent value="request" className="mt-4 space-y-4">
            <LimitRequestPanel profile={profile} />
          </TabsContent>

          {/* Auto-repayment / Payment Gateway */}
          <TabsContent value="autopay" className="mt-4 space-y-4">
            <AutoRepaymentPanel lines={profile.creditLines} schedules={schedules} />
          </TabsContent>

          <TabsContent value="reminders" className="mt-4 space-y-4">
            <DueRemindersPanel lines={profile.creditLines} />
          </TabsContent>

          {/* Repayment posting & reconciliation */}
          <TabsContent value="ledger" className="mt-4 space-y-4">
            <RepaymentLedgerPanel
              lines={profile.creditLines}
              refreshKey={repayTick + autopayTick}
              onPosted={() => setRepayTick((n) => n + 1)}
            />
          </TabsContent>



          <TabsContent value="audit" className="mt-4 space-y-4">
            <AuditTrailPanel
              entries={auditTrail}
              currentLimit={profile.approvedLimit}
            />
          </TabsContent>
        </Tabs>
      </main>
      <RepayDialog
        line={repayLine}
        schedule={repayLine ? schedules[repayLine.id] : undefined}
        onClose={() => setRepayLine(null)}
        onPaid={() => { setRepayTick((n) => n + 1); }}
      />
      <Footer />
    </div>
  );
}

function RepayDialog({
  line, schedule, onClose, onPaid,
}: {
  line: CreditLine | null;
  schedule?: ScheduleInstallment[];
  onClose: () => void;
  onPaid: () => void;
}) {
  const open = !!line;
  const outstanding = line ? effectiveOutstanding(line) : 0;
  const nextInst = schedule?.find((s) => s.status !== "paid");
  const suggestedEmi = nextInst?.remainingAmount ?? 0;
  const [amount, setAmount] = useState<number>(suggestedEmi || 0);

  useEffect(() => {
    setAmount(suggestedEmi || Math.min(10000, outstanding));
  }, [line?.id, suggestedEmi, outstanding]);

  if (!line) return null;

  const invalid = amount <= 0 || amount > outstanding;
  const priorPayments = getPartialRepayments(line.id);

  // Preview: simulate the schedule after this payment (waterfall on next unpaid installments)
  const preview = (() => {
    if (!schedule) return [];
    let toApply = Math.min(amount, outstanding);
    return schedule.map((inst) => {
      if (inst.status === "paid") return { ...inst, newPaid: inst.paidAmount, newRemaining: 0, applied: 0 };
      const applied = Math.min(toApply, inst.remainingAmount);
      toApply -= applied;
      const newPaid = inst.paidAmount + applied;
      const newRemaining = inst.remainingAmount - applied;
      return { ...inst, newPaid, newRemaining, applied };
    });
  })();

  const submit = () => {
    if (invalid) return;
    const batch = postRepayment({
      line,
      amount,
      source: "manual",
      note: `Repayment towards ${line.orderRef}`,
    });
    toast({
      title: `${fmt(amount)} repayment posted`,
      description: `${batch.allocations.length} installment(s) updated · principal ${fmt(batch.totals.principal)} · interest ${fmt(batch.totals.interest)} · fees ${fmt(batch.totals.fee)} · outstanding ${fmt(batch.outstandingAfter)}`,
    });
    onPaid();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Repay {line.orderRef}</DialogTitle>
          <DialogDescription>
            Pay any amount — the schedule automatically re-applies principal, interest and fees earliest first.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="rounded-lg border p-3">
              <p className="text-[10px] text-muted-foreground uppercase">Outstanding</p>
              <p className="text-lg font-display font-bold">{fmt(outstanding)}</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-[10px] text-muted-foreground uppercase">Next EMI</p>
              <p className="text-lg font-display font-bold">{fmt(suggestedEmi)}</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-[10px] text-muted-foreground uppercase">Prior part-pays</p>
              <p className="text-lg font-display font-bold">{priorPayments.length}</p>
            </div>
          </div>

          <div>
            <Label className="text-xs">Amount to repay</Label>
            <Input
              type="number"
              value={amount}
              min={1}
              max={outstanding}
              onChange={(e) => setAmount(Math.max(0, Number(e.target.value) || 0))}
              className="mt-1"
            />
            <Slider
              value={[Math.min(amount, outstanding)]}
              max={Math.max(outstanding, 1)}
              step={500}
              onValueChange={(v) => setAmount(v[0])}
              className="mt-3"
            />
            <div className="mt-2 flex gap-1.5 flex-wrap">
              {[suggestedEmi, Math.round(outstanding / 2), outstanding].filter((n, i, a) => n > 0 && a.indexOf(n) === i).map((preset) => (
                <Button key={preset} type="button" size="sm" variant="outline" onClick={() => setAmount(preset)}>
                  {preset === outstanding ? "Full" : preset === suggestedEmi ? "Next EMI" : "Half"}: {fmt(preset)}
                </Button>
              ))}
            </div>
            {invalid && (
              <p className="text-xs text-destructive mt-2">
                {amount <= 0 ? "Enter an amount greater than zero." : `Cannot exceed outstanding of ${fmt(outstanding)}.`}
              </p>
            )}
          </div>

          {preview.length > 0 && (
            <div className="rounded-lg border max-h-48 overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="h-8 text-[11px]">#</TableHead>
                    <TableHead className="h-8 text-[11px]">Total</TableHead>
                    <TableHead className="h-8 text-[11px]">Applied now</TableHead>
                    <TableHead className="h-8 text-[11px]">Remaining after</TableHead>
                    <TableHead className="h-8 text-[11px]">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {preview.map((p) => {
                    const nowPaid = p.newRemaining < 0.5;
                    const st = nowPaid ? "paid" : p.newPaid > 0.5 ? "partial" : p.status;
                    return (
                      <TableRow key={p.installmentNo}>
                        <TableCell className="py-1.5 text-[11px] font-mono">#{p.installmentNo}</TableCell>
                        <TableCell className="py-1.5 text-[11px]">{fmt(p.total)}</TableCell>
                        <TableCell className="py-1.5 text-[11px] text-success">{p.applied > 0 ? `+${fmt(p.applied)}` : "—"}</TableCell>
                        <TableCell className="py-1.5 text-[11px]">{fmt(Math.max(0, Math.round(p.newRemaining)))}</TableCell>
                        <TableCell className="py-1.5">
                          <Badge variant="outline" className={`capitalize text-[10px] ${st === "partial" ? "bg-warning/10 text-warning border-warning/30" : st === "paid" ? "bg-success/10 text-success border-success/30" : ""}`}>
                            {st}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={invalid}>
            <Wallet className="h-4 w-4 mr-1.5" /> Pay {fmt(amount)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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

function AutopayCell({ inst, attempt, lineId }: { inst: { status: string; dueDate: string; installmentNo: number }; attempt?: AutoDebitAttempt; lineId: string }) {
  const cfg = getAutoPayConfig();
  const enrolled = isLineEnrolled(lineId) && cfg.enabled;

  if (attempt?.status === "success") {
    return (
      <Badge variant="outline" className="bg-success/10 text-success border-success/30 gap-1 text-[10px]">
        <CheckCircle2 className="h-3 w-3" /> Debited
      </Badge>
    );
  }
  if (attempt?.status === "processing") {
    return (
      <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 gap-1 text-[10px]">
        <Loader2 className="h-3 w-3 animate-spin" /> Processing
      </Badge>
    );
  }
  if (attempt?.status === "retry_scheduled") {
    return (
      <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30 gap-1 text-[10px]" title={attempt.failureReason}>
        <RefreshCw className="h-3 w-3" /> Retry queued
      </Badge>
    );
  }
  if (attempt?.status === "failed") {
    return (
      <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30 gap-1 text-[10px]" title={attempt.failureReason}>
        <XCircle className="h-3 w-3" /> Failed
      </Badge>
    );
  }
  if (inst.status === "paid") {
    return <span className="text-[10px] text-muted-foreground">—</span>;
  }
  if (!enrolled) {
    return <Badge variant="outline" className="text-[10px]">Manual</Badge>;
  }
  const debitDate = new Date(new Date(inst.dueDate).getTime() - cfg.debitOffsetDays * 86400000)
    .toISOString().slice(0, 10);
  return (
    <Badge variant="outline" className="gap-1 text-[10px]" title={`Auto-debit scheduled for ${debitDate}`}>
      <Clock className="h-3 w-3" /> Scheduled
    </Badge>
  );
}


const EVENT_ICON_MAP = {
  Sparkles, TrendingUp, TrendingDown, CheckCircle2, AlertTriangle,
  Trophy, CalendarDays, ShieldCheck, AlertOctagon, BadgeCheck, UserCog,
} as const;

const prettyEventType = (t: string) => t.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

function AuditTrailPanel({ entries, currentLimit }: { entries: CreditLimitAuditEntry[]; currentLimit: number }) {
  const [filter, setFilter] = useState<"all" | "positive" | "negative" | "neutral">("all");
  const [factorFilter, setFactorFilter] = useState<string>("all");
  const [eventFilter, setEventFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [exportOpen, setExportOpen] = useState(false);
  const summary = useMemo(() => summarizeAuditTrail(entries), [entries]);

  const factorOptions = useMemo(
    () => Array.from(new Set(entries.map((e) => e.factor).filter(Boolean) as string[])).sort(),
    [entries],
  );
  const eventOptions = useMemo(
    () => Array.from(new Set(entries.map((e) => e.eventType))).sort(),
    [entries],
  );

  const filtered = useMemo(() => entries.filter((e) => {
    const dirOk =
      filter === "all" ? true
      : filter === "positive" ? e.delta > 0
      : filter === "negative" ? e.delta < 0
      : e.delta === 0;
    const factorOk =
      factorFilter === "all" ? true
      : factorFilter === "__none" ? !e.factor
      : e.factor === factorFilter;
    const eventOk = eventFilter === "all" ? true : e.eventType === eventFilter;
    const q = search.trim().toLowerCase();
    const artifactText = (e.artifacts ?? []).map(a => `${a.id} ${a.label} ${a.kind}`).join(" ");
    const searchOk = !q || `${e.title} ${e.description} ${e.reference ?? ""} ${e.actor} ${artifactText}`.toLowerCase().includes(q);
    return dirOk && factorOk && eventOk && searchOk;
  }), [entries, filter, factorFilter, eventFilter, search]);

  const activeFilterLabel = [
    filter !== "all" ? filter : null,
    factorFilter !== "all" ? (factorFilter === "__none" ? "no factor" : factorFilter) : null,
    eventFilter !== "all" ? prettyEventType(eventFilter) : null,
    search.trim() ? `"${search.trim()}"` : null,
  ].filter(Boolean).join(" · ") || "all events";

  const hasFilters = filter !== "all" || factorFilter !== "all" || eventFilter !== "all" || search.trim() !== "";
  const resetFilters = () => { setFilter("all"); setFactorFilter("all"); setEventFilter("all"); setSearch(""); };

  const filteredNet = filtered.reduce((s, e) => s + e.delta, 0);



  return (
    <>
      {/* Summary cards */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">Current Limit</span>
              <CreditCard className="h-4 w-4 text-primary" />
            </div>
            <p className="text-2xl font-display font-bold text-foreground">{fmt(currentLimit)}</p>
            <p className="text-xs text-muted-foreground mt-1">{summary.events} events recorded</p>
          </CardContent>
        </Card>
        <Card className="bg-success/5 border-success/30">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">Lifetime Uplift</span>
              <ArrowUpRight className="h-4 w-4 text-success" />
            </div>
            <p className="text-2xl font-display font-bold text-success">+{fmt(summary.positive)}</p>
            <p className="text-xs text-muted-foreground mt-1">From {entries.filter((e) => e.delta > 0).length} positive events</p>
          </CardContent>
        </Card>
        <Card className="bg-destructive/5 border-destructive/30">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">Lifetime Reductions</span>
              <ArrowDownRight className="h-4 w-4 text-destructive" />
            </div>
            <p className="text-2xl font-display font-bold text-destructive">−{fmt(summary.negative)}</p>
            <p className="text-xs text-muted-foreground mt-1">From {entries.filter((e) => e.delta < 0).length} negative events</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">Net Movement</span>
              <TrendingUp className="h-4 w-4 text-primary" />
            </div>
            <p className="text-2xl font-display font-bold text-foreground">
              {summary.positive - summary.negative >= 0 ? "+" : "−"}{fmt(Math.abs(summary.positive - summary.negative))}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Since initial approval</p>
          </CardContent>
        </Card>
      </div>

      {/* Factor impact */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Impact by Factor</CardTitle>
          <CardDescription>How each underwriting factor moved your limit over time.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {Object.entries(summary.factorImpact).length === 0 && (
            <p className="text-sm text-muted-foreground">No factor-specific events yet.</p>
          )}
          {Object.entries(summary.factorImpact)
            .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
            .map(([factor, delta]) => {
              const positive = delta >= 0;
              const max = Math.max(...Object.values(summary.factorImpact).map(Math.abs), 1);
              const pct = (Math.abs(delta) / max) * 100;
              return (
                <div key={factor}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium text-foreground">{factor}</span>
                    <span className={positive ? "text-success font-semibold" : "text-destructive font-semibold"}>
                      {positive ? "+" : "−"}{fmt(Math.abs(delta))}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full ${positive ? "bg-success" : "bg-destructive"}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
        </CardContent>
      </Card>

      {/* Timeline */}
      <Card>
        <CardHeader className="space-y-3">
          <div className="flex flex-row items-start justify-between gap-3 flex-wrap">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <History className="h-4 w-4" /> Limit Change Timeline
              </CardTitle>
              <CardDescription>Every event that moved your approved credit limit, newest first.</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={() => setExportOpen(true)}>
                <Download className="h-3.5 w-3.5 mr-1.5" /> Export CSV
              </Button>
              <AuditExportDialog
                open={exportOpen}
                onOpenChange={setExportOpen}
                entries={entries}
                filteredEntries={filtered}
                activeFilter={activeFilterLabel}
              />
            </div>
          </div>

          {/* Filters */}
          <div className="rounded-lg border bg-muted/30 p-3 space-y-3">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-1.5">
                <Label className="text-[11px] text-muted-foreground">Impact direction</Label>
                <div className="flex rounded-md border overflow-hidden bg-background">
                  {(["all", "positive", "negative", "neutral"] as const).map((f) => (
                    <button
                      key={f}
                      onClick={() => setFilter(f)}
                      className={`flex-1 px-2 py-1.5 text-[11px] capitalize transition-colors ${
                        filter === f ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] text-muted-foreground">Factor type</Label>
                <Select value={factorFilter} onValueChange={setFactorFilter}>
                  <SelectTrigger className="h-9 bg-background"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All factors</SelectItem>
                    {factorOptions.map((f) => (
                      <SelectItem key={f} value={f}>{f}</SelectItem>
                    ))}
                    <SelectItem value="__none">No factor (discretionary)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] text-muted-foreground">Event type</Label>
                <Select value={eventFilter} onValueChange={setEventFilter}>
                  <SelectTrigger className="h-9 bg-background"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All event types</SelectItem>
                    {eventOptions.map((t) => (
                      <SelectItem key={t} value={t}>{prettyEventType(t)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] text-muted-foreground">Search</Label>
                <Input
                  className="h-9 bg-background"
                  placeholder="Title, note or reference ID"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2 flex-wrap text-xs">
                <Badge variant="secondary" className="text-[10px]">{filtered.length} of {entries.length} events</Badge>
                <span className={`text-[11px] font-semibold ${filteredNet > 0 ? "text-success" : filteredNet < 0 ? "text-destructive" : "text-muted-foreground"}`}>
                  Net in view: {filteredNet > 0 ? "+" : filteredNet < 0 ? "−" : ""}{fmt(Math.abs(filteredNet))}
                </span>
                {hasFilters && <span className="text-[11px] text-muted-foreground">· {activeFilterLabel}</span>}
              </div>
              {hasFilters && (
                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={resetFilters}>
                  <XCircle className="h-3.5 w-3.5 mr-1" /> Clear filters
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="relative">
            <div className="absolute left-[15px] top-2 bottom-2 w-px bg-border" />
            <div className="space-y-5">
              {filtered.map((e) => {
                const meta = auditEventMeta(e.eventType);
                const Icon = (EVENT_ICON_MAP as Record<string, typeof Sparkles>)[meta.icon] ?? Sparkles;
                const positive = e.delta > 0;
                const neutral = e.delta === 0;
                const tone = neutral ? "bg-muted text-muted-foreground" : positive ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive";
                return (
                  <div key={e.id} className="relative pl-10">
                    <div className={`absolute left-0 top-0 h-8 w-8 rounded-full flex items-center justify-center ring-4 ring-background ${tone}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="rounded-lg border p-4">
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-semibold text-foreground">{e.title}</span>
                            <Badge variant="outline" className="text-[10px] capitalize">{e.actor}</Badge>
                            {e.reference && (
                              <Badge variant="secondary" className="text-[10px] font-mono">{e.reference}</Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">{e.description}</p>
                          {e.factor && e.factorBefore !== undefined && e.factorAfter !== undefined && (
                            <div className="mt-2 flex items-center gap-2 text-xs">
                              <Badge variant="outline" className="text-[10px]">{e.factor}</Badge>
                              <span className="text-muted-foreground">
                                {e.factorBefore} → <span className="font-semibold text-foreground">{e.factorAfter}</span>/100
                              </span>
                            </div>
                          )}
                          <AuditArtifactLinks artifacts={e.artifacts} />
                        </div>
                        <div className="text-right">
                          <p className={`text-sm font-bold ${neutral ? "text-foreground" : positive ? "text-success" : "text-destructive"}`}>
                            {positive ? "+" : neutral ? "" : "−"}{fmt(Math.abs(e.delta))}
                          </p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            {fmt(e.limitBefore)} → {fmt(e.limitAfter)}
                          </p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">{e.date}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
}

const ACTION_META: Record<BuyerRiskAction, { label: string; icon: typeof Ban; tone: string; ring: string }> = {
  monitor:      { label: "Monitoring",        icon: Activity,   tone: "text-muted-foreground", ring: "border-border bg-muted/40" },
  reduce_limit: { label: "Limit Reduced",     icon: ArrowDownRight, tone: "text-yellow-700",   ring: "border-yellow-500/40 bg-yellow-500/10" },
  freeze_new:   { label: "New Drawdowns Frozen", icon: Snowflake, tone: "text-orange-700",     ring: "border-orange-500/40 bg-orange-500/10" },
  block:        { label: "Account Blocked",   icon: Ban,        tone: "text-destructive",      ring: "border-destructive/40 bg-destructive/10" },
};

const CATEGORY_ICON = {
  repayment: Clock,
  velocity: Gauge,
  identity: Fingerprint,
  device: Fingerprint,
  dispute: Scale,
  behavior: Activity,
  exposure: TrendingUp,
} as const;

function RiskBanner({ risk }: { risk: BuyerRiskAssessment }) {
  const meta = ACTION_META[risk.action];
  const Icon = meta.icon;
  return (
    <div className={`rounded-lg border p-4 flex items-start gap-3 ${meta.ring}`}>
      <Icon className={`h-5 w-5 mt-0.5 shrink-0 ${meta.tone}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-sm font-semibold ${meta.tone}`}>{meta.label}</span>
          <Badge variant="outline" className="text-[10px]">Risk score {risk.riskScore}/100</Badge>
          <Badge variant="outline" className="text-[10px]">{risk.signals.length} signal{risk.signals.length === 1 ? "" : "s"}</Badge>
        </div>
        <p className="text-xs text-muted-foreground mt-1">{risk.rationale}</p>
      </div>
    </div>
  );
}

function RiskPanel({ risk, approvedLimit }: { risk: BuyerRiskAssessment; approvedLimit: number }) {
  const meta = ACTION_META[risk.action];
  return (
    <>
      <div className="grid md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">Risk Score</span>
              <ShieldAlert className="h-4 w-4 text-primary" />
            </div>
            <p className="text-2xl font-display font-bold text-foreground">{risk.riskScore}<span className="text-sm text-muted-foreground">/100</span></p>
            <Progress value={risk.riskScore} className="h-1.5 mt-2" />
          </CardContent>
        </Card>
        <Card className={meta.ring}>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">Action</span>
              <meta.icon className={`h-4 w-4 ${meta.tone}`} />
            </div>
            <p className={`text-lg font-display font-bold ${meta.tone}`}>{meta.label}</p>
            <p className="text-[11px] text-muted-foreground mt-1 capitalize">Rule outcome: {risk.action.replace("_", " ")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">Limit Reduction</span>
              <ArrowDownRight className="h-4 w-4 text-destructive" />
            </div>
            <p className="text-2xl font-display font-bold text-destructive">−{fmt(risk.totalReductionInr)}</p>
            <p className="text-[11px] text-muted-foreground mt-1">Applied to approved limit of {fmt(approvedLimit)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">Effective Limit</span>
              <ShieldCheck className="h-4 w-4 text-success" />
            </div>
            <p className="text-2xl font-display font-bold text-foreground">{fmt(risk.effectiveLimit)}</p>
            <p className="text-[11px] text-muted-foreground mt-1">After all risk rules applied</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <ShieldAlert className="h-4 w-4" /> Triggered Risk Rules
          </CardTitle>
          <CardDescription>
            Each rule that fires reduces the available limit, freezes new drawdowns, or blocks the account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {risk.signals.length === 0 ? (
            <div className="rounded-lg border border-success/30 bg-success/5 p-6 text-center">
              <ShieldCheck className="h-8 w-8 text-success mx-auto mb-2" />
              <p className="text-sm font-semibold text-foreground">No risk signals detected</p>
              <p className="text-xs text-muted-foreground mt-1">Account is operating within all fraud and default-risk thresholds.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {risk.signals.map((s) => {
                const Icon = CATEGORY_ICON[s.category] ?? AlertTriangle;
                return (
                  <div key={s.id} className={`rounded-lg border p-4 ${buyerRiskTone(s.severity)}`}>
                    <div className="flex items-start gap-3">
                      <div className="h-9 w-9 rounded-lg bg-background/60 flex items-center justify-center shrink-0">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-foreground">{s.label}</span>
                          <Badge variant="outline" className="text-[10px] uppercase">{s.severity}</Badge>
                          <Badge variant="secondary" className="text-[10px] font-mono">{s.ruleId}</Badge>
                          <Badge variant="outline" className="text-[10px] capitalize">{s.category}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{s.detail}</p>
                        <div className="mt-2 flex items-center gap-3 text-[11px] flex-wrap">
                          <span className="capitalize">
                            Action: <span className="font-semibold text-foreground">{s.action.replace("_", " ")}</span>
                          </span>
                          {s.reductionInr > 0 && (
                            <span>
                              Limit impact: <span className="font-semibold text-destructive">−{fmt(s.reductionInr)}</span>
                              <span className="text-muted-foreground"> ({s.reductionPct}%)</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Rule Reference</CardTitle>
          <CardDescription>Buyer-side fraud & default-risk rules evaluated on every credit check.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-2 text-xs">
            {[
              ["BR-001", "30+ days past due", "Block account"],
              ["BR-002", "7+ days past due", "Freeze new drawdowns, −50%"],
              ["BR-003/004", "Repeated late payments (90d)", "Reduce limit 15-30%"],
              ["BR-005", "Recent default written off", "Freeze, −70%"],
              ["BR-010/011", "Drawdown velocity spike", "Freeze / reduce 10-25%"],
              ["BR-012", "Burst of new suppliers (7d)", "Reduce limit 10%"],
              ["BR-020", "GSTIN re-verification failed", "Block account"],
              ["BR-021", "Frequent device changes", "Reduce limit 20%"],
              ["BR-022", "Foreign IP login", "Reduce limit 10%"],
              ["BR-030/031", "Chargebacks / open disputes", "Freeze / reduce"],
              ["BR-040", "Refund-then-redraw loop", "Freeze, −25%"],
              ["BR-041", "Credit-check probing", "Monitor only"],
              ["BR-050", "Exposure to flagged suppliers", "Reduce 15%"],
              ["BR-051", "Limit nearly fully utilized", "Monitor only"],
            ].map(([id, rule, action]) => (
              <div key={id} className="flex items-center justify-between gap-3 p-2.5 rounded-md border">
                <div className="flex items-center gap-2 min-w-0">
                  <Badge variant="secondary" className="text-[10px] font-mono shrink-0">{id}</Badge>
                  <span className="text-foreground truncate">{rule}</span>
                </div>
                <span className="text-muted-foreground shrink-0 text-[11px]">{action}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </>
  );
}
