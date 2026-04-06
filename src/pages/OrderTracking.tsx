import { useState } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import {
  Package, Truck, CheckCircle2, Clock, MapPin, Shield, Search,
  ArrowRight, Thermometer, CircleDollarSign, BarChart3, AlertTriangle,
  TrendingUp, TrendingDown, Minus, ExternalLink, RefreshCw, Eye
} from "lucide-react";
import {
  MOCK_TRACKED_ORDERS, TrackedOrder, TrackingMilestone,
  getOrderProgress, LOGISTICS_PARTNERS
} from "@/lib/order-tracking";

const STATUS_COLORS: Record<string, string> = {
  confirmed: "bg-primary/10 text-primary border-primary/20",
  processing: "bg-secondary/10 text-secondary-foreground border-secondary/20",
  quality_check: "bg-accent/10 text-accent-foreground border-accent/20",
  dispatched: "bg-warning/10 text-warning-foreground border-warning/20",
  in_transit: "bg-primary/10 text-primary border-primary/20",
  out_for_delivery: "bg-success/10 text-success border-success/20",
  delivered: "bg-success/15 text-success border-success/30",
};

const STATUS_LABELS: Record<string, string> = {
  confirmed: "Confirmed", processing: "Processing", quality_check: "QC Check",
  dispatched: "Dispatched", in_transit: "In Transit", out_for_delivery: "Out for Delivery", delivered: "Delivered",
};

const MILESTONE_ICONS: Record<string, React.ElementType> = {
  check: CheckCircle2, package: Package, truck: Truck,
  warehouse: Package, mappin: MapPin, shield: Shield,
};

function MilestoneTimeline({ milestones }: { milestones: TrackingMilestone[] }) {
  return (
    <div className="relative pl-6">
      {milestones.map((m, i) => {
        const Icon = MILESTONE_ICONS[m.icon] || Package;
        const isLast = i === milestones.length - 1;
        return (
          <div key={m.id} className="relative pb-6 last:pb-0">
            {!isLast && (
              <div className={`absolute left-[-18px] top-8 w-0.5 h-[calc(100%-16px)] ${
                m.status === "completed" ? "bg-success" : "bg-border"
              }`} />
            )}
            <div className="flex items-start gap-3">
              <div className={`absolute left-[-26px] w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                m.status === "completed" ? "bg-success text-success-foreground" :
                m.status === "active" ? "bg-primary text-primary-foreground ring-4 ring-primary/20" :
                "bg-muted text-muted-foreground"
              }`}>
                <Icon className="h-3 w-3" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className={`font-medium text-sm ${
                    m.status === "upcoming" ? "text-muted-foreground" : "text-foreground"
                  }`}>{m.label}</span>
                  {m.status === "active" && (
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">{m.description}</p>
                {m.timestamp && (
                  <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {new Date(m.timestamp).toLocaleDateString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                    {m.location && (
                      <>
                        <MapPin className="h-3 w-3 ml-1" />
                        {m.location}
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ETACard({ order }: { order: TrackedOrder }) {
  const { eta } = order;
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Clock className="h-4 w-4 text-primary" /> ETA Prediction
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-center p-4 rounded-lg bg-primary/5 border border-primary/10">
          <p className="text-xs text-muted-foreground mb-1">Estimated Arrival</p>
          <p className="text-2xl font-bold text-foreground font-display">
            {new Date(eta.estimatedDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
          </p>
          <div className="flex items-center justify-center gap-1 mt-2">
            <div className="h-2 flex-1 max-w-[120px] rounded-full bg-muted overflow-hidden">
              <div className="h-full rounded-full bg-success transition-all" style={{ width: `${eta.confidence}%` }} />
            </div>
            <span className="text-xs font-medium text-success">{eta.confidence}% confident</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="p-2 rounded bg-success/5 border border-success/10 text-center">
            <p className="text-[10px] text-muted-foreground">Best Case</p>
            <p className="font-semibold text-success text-sm">{new Date(eta.bestCase).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</p>
          </div>
          <div className="p-2 rounded bg-destructive/5 border border-destructive/10 text-center">
            <p className="text-[10px] text-muted-foreground">Worst Case</p>
            <p className="font-semibold text-destructive text-sm">{new Date(eta.worstCase).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</p>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Impact Factors</p>
          {eta.factors.map((f, i) => {
            const ImpactIcon = f.impact === "positive" ? TrendingUp : f.impact === "negative" ? TrendingDown : Minus;
            const color = f.impact === "positive" ? "text-success" : f.impact === "negative" ? "text-destructive" : "text-muted-foreground";
            return (
              <div key={i} className="flex items-start gap-2 text-xs">
                <ImpactIcon className={`h-3.5 w-3.5 mt-0.5 shrink-0 ${color}`} />
                <div>
                  <span className="font-medium text-foreground">{f.name}</span>
                  <span className="text-muted-foreground"> — {f.detail}</span>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function LogisticsCard({ order }: { order: TrackedOrder }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Truck className="h-4 w-4 text-primary" /> Logistics Details
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border">
          <span className="text-2xl">{order.logistics.logo}</span>
          <div className="flex-1">
            <p className="font-semibold text-sm text-foreground">{order.logistics.name}</p>
            <p className="text-xs text-muted-foreground">On-time rate: {order.logistics.onTimeRate}%</p>
          </div>
          <Button variant="outline" size="sm" className="gap-1" onClick={() => window.open(order.logistics.trackingUrl + order.trackingNumber, "_blank")}>
            <ExternalLink className="h-3 w-3" /> Track
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-[10px] text-muted-foreground">Tracking #</p>
            <p className="font-mono font-medium text-foreground text-xs">{order.trackingNumber}</p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground">Weight</p>
            <p className="font-medium text-foreground text-xs">{order.weight}</p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground">Origin</p>
            <p className="font-medium text-foreground text-xs">{order.origin}</p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground">Destination</p>
            <p className="font-medium text-foreground text-xs">{order.destination}</p>
          </div>
        </div>

        <div className="flex gap-2 flex-wrap">
          {order.temperatureSensitive && (
            <Badge className="bg-destructive/10 text-destructive border-destructive/20 gap-1">
              <Thermometer className="h-3 w-3" /> Temp. Controlled
            </Badge>
          )}
          <Badge className="bg-success/10 text-success border-success/20 gap-1">
            <Shield className="h-3 w-3" /> Insured ₹{(order.insuranceValue / 100000).toFixed(1)}L
          </Badge>
        </div>

        {order.liveLocation && (
          <div className="p-3 rounded-lg border bg-primary/5">
            <div className="flex items-center gap-2 mb-2">
              <MapPin className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs font-medium text-foreground">Live Location</span>
              <span className="relative flex h-2 w-2 ml-auto">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-success" />
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {order.liveLocation.lat.toFixed(4)}°N, {order.liveLocation.lng.toFixed(4)}°E
            </p>
            <p className="text-[10px] text-muted-foreground mt-1">
              Updated {new Date(order.liveLocation.updatedAt).toLocaleTimeString("en-IN")}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function OrderCard({ order, selected, onSelect }: { order: TrackedOrder; selected: boolean; onSelect: () => void }) {
  const progress = getOrderProgress(order);
  return (
    <Card className={`cursor-pointer transition-all hover:shadow-md ${selected ? "ring-2 ring-primary" : ""}`} onClick={onSelect}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div className="min-w-0">
            <p className="font-display font-semibold text-sm text-foreground truncate">{order.productName}</p>
            <p className="text-xs text-muted-foreground">{order.orderId}</p>
          </div>
          <Badge className={STATUS_COLORS[order.status] + " text-[10px] shrink-0"}>
            {STATUS_LABELS[order.status]}
          </Badge>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
          <Package className="h-3 w-3" />
          <span className="truncate">{order.supplierName}</span>
          <ArrowRight className="h-3 w-3 shrink-0" />
          <span className="truncate">{order.buyerName}</span>
        </div>
        <Progress value={progress} className="h-1.5" />
        <div className="flex justify-between mt-1.5 text-[10px] text-muted-foreground">
          <span>{progress}% complete</span>
          <span>ETA: {new Date(order.eta.estimatedDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span>
        </div>
      </CardContent>
    </Card>
  );
}

export default function OrderTracking() {
  const [selectedId, setSelectedId] = useState(MOCK_TRACKED_ORDERS[0].id);
  const [searchQuery, setSearchQuery] = useState("");
  const selected = MOCK_TRACKED_ORDERS.find((o) => o.id === selectedId) || MOCK_TRACKED_ORDERS[0];

  const filtered = MOCK_TRACKED_ORDERS.filter((o) =>
    o.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    o.orderId.toLowerCase().includes(searchQuery.toLowerCase()) ||
    o.trackingNumber.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const summaryStats = [
    { label: "Active Shipments", value: MOCK_TRACKED_ORDERS.filter((o) => o.status !== "delivered").length, icon: Truck, color: "text-primary" },
    { label: "In Transit", value: MOCK_TRACKED_ORDERS.filter((o) => o.status === "in_transit").length, icon: Package, color: "text-secondary-foreground" },
    { label: "On-Time Rate", value: "94%", icon: BarChart3, color: "text-success" },
    { label: "Alerts", value: MOCK_TRACKED_ORDERS.filter((o) => o.temperatureSensitive).length, icon: AlertTriangle, color: "text-warning" },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="container py-6 space-y-6 flex-1">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">Order Tracking</h1>
            <p className="text-sm text-muted-foreground">Real-time shipment visibility & ETA intelligence</p>
          </div>
          <Button variant="outline" size="sm" className="gap-1.5">
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {summaryStats.map((s) => (
            <Card key={s.label}>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                  <s.icon className={`h-5 w-5 ${s.color}`} />
                </div>
                <div>
                  <p className="text-xl font-display font-bold text-foreground">{s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Main Layout */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Order List */}
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search orders, tracking #..." className="pl-9" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            </div>
            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
              {filtered.map((o) => (
                <OrderCard key={o.id} order={o} selected={o.id === selectedId} onSelect={() => setSelectedId(o.id)} />
              ))}
              {filtered.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">No orders found</p>
              )}
            </div>
          </div>

          {/* Detail Panel */}
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg font-display">{selected.productName}</CardTitle>
                    <CardDescription>{selected.orderId} · ₹{selected.totalAmount.toLocaleString()} · {selected.quantity} {selected.unit}</CardDescription>
                  </div>
                  <Badge className={STATUS_COLORS[selected.status]}>
                    {STATUS_LABELS[selected.status]}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
                    <span>{selected.origin}</span>
                    <span>{selected.destination}</span>
                  </div>
                  <Progress value={getOrderProgress(selected)} className="h-2" />
                </div>

                <Tabs defaultValue="milestones">
                  <TabsList className="w-full justify-start">
                    <TabsTrigger value="milestones" className="gap-1 text-xs"><Eye className="h-3.5 w-3.5" /> Milestones</TabsTrigger>
                    <TabsTrigger value="eta" className="gap-1 text-xs"><Clock className="h-3.5 w-3.5" /> ETA</TabsTrigger>
                    <TabsTrigger value="logistics" className="gap-1 text-xs"><Truck className="h-3.5 w-3.5" /> Logistics</TabsTrigger>
                  </TabsList>

                  <TabsContent value="milestones" className="mt-4">
                    <MilestoneTimeline milestones={selected.milestones} />
                  </TabsContent>

                  <TabsContent value="eta" className="mt-4">
                    <ETACard order={selected} />
                  </TabsContent>

                  <TabsContent value="logistics" className="mt-4">
                    <LogisticsCard order={selected} />
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            {/* Logistics Partners */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Integrated Logistics Partners</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {LOGISTICS_PARTNERS.map((lp) => (
                    <div key={lp.id} className="flex items-center gap-2 p-2.5 rounded-lg border bg-muted/30 hover:bg-muted/60 transition-colors">
                      <span className="text-lg">{lp.logo}</span>
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-foreground truncate">{lp.name}</p>
                        <p className="text-[10px] text-muted-foreground">⭐ {lp.rating} · {lp.onTimeRate}% OTD</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
