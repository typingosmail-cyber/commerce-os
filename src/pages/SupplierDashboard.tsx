import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrustScoreDisplay } from "@/components/supplier/TrustScoreDisplay";
import { SupplierData } from "@/lib/types";
import { getSupplierFromStorage } from "@/lib/mock-data";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell,
} from "recharts";
import {
  Building2, Package, ShoppingCart, TrendingUp, Eye, MessageSquare,
  IndianRupee, Users, Clock, CheckCircle2,
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

// Mock analytics data
const REVENUE_DATA = [
  { month: "Oct", revenue: 125000, orders: 12 },
  { month: "Nov", revenue: 198000, orders: 18 },
  { month: "Dec", revenue: 310000, orders: 28 },
  { month: "Jan", revenue: 245000, orders: 22 },
  { month: "Feb", revenue: 380000, orders: 35 },
  { month: "Mar", revenue: 420000, orders: 38 },
];

const INQUIRY_SOURCES = [
  { name: "Search", value: 45, color: "hsl(var(--primary))" },
  { name: "RFQ", value: 25, color: "hsl(var(--secondary))" },
  { name: "Direct", value: 20, color: "hsl(var(--success))" },
  { name: "Referral", value: 10, color: "hsl(var(--warning))" },
];

const RECENT_INQUIRIES = [
  { buyer: "Acme Manufacturing", product: "SS304 Hex Bolts", qty: "5000 pcs", time: "2h ago", status: "new" },
  { buyer: "BuildCorp India", product: "GI Pipes 1.5 inch", qty: "200m", time: "5h ago", status: "responded" },
  { buyer: "AutoTech Pvt Ltd", product: "Industrial Bearings", qty: "100 pcs", time: "1d ago", status: "quoted" },
  { buyer: "SafeGuard Ltd", product: "Safety Helmets", qty: "500 pcs", time: "2d ago", status: "won" },
];

export default function SupplierDashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState<SupplierData | null>(null);

  useEffect(() => {
    const saved = getSupplierFromStorage();
    if (!saved || !saved.onboardingComplete) {
      navigate("/supplier/onboarding");
      return;
    }
    setData(saved);
  }, [navigate]);

  if (!data) return null;

  const stats = [
    { label: "Products Listed", value: data.products.length, icon: Package, color: "text-secondary" },
    { label: "Profile Views", value: 128, icon: Eye, color: "text-success" },
    { label: "RFQ Received", value: 7, icon: ShoppingCart, color: "text-primary" },
    { label: "Enquiries", value: 23, icon: MessageSquare, color: "text-warning" },
    { label: "Revenue (MTD)", value: "₹4.2L", icon: IndianRupee, color: "text-success" },
    { label: "Repeat Buyers", value: "68%", icon: Users, color: "text-primary" },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <main className="container py-8 space-y-6">
        {/* Welcome */}
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-xl bg-primary/10 flex items-center justify-center">
            <Building2 className="h-7 w-7 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-foreground">
              {data.profile?.companyName}
            </h2>
            <div className="flex items-center gap-2 mt-0.5">
              <Badge variant="secondary">{data.profile?.industry}</Badge>
              <Badge className="bg-success/10 text-success border-success/20">GST Verified</Badge>
            </div>
          </div>
        </div>

        {/* Stats - 6 cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {stats.map((s) => (
            <Card key={s.label}>
              <CardContent className="p-4 flex flex-col items-center text-center gap-2">
                <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                  <s.icon className={`h-5 w-5 ${s.color}`} />
                </div>
                <p className="text-xl font-bold text-foreground">{s.value}</p>
                <p className="text-[10px] text-muted-foreground leading-tight">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Revenue Chart */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <TrendingUp className="h-4 w-4 text-success" /> Revenue & Orders Trend
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={REVENUE_DATA}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                  <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Revenue (₹)" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Inquiry Sources Pie */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Inquiry Sources</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center">
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={INQUIRY_SOURCES} cx="50%" cy="50%" innerRadius={40} outerRadius={70} dataKey="value" paddingAngle={2}>
                    {INQUIRY_SOURCES.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-3 mt-2">
                {INQUIRY_SOURCES.map((s) => (
                  <div key={s.name} className="flex items-center gap-1 text-xs text-muted-foreground">
                    <div className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
                    {s.name} ({s.value}%)
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Trust Score */}
        <TrustScoreDisplay score={data.trustScore} />

        {/* Recent Inquiries */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-sm">
                <MessageSquare className="h-4 w-4 text-primary" /> Recent Inquiries
              </CardTitle>
              <Button variant="ghost" size="sm" className="text-xs" onClick={() => navigate("/messages")}>View All</Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="divide-y">
              {RECENT_INQUIRIES.map((inq, i) => (
                <div key={i} className="py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Users className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{inq.buyer}</p>
                      <p className="text-xs text-muted-foreground">{inq.product} • {inq.qty}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" /> {inq.time}
                    </span>
                    <Badge variant={inq.status === "new" ? "default" : inq.status === "won" ? "secondary" : "outline"} className="text-[10px]">
                      {inq.status === "new" && <span className="h-1.5 w-1.5 rounded-full bg-primary-foreground mr-1 animate-pulse" />}
                      {inq.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Products */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Package className="h-4 w-4 text-secondary" /> Your Products
              </CardTitle>
              <Badge variant="outline">{data.products.length} listed</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="divide-y">
              {data.products.map((p) => (
                <div key={p.id} className="py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-md bg-secondary/10 flex items-center justify-center">
                      <Package className="h-5 w-5 text-secondary" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{p.name}</p>
                      <p className="text-sm text-muted-foreground">{p.category}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-foreground">₹{p.pricePerUnit}/{p.unit}</p>
                    <div className="flex items-center gap-1.5 justify-end mt-0.5">
                      {p.inStock ? (
                        <Badge className="bg-success/10 text-success border-success/20 text-xs">In Stock</Badge>
                      ) : (
                        <Badge variant="destructive" className="text-xs">Out of Stock</Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Performance hint */}
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-6 flex items-start gap-4">
            <CheckCircle2 className="h-6 w-6 text-primary shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-foreground">Improve Your Trust Score</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Respond to RFQs within 2 hours, maintain on-time delivery above 95%, 
                and keep defect rates below 1% to unlock Premium tier benefits including 
                priority listing and reduced transaction fees.
              </p>
            </div>
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
}
