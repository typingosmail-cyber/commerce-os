import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, RadarChart, Radar, PolarGrid, PolarAngleAxis,
} from "recharts";
import {
  Brain, TrendingUp, TrendingDown, Minus, Zap, Target, MapPin, Clock,
  ArrowRight, ShoppingCart, AlertTriangle, CheckCircle2, Shield,
  Lightbulb, BarChart3, Activity, Globe, Star, IndianRupee, Package,
  Users, ArrowUpRight, ArrowDownRight, ChevronRight, Sparkles, Eye,
} from "lucide-react";
import {
  DEMAND_PREDICTIONS, PRICE_FORECASTS, AUTO_MATCH_SUGGESTIONS,
  MARKET_SIGNALS, DEMAND_HEATMAP_DATA,
  type DemandPrediction, type PriceForecast, type AutoMatchSuggestion, type MarketSignal,
} from "@/lib/demand-intelligence";

const TREND_ICON = { rising: TrendingUp, stable: Minus, declining: TrendingDown };
const TREND_COLOR = { rising: "text-success", stable: "text-warning", declining: "text-destructive" };
const URGENCY_STYLE = { high: "bg-destructive text-destructive-foreground", medium: "bg-warning text-warning-foreground", low: "bg-muted text-muted-foreground" };
const SIGNAL_ICON = { price_drop: TrendingDown, demand_surge: TrendingUp, supply_shortage: AlertTriangle, new_regulation: Shield, seasonal: Activity };
const SIGNAL_COLOR = { price_drop: "text-success", demand_surge: "text-primary", supply_shortage: "text-destructive", new_regulation: "text-warning", seasonal: "text-secondary" };
const REC_STYLE = { buy_now: { label: "Buy Now", color: "bg-success text-success-foreground" }, wait: { label: "Wait", color: "bg-warning text-warning-foreground" }, negotiate: { label: "Negotiate", color: "bg-primary text-primary-foreground" } };

function timeAgo(ts: string) {
  const s = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function DemandIntelligence() {
  const navigate = useNavigate();
  const [tab, setTab] = useState("overview");
  const [selectedForecast, setSelectedForecast] = useState(0);

  const forecast = PRICE_FORECASTS[selectedForecast];
  const rec = REC_STYLE[forecast.recommendation];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero */}
      <div className="bg-gradient-to-br from-primary via-primary to-primary/90 text-primary-foreground">
        <div className="container py-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-10 w-10 rounded-xl bg-secondary/20 flex items-center justify-center">
              <Brain className="h-5 w-5 text-secondary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Demand Intelligence</h1>
              <p className="text-sm text-primary-foreground/70">AI-powered market insights, price forecasts & auto-matching</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-4 mt-4">
            {[
              { label: "Predictions Active", value: DEMAND_PREDICTIONS.length, icon: Brain },
              { label: "Avg Confidence", value: `${Math.round(DEMAND_PREDICTIONS.reduce((a, p) => a + p.confidence, 0) / DEMAND_PREDICTIONS.length)}%`, icon: Target },
              { label: "Auto-Matches", value: AUTO_MATCH_SUGGESTIONS.length, icon: Zap },
              { label: "Market Signals", value: MARKET_SIGNALS.length, icon: Activity },
            ].map(s => (
              <div key={s.label} className="flex items-center gap-2 bg-primary-foreground/10 rounded-lg px-3 py-2">
                <s.icon className="h-4 w-4 text-secondary" />
                <span className="font-bold text-sm">{s.value}</span>
                <span className="text-xs text-primary-foreground/60">{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="container py-6">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="overview" className="gap-1"><BarChart3 className="h-3.5 w-3.5" /> Overview</TabsTrigger>
            <TabsTrigger value="forecasts" className="gap-1"><TrendingUp className="h-3.5 w-3.5" /> Price Forecasts</TabsTrigger>
            <TabsTrigger value="matching" className="gap-1"><Zap className="h-3.5 w-3.5" /> Auto-Match</TabsTrigger>
            <TabsTrigger value="signals" className="gap-1"><Activity className="h-3.5 w-3.5" /> Market Signals</TabsTrigger>
          </TabsList>

          {/* OVERVIEW TAB */}
          <TabsContent value="overview" className="space-y-6">
            {/* Demand predictions grid */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-secondary" /> AI Demand Predictions
                </h2>
                <Badge variant="outline" className="text-[10px]">Updated 30 min ago</Badge>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {DEMAND_PREDICTIONS.map(pred => {
                  const TrendIcon = TREND_ICON[pred.trend];
                  return (
                    <Card key={pred.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4 space-y-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-semibold text-foreground text-sm">{pred.product}</p>
                            <p className="text-[10px] text-muted-foreground">{pred.category}</p>
                          </div>
                          <div className={`flex items-center gap-0.5 text-xs font-semibold ${TREND_COLOR[pred.trend]}`}>
                            <TrendIcon className="h-3.5 w-3.5" />
                            {pred.changePercent > 0 ? "+" : ""}{pred.changePercent}%
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex-1">
                            <p className="text-[10px] text-muted-foreground">Predicted Monthly Demand</p>
                            <p className="text-lg font-bold text-foreground">{pred.predictedDemand.toLocaleString()}<span className="text-xs text-muted-foreground font-normal"> units</span></p>
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] text-muted-foreground">AI Confidence</p>
                            <p className="text-lg font-bold text-foreground">{pred.confidence}%</p>
                          </div>
                        </div>
                        <Progress value={pred.confidence} className="h-1.5" />
                        <div className="flex items-center gap-1 flex-wrap">
                          <MapPin className="h-3 w-3 text-muted-foreground" />
                          {pred.topRegions.slice(0, 2).map(r => (
                            <Badge key={r} variant="outline" className="text-[8px] px-1 py-0">{r}</Badge>
                          ))}
                          {pred.topRegions.length > 2 && (
                            <Badge variant="outline" className="text-[8px] px-1 py-0">+{pred.topRegions.length - 2}</Badge>
                          )}
                        </div>
                        <div className="bg-muted/50 rounded-lg p-2">
                          <div className="flex items-start gap-1.5">
                            <Lightbulb className="h-3 w-3 text-secondary mt-0.5 shrink-0" />
                            <p className="text-[10px] text-muted-foreground leading-relaxed line-clamp-3">{pred.aiInsight}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>

            {/* Regional heatmap + market signals */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Globe className="h-4 w-4 text-primary" /> Regional Demand Heatmap
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={DEMAND_HEATMAP_DATA} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                      <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10 }} />
                      <YAxis type="category" dataKey="region" tick={{ fontSize: 10 }} width={90} />
                      <Tooltip
                        content={({ payload }) => {
                          if (!payload?.[0]) return null;
                          const d = payload[0].payload;
                          return (
                            <div className="bg-card border rounded-lg p-2 shadow-lg text-xs">
                              <p className="font-semibold">{d.region}</p>
                              <p>Demand Index: <span className="font-bold">{d.demand}</span></p>
                              <p>Growth: <span className="text-success font-bold">+{d.growth}%</span></p>
                              <p>Top Product: {d.topProduct}</p>
                            </div>
                          );
                        }}
                      />
                      <Bar dataKey="demand" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Activity className="h-4 w-4 text-destructive" /> Live Market Signals
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[280px]">
                    <div className="space-y-2">
                      {MARKET_SIGNALS.map(sig => {
                        const SigIcon = SIGNAL_ICON[sig.type];
                        return (
                          <div key={sig.id} className="flex gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
                            <div className={`h-8 w-8 rounded-lg bg-muted flex items-center justify-center shrink-0`}>
                              <SigIcon className={`h-4 w-4 ${SIGNAL_COLOR[sig.type]}`} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <p className="text-xs font-semibold text-foreground truncate">{sig.title}</p>
                                <Badge variant={sig.impact === "high" ? "destructive" : "outline"} className="text-[8px] px-1 py-0 shrink-0">{sig.impact}</Badge>
                              </div>
                              <p className="text-[10px] text-muted-foreground line-clamp-2 mt-0.5">{sig.description}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-[9px] text-muted-foreground">{sig.category}</span>
                                <span className="text-[9px] text-muted-foreground">·</span>
                                <span className="text-[9px] text-muted-foreground">{timeAgo(sig.timestamp)}</span>
                                {sig.actionable && (
                                  <Badge variant="outline" className="text-[8px] px-1 py-0 text-success border-success/30">Actionable</Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* PRICE FORECASTS TAB */}
          <TabsContent value="forecasts" className="space-y-6">
            <div className="flex gap-2 flex-wrap">
              {PRICE_FORECASTS.map((pf, idx) => (
                <Button
                  key={pf.product}
                  variant={selectedForecast === idx ? "default" : "outline"}
                  size="sm" className="text-xs"
                  onClick={() => setSelectedForecast(idx)}
                >
                  {pf.product.split("(")[0].trim()}
                </Button>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-2">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">{forecast.product} — 8-Month Forecast</CardTitle>
                    <Badge className={`${rec.color} text-[10px]`}>{rec.label}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={forecast.forecast}>
                      <defs>
                        <linearGradient id="confidenceBand" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.15} />
                          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip
                        content={({ payload, label }) => {
                          if (!payload?.length) return null;
                          return (
                            <div className="bg-card border rounded-lg p-2 shadow-lg text-xs space-y-0.5">
                              <p className="font-semibold">{label}</p>
                              {payload.map(p => (
                                <p key={p.dataKey as string} style={{ color: p.color }}>
                                  {p.name}: ₹{Number(p.value).toLocaleString()}/{forecast.unit}
                                </p>
                              ))}
                            </div>
                          );
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: 10 }} />
                      <Area type="monotone" dataKey="upper" stroke="none" fill="url(#confidenceBand)" name="Upper Bound" />
                      <Area type="monotone" dataKey="lower" stroke="none" fill="url(#confidenceBand)" name="Lower Bound" />
                      <Line type="monotone" dataKey="predicted" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} name="Predicted" />
                      <Line type="monotone" dataKey="actual" stroke="hsl(var(--success))" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 4 }} name="Actual" connectNulls={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <div className="space-y-4">
                <Card>
                  <CardContent className="p-4 space-y-3">
                    <h3 className="text-sm font-semibold text-foreground">Current Price</h3>
                    <p className="text-2xl font-bold text-foreground">₹{forecast.currentPrice.toLocaleString()}<span className="text-xs text-muted-foreground font-normal">/{forecast.unit}</span></p>
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Volatility Index</span>
                        <span className="font-semibold">{forecast.volatilityIndex}/100</span>
                      </div>
                      <Progress value={forecast.volatilityIndex} className="h-1.5" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-primary/30 bg-primary/5">
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <Lightbulb className="h-4 w-4 text-secondary" />
                      <h3 className="text-sm font-semibold text-foreground">AI Recommendation</h3>
                    </div>
                    <Badge className={`${rec.color} text-xs`}>{rec.label}</Badge>
                    <p className="text-xs text-muted-foreground leading-relaxed">{forecast.aiReason}</p>
                    <Button size="sm" className="w-full text-xs mt-2" onClick={() => navigate("/buyer/dashboard")}>
                      <ShoppingCart className="h-3.5 w-3.5 mr-1" /> Act on This
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* AUTO-MATCH TAB */}
          <TabsContent value="matching" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                <Zap className="h-5 w-5 text-secondary" /> AI Auto-Match Suggestions
              </h2>
              <p className="text-xs text-muted-foreground">{AUTO_MATCH_SUGGESTIONS.length} active matches</p>
            </div>

            {AUTO_MATCH_SUGGESTIONS.map(match => (
              <Card key={match.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4 space-y-4">
                  {/* Match header */}
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-foreground text-sm">{match.buyerNeed}</p>
                        <Badge className={`${URGENCY_STYLE[match.urgency]} text-[9px] px-1.5 py-0`}>{match.urgency}</Badge>
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3" /> {match.buyerLocation}
                        <span>·</span>
                        <Clock className="h-3 w-3" /> {match.postedAgo}
                        <span>·</span>
                        <span>Budget: ₹{match.budget.toLocaleString()}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-muted-foreground">Match Score</p>
                      <p className="text-xl font-bold text-foreground">{match.matchScore}%</p>
                    </div>
                  </div>

                  {/* Matched suppliers */}
                  <div className="space-y-2">
                    {match.matchedSuppliers.map((sup, idx) => (
                      <div key={idx} className={`flex items-center justify-between p-3 rounded-lg ${idx === 0 ? "bg-success/5 border border-success/20" : "bg-muted/30"}`}>
                        <div className="flex items-center gap-3">
                          {idx === 0 && <Badge className="bg-success text-success-foreground text-[8px] px-1 py-0">Best Match</Badge>}
                          <div>
                            <p className="text-xs font-semibold text-foreground">{sup.name}</p>
                            <p className="text-[10px] text-muted-foreground">{sup.city} · Score: {sup.score}/1000</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-bold text-foreground">₹{sup.price.toLocaleString()}/{match.unit}</p>
                          <p className="text-[9px] text-muted-foreground">{sup.confidence}% confidence</p>
                        </div>
                        <div className="hidden sm:block max-w-[180px]">
                          <p className="text-[10px] text-muted-foreground italic">{sup.matchReason}</p>
                        </div>
                        <Button size="sm" variant={idx === 0 ? "default" : "outline"} className="text-[10px] h-7 shrink-0" onClick={() => navigate("/buyer/dashboard")}>
                          Connect <ChevronRight className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          {/* MARKET SIGNALS TAB */}
          <TabsContent value="signals" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {MARKET_SIGNALS.map(sig => {
                const SigIcon = SIGNAL_ICON[sig.type];
                return (
                  <Card key={sig.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-5 space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
                          <SigIcon className={`h-5 w-5 ${SIGNAL_COLOR[sig.type]}`} />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-foreground text-sm">{sig.title}</p>
                            <Badge variant={sig.impact === "high" ? "destructive" : "outline"} className="text-[9px]">{sig.impact} impact</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{sig.description}</p>
                          <div className="flex items-center gap-3 mt-2">
                            <Badge variant="outline" className="text-[9px]">{sig.category}</Badge>
                            <span className="text-[10px] text-muted-foreground">{timeAgo(sig.timestamp)}</span>
                          </div>
                        </div>
                      </div>
                      {sig.actionable && (
                        <div className="flex gap-2 pt-2 border-t">
                          <Button size="sm" className="text-xs flex-1" onClick={() => navigate("/buyer/dashboard")}>
                            <ShoppingCart className="h-3.5 w-3.5 mr-1" /> Act on Signal
                          </Button>
                          <Button size="sm" variant="outline" className="text-xs" onClick={() => navigate("/categories")}>
                            <Eye className="h-3.5 w-3.5 mr-1" /> Browse Category
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <Footer />
    </div>
  );
}
