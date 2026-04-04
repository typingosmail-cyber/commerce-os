import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/lib/auth-context";
import {
  MOCK_CREATOR_STATS, MOCK_AFFILIATE_LINKS, MOCK_CREATOR_CONTENT,
  MOCK_LEADERBOARD, TIER_COLORS, COMMISSION_CHART_DATA, LEAD_FUNNEL_DATA,
} from "@/lib/creator-data";
import {
  Link, TrendingUp, IndianRupee, Users, Target, Trophy, Copy, ExternalLink,
  FileText, Eye, Zap, Crown, Star, BarChart3, Award, ArrowUpRight,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, FunnelChart, Tooltip, Cell } from "recharts";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { AuthModal } from "@/components/AuthModal";

const FUNNEL_COLORS = ["hsl(220, 65%, 18%)", "hsl(220, 65%, 30%)", "hsl(45, 90%, 55%)", "hsl(152, 60%, 40%)", "hsl(152, 60%, 50%)"];

export default function CreatorDashboard() {
  const { user, isLoggedIn } = useAuth();
  const { toast } = useToast();
  const [showAuth, setShowAuth] = useState(false);
  const stats = MOCK_CREATOR_STATS;
  const tierInfo = TIER_COLORS[stats.tier];

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <main className="flex-1 container py-16 text-center max-w-2xl">
          <div className="h-16 w-16 rounded-2xl bg-secondary/10 flex items-center justify-center mx-auto mb-6">
            <Crown className="h-8 w-8 text-secondary" />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-3">Become a Business Creator</h1>
          <p className="text-muted-foreground mb-6">Earn commissions by recommending verified suppliers. Create content, generate affiliate links, and build your B2B influence network.</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            {[
              { icon: Link, title: "Affiliate Links", desc: "Generate trackable links for any product" },
              { icon: IndianRupee, title: "3-5% Commission", desc: "Earn on every successful transaction" },
              { icon: Trophy, title: "Creator Rankings", desc: "Compete and climb the leaderboard" },
            ].map(f => (
              <Card key={f.title}><CardContent className="p-5 text-center">
                <f.icon className="h-6 w-6 text-primary mx-auto mb-2" />
                <h3 className="font-semibold text-foreground text-sm">{f.title}</h3>
                <p className="text-xs text-muted-foreground mt-1">{f.desc}</p>
              </CardContent></Card>
            ))}
          </div>
          <Button size="lg" onClick={() => setShowAuth(true)}><Crown className="h-4 w-4 mr-2" /> Sign Up as Creator</Button>
          <AuthModal open={showAuth} onClose={() => setShowAuth(false)} />
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="flex-1 container py-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Creator Dashboard</h1>
            <p className="text-sm text-muted-foreground">Manage your affiliate network & content</p>
          </div>
          <div className="flex items-center gap-3">
            <Badge className={`${tierInfo.bg} ${tierInfo.text} px-3 py-1`}>
              <Trophy className="h-3 w-3 mr-1" /> {tierInfo.label} Creator • Rank #{stats.rank}
            </Badge>
            <Badge variant="outline">Trust: {stats.creatorTrustScore}/1000</Badge>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-6">
          {[
            { label: "Total Leads", value: stats.totalLeads, icon: Users },
            { label: "Conversions", value: stats.convertedLeads, icon: Target },
            { label: "Total Earned", value: `₹${(stats.totalCommission / 1000).toFixed(0)}K`, icon: IndianRupee },
            { label: "Pending", value: `₹${(stats.pendingCommission / 1000).toFixed(0)}K`, icon: Zap },
            { label: "Affiliate Clicks", value: stats.affiliateClicks.toLocaleString(), icon: Link },
            { label: "Conv. Rate", value: `${stats.conversionRate}%`, icon: TrendingUp },
          ].map(s => (
            <Card key={s.label}>
              <CardContent className="p-3">
                <div className="flex items-center gap-2 mb-1">
                  <s.icon className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{s.label}</span>
                </div>
                <p className="text-lg font-bold text-foreground">{s.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs defaultValue="links" className="space-y-4">
          <TabsList>
            <TabsTrigger value="links"><Link className="h-3 w-3 mr-1" /> Affiliate Links</TabsTrigger>
            <TabsTrigger value="content"><FileText className="h-3 w-3 mr-1" /> Content</TabsTrigger>
            <TabsTrigger value="analytics"><BarChart3 className="h-3 w-3 mr-1" /> Analytics</TabsTrigger>
            <TabsTrigger value="leaderboard"><Trophy className="h-3 w-3 mr-1" /> Leaderboard</TabsTrigger>
          </TabsList>

          {/* Affiliate Links */}
          <TabsContent value="links">
            <div className="grid gap-3">
              {MOCK_AFFILIATE_LINKS.map(link => (
                <Card key={link.id}>
                  <CardContent className="p-4 flex flex-col md:flex-row md:items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-foreground text-sm">{link.productName}</h3>
                      <p className="text-xs text-muted-foreground">{link.supplierName}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <code className="text-xs bg-muted px-2 py-0.5 rounded font-mono">{link.shortUrl}</code>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { navigator.clipboard.writeText(`https://${link.shortUrl}`); toast({ title: "Link copied!" }); }}>
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex items-center gap-6 text-center">
                      <div>
                        <p className="text-lg font-bold text-foreground">{link.clicks}</p>
                        <p className="text-[10px] text-muted-foreground">Clicks</p>
                      </div>
                      <div>
                        <p className="text-lg font-bold text-foreground">{link.conversions}</p>
                        <p className="text-[10px] text-muted-foreground">Conversions</p>
                      </div>
                      <div>
                        <p className="text-lg font-bold text-success">₹{link.commission.toLocaleString()}</p>
                        <p className="text-[10px] text-muted-foreground">{link.commissionRate}% rate</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              <Button variant="outline" className="w-full"><Link className="h-4 w-4 mr-2" /> Generate New Affiliate Link</Button>
            </div>
          </TabsContent>

          {/* Content */}
          <TabsContent value="content">
            <div className="grid gap-3">
              {MOCK_CREATOR_CONTENT.map(content => (
                <Card key={content.id}>
                  <CardContent className="p-4 flex flex-col md:flex-row md:items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-[10px]">{content.type}</Badge>
                        <Badge className={
                          content.status === "featured" ? "bg-secondary text-secondary-foreground text-[10px]" :
                          content.status === "published" ? "bg-success/10 text-success text-[10px]" :
                          "bg-muted text-muted-foreground text-[10px]"
                        }>{content.status}</Badge>
                      </div>
                      <h3 className="font-semibold text-foreground text-sm">{content.title}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">{content.createdAt}</p>
                    </div>
                    <div className="flex items-center gap-6 text-center">
                      <div>
                        <p className="text-sm font-bold text-foreground">{content.views.toLocaleString()}</p>
                        <p className="text-[10px] text-muted-foreground flex items-center gap-0.5"><Eye className="h-3 w-3" /> Views</p>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-foreground">{content.leads}</p>
                        <p className="text-[10px] text-muted-foreground">Leads</p>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-success">₹{content.earnings.toLocaleString()}</p>
                        <p className="text-[10px] text-muted-foreground">Earned</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              <Button variant="outline" className="w-full"><FileText className="h-4 w-4 mr-2" /> Create New Content</Button>
            </div>
          </TabsContent>

          {/* Analytics */}
          <TabsContent value="analytics">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader><CardTitle className="text-sm">Commission Earnings (6 months)</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={COMMISSION_CHART_DATA}>
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `₹${(v/1000).toFixed(0)}K`} />
                      <Tooltip formatter={(v: number) => `₹${v.toLocaleString()}`} />
                      <Bar dataKey="earnings" fill="hsl(var(--secondary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-sm">Lead Conversion Funnel</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {LEAD_FUNNEL_DATA.map((stage, idx) => {
                      const maxCount = LEAD_FUNNEL_DATA[0].count;
                      const pct = (stage.count / maxCount) * 100;
                      return (
                        <div key={stage.stage}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-medium text-foreground">{stage.stage}</span>
                            <span className="text-xs text-muted-foreground">{stage.count.toLocaleString()}</span>
                          </div>
                          <div className="h-6 rounded bg-muted overflow-hidden">
                            <div
                              className="h-full rounded transition-all duration-1000"
                              style={{ width: `${pct}%`, backgroundColor: FUNNEL_COLORS[idx] }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Game Theory Payoff Card */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Award className="h-4 w-4 text-secondary" /> Game Theory: Why Honest Promotion Wins
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <h4 className="font-semibold text-foreground text-sm">Honest Promotion Strategy</h4>
                      <div className="space-y-2">
                        {[
                          { label: "Commission per deal", value: "₹5,000", positive: true },
                          { label: "Reputation bonus", value: "+₹2,100", positive: true },
                          { label: "Future deal value (10 deals)", value: "+₹7,500", positive: true },
                          { label: "Total expected payoff", value: "₹14,600", positive: true },
                        ].map(r => (
                          <div key={r.label} className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">{r.label}</span>
                            <span className={`font-semibold ${r.positive ? "text-success" : "text-destructive"}`}>{r.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-3">
                      <h4 className="font-semibold text-foreground text-sm">Dishonest Promotion Strategy</h4>
                      <div className="space-y-2">
                        {[
                          { label: "Short-term gain", value: "₹12,500", positive: true },
                          { label: "Detection penalty (85%)", value: "-₹18,750", positive: false },
                          { label: "Reputation loss", value: "-₹4,200", positive: false },
                          { label: "Total expected payoff", value: "-₹10,450", positive: false },
                        ].map(r => (
                          <div key={r.label} className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">{r.label}</span>
                            <span className={`font-semibold ${r.positive ? "text-success" : "text-destructive"}`}>{r.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 p-3 rounded-lg bg-success/10 text-center">
                    <p className="text-sm font-medium text-success">
                      Nash Equilibrium: Honest promotion is the dominant strategy with +₹25,050 advantage
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Leaderboard */}
          <TabsContent value="leaderboard">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Trophy className="h-4 w-4 text-secondary" /> Creator Tournament Rankings
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {MOCK_LEADERBOARD.map((entry) => {
                    const tier = TIER_COLORS[entry.tier];
                    const isYou = entry.rank === stats.rank;
                    return (
                      <div
                        key={entry.rank}
                        className={`flex items-center gap-4 p-3 rounded-lg transition-colors ${
                          isYou ? "bg-secondary/10 border border-secondary/30" : "hover:bg-muted/50"
                        }`}
                      >
                        <div className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold ${
                          entry.rank <= 3 ? "bg-secondary text-secondary-foreground" : "bg-muted text-muted-foreground"
                        }`}>
                          {entry.rank}
                        </div>
                        <div className="h-9 w-9 rounded-full bg-primary flex items-center justify-center shrink-0">
                          <span className="text-primary-foreground text-xs font-bold">{entry.avatar}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-foreground text-sm">{entry.name}</span>
                            {isYou && <Badge variant="outline" className="text-[9px]">You</Badge>}
                            <Badge className={`${tier.bg} ${tier.text} text-[9px]`}>{tier.label}</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">Trust: {entry.trustScore}/1000</p>
                        </div>
                        <div className="flex items-center gap-6 text-right">
                          <div>
                            <p className="text-sm font-semibold text-foreground">{entry.leads}</p>
                            <p className="text-[10px] text-muted-foreground">Leads</p>
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-foreground">{entry.conversions}</p>
                            <p className="text-[10px] text-muted-foreground">Conv.</p>
                          </div>
                          <div className="hidden sm:block">
                            <p className="text-sm font-semibold text-success">₹{(entry.earnings / 1000).toFixed(0)}K</p>
                            <p className="text-[10px] text-muted-foreground">Earned</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
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
