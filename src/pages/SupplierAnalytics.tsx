import { useState, useMemo } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  TrendingUp, TrendingDown, Minus, BarChart3, Target, Users, Star,
  ArrowUpRight, ArrowDownRight, ShieldCheck, Award, Zap, Package,
  CircleDollarSign, RefreshCw, Download, Eye
} from "lucide-react";
import {
  AreaChart, Area, LineChart, Line, BarChart, Bar, RadarChart, Radar,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, Cell, PieChart, Pie
} from "recharts";
import {
  generateRevenueData, generateTrustTrends, BENCHMARK_DATA,
  CUSTOMER_SEGMENTS, PRODUCT_PERFORMANCE, SUPPLIER_KPIS,
  getPercentile
} from "@/lib/supplier-analytics";

const CHART_COLORS = {
  primary: "hsl(220, 65%, 18%)",
  secondary: "hsl(45, 90%, 55%)",
  success: "hsl(152, 60%, 40%)",
  warning: "hsl(38, 92%, 50%)",
  destructive: "hsl(0, 72%, 51%)",
  muted: "hsl(220, 15%, 88%)",
};

const PIE_COLORS = [CHART_COLORS.primary, CHART_COLORS.secondary, CHART_COLORS.success, CHART_COLORS.warning];

function KPICard({ kpi }: { kpi: typeof SUPPLIER_KPIS[0] }) {
  const TrendIcon = kpi.trend === "up" ? TrendingUp : kpi.trend === "down" ? TrendingDown : Minus;
  const isPositive = (kpi.trend === "up" && kpi.change > 0) || (kpi.trend === "up" && kpi.change < 0);
  const trendColor = kpi.change > 0
    ? (kpi.label === "Response Rate" || kpi.label === "Avg. Lead Time" ? "text-success" : "text-success")
    : "text-destructive";

  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground mb-1">{kpi.label}</p>
        <div className="flex items-end justify-between">
          <p className="text-2xl font-display font-bold text-foreground">{kpi.value}</p>
          <div className={`flex items-center gap-0.5 text-xs font-medium ${trendColor}`}>
            <TrendIcon className="h-3 w-3" />
            {Math.abs(kpi.change)}{typeof kpi.change === "number" && kpi.label.includes("Score") ? "" : "%"}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function BenchmarkBar({ metric }: { metric: typeof BENCHMARK_DATA[0] }) {
  const percentile = getPercentile(metric.you, metric.industryAvg, metric.topPerformer, metric.higherIsBetter);
  const barColor = percentile >= 75 ? "bg-success" : percentile >= 50 ? "bg-secondary" : "bg-warning";
  const badge = percentile >= 90 ? "Top 10%" : percentile >= 75 ? "Top 25%" : percentile >= 50 ? "Above Avg" : "Below Avg";
  const badgeColor = percentile >= 75 ? "bg-success/10 text-success border-success/20" : percentile >= 50 ? "bg-secondary/10 text-secondary-foreground border-secondary/20" : "bg-warning/10 text-warning-foreground border-warning/20";

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-foreground">{metric.metric}</span>
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-foreground">{metric.you}{metric.unit}</span>
          <Badge className={`${badgeColor} text-[9px]`}>{badge}</Badge>
        </div>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full ${barColor} transition-all`} style={{ width: `${percentile}%` }} />
      </div>
      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>Industry Avg: {metric.industryAvg}{metric.unit}</span>
        <span>Top: {metric.topPerformer}{metric.unit}</span>
      </div>
    </div>
  );
}

export default function SupplierAnalytics() {
  const revenueData = useMemo(() => generateRevenueData(), []);
  const trustData = useMemo(() => generateTrustTrends(), []);

  const radarData = BENCHMARK_DATA.slice(0, 6).map((b) => ({
    metric: b.metric.length > 12 ? b.metric.slice(0, 12) + "…" : b.metric,
    you: getPercentile(b.you, b.industryAvg, b.topPerformer, b.higherIsBetter),
    industry: 50,
  }));

  const totalRevenue = revenueData.reduce((a, d) => a + d.revenue, 0);
  const projectedTotal = totalRevenue + revenueData.filter(d => d.projected > 0).reduce((a, d) => a + d.projected, 0);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="container py-6 space-y-6 flex-1">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">Supplier Analytics</h1>
            <p className="text-sm text-muted-foreground">Revenue projections, trust trends & performance benchmarking</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="gap-1.5">
              <Download className="h-3.5 w-3.5" /> Export
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5">
              <RefreshCw className="h-3.5 w-3.5" /> Refresh
            </Button>
          </div>
        </div>

        {/* KPI Row */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {SUPPLIER_KPIS.map((kpi) => (
            <KPICard key={kpi.label} kpi={kpi} />
          ))}
        </div>

        {/* Main Tabs */}
        <Tabs defaultValue="revenue">
          <TabsList className="w-full justify-start">
            <TabsTrigger value="revenue" className="gap-1 text-xs"><CircleDollarSign className="h-3.5 w-3.5" /> Revenue</TabsTrigger>
            <TabsTrigger value="trust" className="gap-1 text-xs"><ShieldCheck className="h-3.5 w-3.5" /> Trust Score</TabsTrigger>
            <TabsTrigger value="benchmark" className="gap-1 text-xs"><Target className="h-3.5 w-3.5" /> Benchmarking</TabsTrigger>
            <TabsTrigger value="products" className="gap-1 text-xs"><Package className="h-3.5 w-3.5" /> Products</TabsTrigger>
          </TabsList>

          {/* Revenue Tab */}
          <TabsContent value="revenue" className="mt-6 space-y-6">
            <div className="grid lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-2">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Revenue & Projections</CardTitle>
                  <CardDescription>Actual vs projected revenue with target line</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={320}>
                    <AreaChart data={revenueData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 15%, 88%)" />
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="hsl(220, 10%, 46%)" />
                      <YAxis tick={{ fontSize: 11 }} stroke="hsl(220, 10%, 46%)" tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}K`} />
                      <Tooltip formatter={(v: number) => `₹${v.toLocaleString()}`} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Area type="monotone" dataKey="revenue" name="Revenue" stroke={CHART_COLORS.primary} fill={CHART_COLORS.primary} fillOpacity={0.15} strokeWidth={2} />
                      <Area type="monotone" dataKey="projected" name="Projected" stroke={CHART_COLORS.success} fill={CHART_COLORS.success} fillOpacity={0.08} strokeWidth={2} strokeDasharray="6 3" />
                      <Line type="monotone" dataKey="target" name="Target" stroke={CHART_COLORS.warning} strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <div className="space-y-4">
                <Card>
                  <CardContent className="p-5">
                    <p className="text-xs text-muted-foreground">Total Revenue (YTD)</p>
                    <p className="text-3xl font-display font-bold text-foreground mt-1">₹{(totalRevenue / 100000).toFixed(1)}L</p>
                    <div className="flex items-center gap-1 mt-1 text-xs text-success font-medium">
                      <ArrowUpRight className="h-3 w-3" /> 23% vs last year
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-5">
                    <p className="text-xs text-muted-foreground">Projected Annual</p>
                    <p className="text-3xl font-display font-bold text-foreground mt-1">₹{(projectedTotal / 100000).toFixed(1)}L</p>
                    <div className="flex items-center gap-1 mt-1 text-xs text-primary font-medium">
                      <Target className="h-3 w-3" /> On track to exceed target
                    </div>
                  </CardContent>
                </Card>

                {/* Customer Segments */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-1.5"><Users className="h-4 w-4 text-primary" /> Buyer Segments</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {CUSTOMER_SEGMENTS.map((seg) => (
                      <div key={seg.name} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="font-medium text-foreground">{seg.name}</span>
                          <span className="text-muted-foreground">₹{(seg.revenue / 100000).toFixed(1)}L ({seg.percentage}%)</span>
                        </div>
                        <Progress value={seg.percentage} className="h-1.5" />
                        <p className="text-[10px] text-success">↑ {seg.growth}% growth</p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Order Volume chart */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Order Volume Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={revenueData.filter(d => d.orders > 0)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 15%, 88%)" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="hsl(220, 10%, 46%)" />
                    <YAxis tick={{ fontSize: 11 }} stroke="hsl(220, 10%, 46%)" />
                    <Tooltip />
                    <Bar dataKey="orders" name="Orders" fill={CHART_COLORS.secondary} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Trust Score Tab */}
          <TabsContent value="trust" className="mt-6 space-y-6">
            <div className="grid lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-2">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Trust Score Evolution</CardTitle>
                  <CardDescription>Component-wise trust score trends over 10 months</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={340}>
                    <LineChart data={trustData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 15%, 88%)" />
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="hsl(220, 10%, 46%)" />
                      <YAxis domain={[600, 1000]} tick={{ fontSize: 11 }} stroke="hsl(220, 10%, 46%)" />
                      <Tooltip />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Line type="monotone" dataKey="overall" name="Overall" stroke={CHART_COLORS.primary} strokeWidth={2.5} dot={{ r: 3 }} />
                      <Line type="monotone" dataKey="delivery" name="Delivery" stroke={CHART_COLORS.success} strokeWidth={1.5} />
                      <Line type="monotone" dataKey="quality" name="Quality" stroke={CHART_COLORS.secondary} strokeWidth={1.5} />
                      <Line type="monotone" dataKey="responseTime" name="Response" stroke={CHART_COLORS.warning} strokeWidth={1.5} />
                      <Line type="monotone" dataKey="compliance" name="Compliance" stroke={CHART_COLORS.destructive} strokeWidth={1.5} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <div className="space-y-4">
                {/* Current Score Breakdown */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-1.5"><Award className="h-4 w-4 text-secondary" /> Current Score</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center mb-4">
                      <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 border-4 border-primary">
                        <span className="text-2xl font-display font-bold text-primary">{trustData[trustData.length - 1]?.overall || 0}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">out of 1000</p>
                    </div>
                    {["delivery", "quality", "responseTime", "compliance"].map((key) => {
                      const latest = trustData[trustData.length - 1];
                      const val = latest?.[key as keyof typeof latest] as number || 0;
                      const labels: Record<string, string> = { delivery: "Delivery", quality: "Quality", responseTime: "Response Time", compliance: "Compliance" };
                      return (
                        <div key={key} className="flex items-center gap-2 mb-2">
                          <span className="text-xs text-muted-foreground w-24">{labels[key]}</span>
                          <Progress value={val / 10} className="h-1.5 flex-1" />
                          <span className="text-xs font-medium text-foreground w-8">{val}</span>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>

                {/* Score Impact */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-1.5"><Zap className="h-4 w-4 text-warning" /> Score Boosters</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {[
                      { action: "Maintain 95%+ OTD rate", impact: "+15 pts/month", done: true },
                      { action: "Complete quality certification", impact: "+40 pts one-time", done: false },
                      { action: "Respond within 1 hour", impact: "+10 pts/month", done: true },
                      { action: "Zero disputes for 30 days", impact: "+25 pts", done: false },
                      { action: "Add 5+ product reviews", impact: "+20 pts", done: false },
                    ].map((item, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs">
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${
                          item.done ? "border-success bg-success/10" : "border-muted-foreground"
                        }`}>
                          {item.done && <span className="text-success text-[8px]">✓</span>}
                        </div>
                        <div className="flex-1">
                          <p className={`${item.done ? "text-muted-foreground line-through" : "text-foreground"}`}>{item.action}</p>
                          <p className="text-success font-medium">{item.impact}</p>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Benchmarking Tab */}
          <TabsContent value="benchmark" className="mt-6 space-y-6">
            <div className="grid lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Performance vs Industry</CardTitle>
                    <CardDescription>How you compare against industry averages and top performers</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    {BENCHMARK_DATA.map((m) => (
                      <BenchmarkBar key={m.metric} metric={m} />
                    ))}
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-4">
                {/* Radar Chart */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Performance Radar</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={260}>
                      <RadarChart data={radarData}>
                        <PolarGrid stroke="hsl(220, 15%, 88%)" />
                        <PolarAngleAxis dataKey="metric" tick={{ fontSize: 9 }} stroke="hsl(220, 10%, 46%)" />
                        <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                        <Radar name="You" dataKey="you" stroke={CHART_COLORS.primary} fill={CHART_COLORS.primary} fillOpacity={0.2} strokeWidth={2} />
                        <Radar name="Industry Avg" dataKey="industry" stroke={CHART_COLORS.muted} fill={CHART_COLORS.muted} fillOpacity={0.1} strokeWidth={1.5} strokeDasharray="4 4" />
                        <Legend wrapperStyle={{ fontSize: 10 }} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Competitive Position */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-1.5"><BarChart3 className="h-4 w-4 text-primary" /> Your Ranking</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {[
                      { category: "Overall", rank: 12, total: 240 },
                      { category: "Steel & Metals", rank: 3, total: 58 },
                      { category: "Maharashtra Region", rank: 5, total: 87 },
                    ].map((r) => (
                      <div key={r.category} className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{r.category}</span>
                        <Badge variant="outline" className="font-mono">
                          #{r.rank} <span className="text-muted-foreground font-normal ml-1">/ {r.total}</span>
                        </Badge>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Products Tab */}
          <TabsContent value="products" className="mt-6 space-y-6">
            <div className="grid lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-2">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Product Performance</CardTitle>
                  <CardDescription>Revenue, margins, and ratings by product</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-left">
                          <th className="pb-2 text-xs text-muted-foreground font-medium">Product</th>
                          <th className="pb-2 text-xs text-muted-foreground font-medium text-right">Units</th>
                          <th className="pb-2 text-xs text-muted-foreground font-medium text-right">Revenue</th>
                          <th className="pb-2 text-xs text-muted-foreground font-medium text-right">Margin</th>
                          <th className="pb-2 text-xs text-muted-foreground font-medium text-right">Returns</th>
                          <th className="pb-2 text-xs text-muted-foreground font-medium text-right">Rating</th>
                        </tr>
                      </thead>
                      <tbody>
                        {PRODUCT_PERFORMANCE.map((p) => (
                          <tr key={p.name} className="border-b last:border-0">
                            <td className="py-3 font-medium text-foreground">{p.name}</td>
                            <td className="py-3 text-right text-muted-foreground">{p.unitsSold.toLocaleString()}</td>
                            <td className="py-3 text-right font-medium text-foreground">₹{(p.revenue / 100000).toFixed(1)}L</td>
                            <td className="py-3 text-right">
                              <Badge className={`${p.margin >= 20 ? "bg-success/10 text-success border-success/20" : "bg-secondary/10 text-secondary-foreground border-secondary/20"} text-[10px]`}>
                                {p.margin}%
                              </Badge>
                            </td>
                            <td className="py-3 text-right">
                              <span className={p.returnRate > 1 ? "text-destructive" : "text-success"}>{p.returnRate}%</span>
                            </td>
                            <td className="py-3 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Star className="h-3 w-3 fill-secondary text-secondary" />
                                <span className="font-medium text-foreground">{p.rating}</span>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              {/* Revenue by Product Pie */}
              <div className="space-y-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Revenue Split</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie
                          data={PRODUCT_PERFORMANCE.map((p) => ({ name: p.name.split(" ").slice(0, 2).join(" "), value: p.revenue }))}
                          cx="50%" cy="50%" innerRadius={50} outerRadius={80}
                          dataKey="value" paddingAngle={3}
                        >
                          {PRODUCT_PERFORMANCE.map((_, i) => (
                            <Cell key={i} fill={[CHART_COLORS.primary, CHART_COLORS.secondary, CHART_COLORS.success, CHART_COLORS.warning, CHART_COLORS.destructive][i]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v: number) => `₹${(v / 100000).toFixed(1)}L`} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="space-y-1 mt-2">
                      {PRODUCT_PERFORMANCE.map((p, i) => (
                        <div key={p.name} className="flex items-center gap-2 text-[10px]">
                          <div className="w-2 h-2 rounded-full shrink-0" style={{ background: [CHART_COLORS.primary, CHART_COLORS.secondary, CHART_COLORS.success, CHART_COLORS.warning, CHART_COLORS.destructive][i] }} />
                          <span className="text-muted-foreground truncate">{p.name}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Insights */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-1.5"><Eye className="h-4 w-4 text-primary" /> AI Insights</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {[
                      { text: "Stainless Steel Pipes has highest margin (25.4%) — consider increasing inventory", type: "success" },
                      { text: "Galvanized Iron Sheets return rate (1.2%) exceeds threshold — investigate quality", type: "warning" },
                      { text: "TMT Rebars has best rating (4.9) — use in marketing materials", type: "success" },
                    ].map((insight, i) => (
                      <div key={i} className={`p-2.5 rounded-lg border text-xs ${
                        insight.type === "success" ? "bg-success/5 border-success/10 text-foreground" : "bg-warning/5 border-warning/10 text-foreground"
                      }`}>
                        {insight.type === "success" ? <ArrowUpRight className="h-3 w-3 text-success inline mr-1" /> : <ArrowDownRight className="h-3 w-3 text-warning inline mr-1" />}
                        {insight.text}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </main>
      <Footer />
    </div>
  );
}
