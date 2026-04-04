import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/lib/auth-context";
import { MOCK_ESCROW, calculateRiskScore, calculateGamePayoff, type EscrowTransaction } from "@/lib/escrow";
import {
  Shield, Lock, AlertTriangle, CheckCircle2, Clock, IndianRupee,
  FileWarning, Scale, TrendingDown, TrendingUp, Target, Zap, Eye,
} from "lucide-react";
import { useState } from "react";
import { AuthModal } from "@/components/AuthModal";

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  created: { label: "Created", color: "bg-muted text-muted-foreground", icon: Clock },
  funded: { label: "Funded", color: "bg-primary/10 text-primary", icon: IndianRupee },
  milestone_1: { label: "Milestone 1", color: "bg-secondary/10 text-secondary-foreground", icon: Target },
  milestone_2: { label: "Milestone 2", color: "bg-secondary/10 text-secondary-foreground", icon: Target },
  released: { label: "Released", color: "bg-success/10 text-success", icon: CheckCircle2 },
  disputed: { label: "Disputed", color: "bg-destructive/10 text-destructive", icon: AlertTriangle },
  refunded: { label: "Refunded", color: "bg-warning/10 text-warning", icon: FileWarning },
};

function RiskGauge({ score, level }: { score: number; level: string }) {
  const color = level === "low" ? "text-success" : level === "medium" ? "text-warning" : "text-destructive";
  return (
    <div className="flex items-center gap-3">
      <div className="relative h-16 w-16">
        <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90">
          <circle cx="18" cy="18" r="15" fill="none" stroke="hsl(var(--muted))" strokeWidth="3" />
          <circle cx="18" cy="18" r="15" fill="none" stroke={level === "low" ? "hsl(var(--success))" : level === "medium" ? "hsl(var(--warning))" : "hsl(var(--destructive))"} strokeWidth="3" strokeDasharray={`${score * 0.94} 100`} strokeLinecap="round" />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`text-sm font-bold ${color}`}>{score}</span>
        </div>
      </div>
      <div>
        <p className={`text-sm font-semibold capitalize ${color}`}>{level} Risk</p>
        <p className="text-[10px] text-muted-foreground">Risk Score (0-100)</p>
      </div>
    </div>
  );
}

function EscrowCard({ tx }: { tx: EscrowTransaction }) {
  const statusConfig = STATUS_CONFIG[tx.status];
  const completedMilestones = tx.milestones.filter(m => m.status === "completed").length;
  const progress = (completedMilestones / tx.milestones.length) * 100;

  return (
    <Card className={tx.status === "disputed" ? "border-destructive/30" : ""}>
      <CardContent className="p-5">
        <div className="flex flex-col md:flex-row md:items-start gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Badge className={`${statusConfig.color} text-xs`}>
                <statusConfig.icon className="h-3 w-3 mr-1" /> {statusConfig.label}
              </Badge>
              <span className="text-xs text-muted-foreground">#{tx.id}</span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              <div>
                <p className="text-[10px] text-muted-foreground uppercase">Amount</p>
                <p className="text-sm font-bold text-foreground">₹{tx.amount.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase">Platform Fee</p>
                <p className="text-sm font-semibold text-foreground">₹{tx.platformFee.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase">Created</p>
                <p className="text-sm text-foreground">{new Date(tx.createdAt).toLocaleDateString()}</p>
              </div>
              <div>
                <RiskGauge score={tx.riskScore} level={tx.riskLevel} />
              </div>
            </div>

            {/* Milestones */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-foreground">Milestone Progress</span>
                <span className="text-xs text-muted-foreground">{completedMilestones}/{tx.milestones.length}</span>
              </div>
              <Progress value={progress} className="h-2" />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-2">
                {tx.milestones.map(m => (
                  <div key={m.id} className={`p-2 rounded-lg text-xs ${
                    m.status === "completed" ? "bg-success/10" :
                    m.status === "disputed" ? "bg-destructive/10" : "bg-muted/50"
                  }`}>
                    <div className="flex items-center gap-1 mb-0.5">
                      {m.status === "completed" ? <CheckCircle2 className="h-3 w-3 text-success" /> :
                       m.status === "disputed" ? <AlertTriangle className="h-3 w-3 text-destructive" /> :
                       <Clock className="h-3 w-3 text-muted-foreground" />}
                      <span className="font-medium">{m.label}</span>
                    </div>
                    <p className="text-muted-foreground">₹{m.amount.toLocaleString()} • Due: {m.dueDate}</p>
                  </div>
                ))}
              </div>
            </div>

            {tx.disputeReason && (
              <div className="mt-3 p-3 rounded-lg bg-destructive/10">
                <p className="text-xs font-medium text-destructive flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" /> Dispute: {tx.disputeReason}
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-2 mt-4">
          {tx.status === "disputed" && (
            <>
              <Button size="sm" variant="outline" className="text-xs"><Scale className="h-3 w-3 mr-1" /> View Dispute</Button>
              <Button size="sm" className="text-xs"><CheckCircle2 className="h-3 w-3 mr-1" /> Resolve</Button>
            </>
          )}
          {tx.status.startsWith("milestone") && (
            <Button size="sm" className="text-xs"><CheckCircle2 className="h-3 w-3 mr-1" /> Approve Next Milestone</Button>
          )}
          <Button size="sm" variant="ghost" className="text-xs"><Eye className="h-3 w-3 mr-1" /> Full Details</Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function EscrowCenter() {
  const { isLoggedIn } = useAuth();
  const [showAuth, setShowAuth] = useState(false);

  // Demo risk assessment
  const riskAssessment = calculateRiskScore({
    sellerTrustScore: 720,
    buyerTrustScore: 650,
    dealAmount: 500000,
    categoryRisk: 35,
    isFirstDeal: false,
    sellerHistory: 92,
  });

  const gamePayoff = calculateGamePayoff({
    dealValue: 500000,
    trustScore: 720,
    detectionProbability: 0.85,
    penaltyMultiplier: 2.0,
    futureDeals: 8,
  });

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <section className="bg-gradient-to-br from-primary via-primary to-primary/90 text-primary-foreground py-12">
        <div className="container text-center max-w-3xl">
          <div className="h-14 w-14 rounded-2xl bg-primary-foreground/10 flex items-center justify-center mx-auto mb-4">
            <Shield className="h-7 w-7" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold">Transaction Protection Center</h1>
          <p className="text-primary-foreground/80 mt-3">
            Escrow-backed payments • AI risk scoring • Milestone releases • Dispute resolution
          </p>
        </div>
      </section>

      <main className="flex-1 container py-8">
        <Tabs defaultValue="transactions">
          <TabsList>
            <TabsTrigger value="transactions"><Lock className="h-3 w-3 mr-1" /> Escrow Transactions</TabsTrigger>
            <TabsTrigger value="risk"><Shield className="h-3 w-3 mr-1" /> Risk Engine</TabsTrigger>
            <TabsTrigger value="gametheory"><Scale className="h-3 w-3 mr-1" /> Game Theory</TabsTrigger>
          </TabsList>

          <TabsContent value="transactions" className="space-y-4 mt-4">
            {/* Summary stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: "Active Escrows", value: "2", icon: Lock },
                { label: "Total Protected", value: "₹13.5L", icon: Shield },
                { label: "Disputes", value: "1", icon: AlertTriangle },
                { label: "Success Rate", value: "94.2%", icon: CheckCircle2 },
              ].map(s => (
                <Card key={s.label}><CardContent className="p-3 flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <s.icon className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-lg font-bold text-foreground">{s.value}</p>
                    <p className="text-[10px] text-muted-foreground">{s.label}</p>
                  </div>
                </CardContent></Card>
              ))}
            </div>

            {MOCK_ESCROW.map(tx => <EscrowCard key={tx.id} tx={tx} />)}
          </TabsContent>

          <TabsContent value="risk" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Shield className="h-4 w-4 text-secondary" /> Bayesian Risk Assessment Engine
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground mb-4">
                  Real-time risk scoring using 6 weighted factors with Bayesian probability updates
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <div className="flex items-center gap-3 mb-4">
                      <RiskGauge score={riskAssessment.overallScore} level={riskAssessment.level} />
                    </div>
                    <div className="p-3 rounded-lg bg-muted/50 mb-4">
                      <p className="text-xs font-medium text-foreground">Recommendation:</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{riskAssessment.recommendation}</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {riskAssessment.factors.map(f => (
                      <div key={f.name}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-foreground">{f.name}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-muted-foreground">w: {(f.weight * 100).toFixed(0)}%</span>
                            <span className="text-xs font-semibold text-foreground">{f.score}</span>
                          </div>
                        </div>
                        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                          <div
                            className={`h-full rounded-full ${f.score > 60 ? "bg-destructive" : f.score > 35 ? "bg-warning" : "bg-success"}`}
                            style={{ width: `${f.score}%` }}
                          />
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{f.detail}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="gametheory" className="mt-4">
            <div className="grid gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Scale className="h-4 w-4 text-secondary" /> Strategic Trust Engine — Game Theory Payoffs
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground mb-6">
                    Our system designs incentives so that honest behavior is always the dominant strategy — making dishonesty economically irrational.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Honest */}
                    <Card className="border-success/30 bg-success/5">
                      <CardContent className="p-5">
                        <div className="flex items-center gap-2 mb-3">
                          <TrendingUp className="h-5 w-5 text-success" />
                          <h3 className="font-semibold text-foreground">Cooperate (Honest)</h3>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Trade profit (12%)</span>
                            <span className="text-success font-semibold">+₹{(500000 * 0.12).toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Reputation value</span>
                            <span className="text-success font-semibold">+₹{Math.round((720/1000) * 500000 * 0.3).toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Future deals (8 × 15%)</span>
                            <span className="text-success font-semibold">+₹{(8 * 500000 * 0.15).toLocaleString()}</span>
                          </div>
                          <div className="border-t pt-2 flex justify-between text-sm font-bold">
                            <span className="text-foreground">Total Payoff</span>
                            <span className="text-success text-lg">₹{gamePayoff.honestPayoff.toLocaleString()}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Defect */}
                    <Card className="border-destructive/30 bg-destructive/5">
                      <CardContent className="p-5">
                        <div className="flex items-center gap-2 mb-3">
                          <TrendingDown className="h-5 w-5 text-destructive" />
                          <h3 className="font-semibold text-foreground">Defect (Cheat)</h3>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Short-term gain (25%)</span>
                            <span className="text-success font-semibold">+₹{(500000 * 0.25).toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Penalty (85% detection × 2x)</span>
                            <span className="text-destructive font-semibold">-₹{(500000 * 2 * 0.85).toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Reputation loss</span>
                            <span className="text-destructive font-semibold">-₹{Math.round((720/1000) * 500000 * 0.3 * 2).toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Future deals lost</span>
                            <span className="text-destructive font-semibold">-₹{(8 * 500000 * 0.15).toLocaleString()}</span>
                          </div>
                          <div className="border-t pt-2 flex justify-between text-sm font-bold">
                            <span className="text-foreground">Total Payoff</span>
                            <span className="text-destructive text-lg">₹{gamePayoff.cheatPayoff.toLocaleString()}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card className="bg-secondary/10 border-secondary/30">
                      <CardContent className="p-4">
                        <p className="text-xs font-semibold text-foreground mb-1">Nash Equilibrium</p>
                        <p className="text-sm text-foreground">{gamePayoff.nashEquilibrium}</p>
                      </CardContent>
                    </Card>
                    <Card className="bg-primary/10 border-primary/30">
                      <CardContent className="p-4">
                        <p className="text-xs font-semibold text-foreground mb-1">Dominant Strategy</p>
                        <p className="text-sm text-foreground">{gamePayoff.dominantStrategy}</p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Anti-collusion */}
                  <Card className="mt-6">
                    <CardHeader><CardTitle className="text-sm">Anti-Collusion Mechanisms</CardTitle></CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                        {[
                          { icon: Zap, title: "Random Assignment", desc: "Verification agents randomly assigned to prevent relationship-based fraud" },
                          { icon: Eye, title: "Hidden Audits", desc: "10% of transactions undergo surprise quality audits" },
                          { icon: Target, title: "Graph Analysis", desc: "AI detects suspicious transaction patterns between entities" },
                          { icon: Clock, title: "Delayed Rewards", desc: "Commission released after 30-day satisfaction window" },
                        ].map(m => (
                          <div key={m.title} className="p-3 rounded-lg bg-muted/50">
                            <m.icon className="h-4 w-4 text-primary mb-2" />
                            <h4 className="text-xs font-semibold text-foreground">{m.title}</h4>
                            <p className="text-[10px] text-muted-foreground mt-0.5">{m.desc}</p>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>

      <Footer />
      <AuthModal open={showAuth} onClose={() => setShowAuth(false)} />
    </div>
  );
}
