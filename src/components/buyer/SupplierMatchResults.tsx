import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { MatchedSupplier } from "@/lib/supplier-matching";
import { tierRank } from "@/lib/supplier-tiers";
import { Sparkles, Shield, Clock, IndianRupee, Package, MapPin, ChevronDown, ChevronUp, Zap, TrendingUp, Filter, Award, BadgeCheck } from "lucide-react";

type SortOption = "score" | "price-asc" | "price-desc" | "delivery-asc" | "tier";

interface Props {
  matches: MatchedSupplier[];
  onClose: () => void;
}

function ScoreRing({ score }: { score: number }) {
  const color = score >= 75 ? "text-success" : score >= 50 ? "text-secondary" : "text-warning";
  const bg = score >= 75 ? "bg-success/10" : score >= 50 ? "bg-secondary/10" : "bg-warning/10";
  return (
    <div className={`h-14 w-14 rounded-full ${bg} flex items-center justify-center shrink-0`}>
      <span className={`font-display font-bold text-lg ${color}`}>{score}</span>
    </div>
  );
}

function BreakdownBar({ label, value, max, icon: Icon }: { label: string; value: number; max: number; icon: React.ElementType }) {
  const pct = Math.round((value / max) * 100);
  return (
    <div className="flex items-center gap-2 text-xs">
      <Icon className="h-3 w-3 text-muted-foreground shrink-0" />
      <span className="w-16 text-muted-foreground truncate">{label}</span>
      <Progress value={pct} className="flex-1 h-1.5" />
      <span className="w-6 text-right text-muted-foreground">{value}</span>
    </div>
  );
}

export function SupplierMatchResults({ matches, onClose }: Props) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [animating, setAnimating] = useState(true);
  const [sortBy, setSortBy] = useState<SortOption>("score");
  const [stockOnly, setStockOnly] = useState(false);
  const [verifiedOnly, setVerifiedOnly] = useState(false);

  const filtered = useMemo(() => {
    let list = [...matches];
    if (stockOnly) list = list.filter((m) => m.inStock);
    if (verifiedOnly) list = list.filter((m) => tierRank(m.tier) >= 2); // Silver+
    switch (sortBy) {
      case "price-asc": list.sort((a, b) => a.pricePerUnit - b.pricePerUnit); break;
      case "price-desc": list.sort((a, b) => b.pricePerUnit - a.pricePerUnit); break;
      case "delivery-asc": list.sort((a, b) => a.leadTimeDays - b.leadTimeDays); break;
      case "tier": list.sort((a, b) => tierRank(b.tier) - tierRank(a.tier) || b.matchScore - a.matchScore); break;
      default: list.sort((a, b) => b.matchScore - a.matchScore);
    }
    return list;
  }, [matches, sortBy, stockOnly, verifiedOnly]);

  useEffect(() => {
    const timer = setTimeout(() => setAnimating(false), 1500);
    return () => clearTimeout(timer);
  }, []);

  if (animating) {
    return (
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-10 text-center">
          <div className="animate-pulse flex flex-col items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center">
              <Sparkles className="h-6 w-6 text-primary animate-spin" />
            </div>
            <h3 className="font-display font-semibold text-foreground">AI Matching Engine</h3>
            <p className="text-sm text-muted-foreground">Analyzing {matches.length} suppliers across trust, pricing & delivery...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  

  return (
    <div className="space-y-4 animate-fade-in-up">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-display font-bold text-foreground">AI-Matched Suppliers</h2>
          <Badge variant="outline" className="text-xs">{matches.length} ranked</Badge>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>Close</Button>
      </div>

      {/* Filter & Sort Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Filter className="h-3.5 w-3.5" />
          <span className="text-xs font-medium">Filters</span>
        </div>
        <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
          <SelectTrigger className="w-[160px] h-8 text-xs">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="score">Best Match</SelectItem>
            <SelectItem value="tier">Verification Tier</SelectItem>
            <SelectItem value="price-asc">Price: Low → High</SelectItem>
            <SelectItem value="price-desc">Price: High → Low</SelectItem>
            <SelectItem value="delivery-asc">Fastest Delivery</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex items-center gap-1.5">
          <Checkbox id="stock-filter" checked={stockOnly} onCheckedChange={(c) => setStockOnly(!!c)} />
          <Label htmlFor="stock-filter" className="text-xs cursor-pointer">In Stock Only</Label>
        </div>
        <div className="flex items-center gap-1.5">
          <Checkbox id="verified-filter" checked={verifiedOnly} onCheckedChange={(c) => setVerifiedOnly(!!c)} />
          <Label htmlFor="verified-filter" className="text-xs cursor-pointer flex items-center gap-1">
            <BadgeCheck className="h-3 w-3 text-primary" /> Silver+ Verified Only
          </Label>
        </div>
        <Badge variant="outline" className="text-xs ml-auto">{filtered.length} result{filtered.length !== 1 ? "s" : ""}</Badge>
      </div>

      {/* Top recommendation */}
      {filtered[0] && (
        <Card className="border-primary/30 bg-gradient-to-r from-primary/5 to-transparent">
          <CardContent className="p-5">
            <div className="flex items-center gap-1.5 mb-3">
              <Zap className="h-4 w-4 text-primary" />
              <span className="text-xs font-semibold text-primary uppercase tracking-wide">Top Recommendation</span>
            </div>
            <div className="flex items-center gap-4">
              <ScoreRing score={filtered[0].matchScore} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-display font-semibold text-foreground text-lg">{filtered[0].supplierName}</h3>
                  <Badge variant="outline" className={`${filtered[0].tierColor} text-[10px] gap-1`}>
                    <Award className="h-3 w-3" /> {filtered[0].tierLabel}
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {filtered[0].perkLabels.map((p) => (
                    <Badge key={p} variant="secondary" className="text-[10px]">{p}</Badge>
                  ))}
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="font-display font-bold text-foreground">₹{filtered[0].pricePerUnit}/{filtered[0].unit}</p>
                <p className="text-xs text-muted-foreground">{filtered[0].leadTimeDays}d delivery</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* All matches */}
      <div className="space-y-2">
        {filtered.map((m, i) => (
          <Card key={m.supplierId} className={`transition-all ${i === 0 ? "opacity-60" : ""}`}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="text-center shrink-0 w-8">
                  <span className="text-xs text-muted-foreground font-medium">#{i + 1}</span>
                </div>
                <ScoreRing score={m.matchScore} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-display font-semibold text-foreground truncate">{m.supplierName}</h4>
                    <Badge variant="outline" className={`${m.tierColor} text-[10px] gap-1 shrink-0`}>
                      <Award className="h-2.5 w-2.5" /> {m.tierLabel}
                    </Badge>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <Badge variant="outline" className="text-[10px] shrink-0">
                            <Shield className="h-2.5 w-2.5 mr-0.5" /> {m.supplierScore}
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent>Trust Score: {m.supplierScore}/1000</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5 flex-wrap">
                    <span className="flex items-center gap-0.5"><MapPin className="h-3 w-3" /> {m.supplierCity}</span>
                    <span className="flex items-center gap-0.5"><Clock className="h-3 w-3" /> {m.leadTimeDays}d</span>
                    <span className="flex items-center gap-0.5"><IndianRupee className="h-3 w-3" /> {m.pricePerUnit}/{m.unit}</span>
                    {m.inStock && <Badge className="bg-success/10 text-success border-success/20 text-[10px] h-4">In Stock</Badge>}
                    {m.perks.escrowFeePct === 0 && <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px] h-4">0% escrow</Badge>}
                    {m.perks.bnplEligible && <Badge variant="outline" className="text-[10px] h-4">BNPL</Badge>}
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="shrink-0" onClick={() => setExpanded(expanded === m.supplierId ? null : m.supplierId)}>
                  {expanded === m.supplierId ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </div>

              {expanded === m.supplierId && (
                <div className="mt-4 pt-3 border-t space-y-2 animate-fade-in-up">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" /> Score Breakdown
                  </p>
                  <BreakdownBar label="Trust" value={m.breakdown.trustWeight} max={28} icon={Shield} />
                  <BreakdownBar label="Verified" value={m.breakdown.verificationWeight} max={15} icon={BadgeCheck} />
                  <BreakdownBar label="Price" value={m.breakdown.priceWeight} max={25} icon={IndianRupee} />
                  <BreakdownBar label="Delivery" value={m.breakdown.deliveryWeight} max={18} icon={Clock} />
                  <BreakdownBar label="Stock" value={m.breakdown.availabilityBonus} max={7} icon={Package} />
                  <BreakdownBar label="Category" value={m.breakdown.categoryBonus} max={7} icon={Sparkles} />
                  <div className="rounded-md bg-muted/40 p-2 mt-2">
                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1 flex items-center gap-1">
                      <Award className="h-3 w-3" /> {m.tierLabel} perks
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {m.perkLabels.map((p) => (
                        <Badge key={p} variant="outline" className="text-[10px]">{p}</Badge>
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {m.reasons.map((r) => (
                      <Badge key={r} variant="secondary" className="text-[10px]">{r}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
