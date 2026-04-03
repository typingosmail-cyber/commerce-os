import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { MOCK_SUPPLIERS, MOCK_CATALOG } from "@/lib/mock-data";
import {
  ArrowLeft, Shield, MapPin, Calendar, Users, IndianRupee, Globe, Phone, Mail,
  Clock, CheckCircle, Star, Package, MessageCircle, ShoppingCart,
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

function ScoreBar({ label, value, icon: Icon }: { label: string; value: number; icon: React.ElementType }) {
  const color = value >= 90 ? "bg-success" : value >= 70 ? "bg-secondary" : "bg-warning";
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="flex items-center gap-1.5 text-muted-foreground"><Icon className="h-3.5 w-3.5" /> {label}</span>
        <span className="font-semibold text-foreground">{value}/100</span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

export default function SupplierStorefront() {
  const { id } = useParams();
  const navigate = useNavigate();
  const supplier = MOCK_SUPPLIERS.find(s => s.id === id);
  const supplierProducts = MOCK_CATALOG.filter(p => p.supplierId === id);

  if (!supplier) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center">
            <Package className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-40" />
            <h2 className="font-display font-bold text-lg text-foreground">Supplier Not Found</h2>
            <p className="text-sm text-muted-foreground mt-1">This supplier profile doesn't exist.</p>
            <Button className="mt-4" onClick={() => navigate("/categories")}>Browse Categories</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const scoreColor = supplier.trustScore.overall >= 800 ? "text-success" : supplier.trustScore.overall >= 600 ? "text-secondary" : "text-warning";

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <main className="container py-8 space-y-6">
        {/* Hero */}
        <Card>
          <CardContent className="p-6 md:p-8">
            <div className="flex flex-col md:flex-row gap-6">
              <div className="h-20 w-20 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <span className="text-3xl font-display font-bold text-primary">{supplier.name.charAt(0)}</span>
              </div>
              <div className="flex-1 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h1 className="text-2xl font-display font-bold text-foreground">{supplier.name}</h1>
                    <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {supplier.city}, {supplier.state}</span>
                      <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> Est. {supplier.yearEstablished}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-3xl font-display font-bold ${scoreColor}`}>{supplier.trustScore.overall}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1 justify-end"><Shield className="h-3 w-3" /> Trust Score</div>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">{supplier.description}</p>
                <div className="flex flex-wrap gap-2">
                  {supplier.certifications.map(c => (
                    <Badge key={c} variant="outline" className="text-xs"><CheckCircle className="h-3 w-3 mr-1 text-success" /> {c}</Badge>
                  ))}
                  <Badge className="bg-success/10 text-success border-success/20 text-xs">GST Verified</Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Info + Trust Score */}
          <div className="space-y-6">
            {/* Quick Stats */}
            <Card>
              <CardHeader><CardTitle className="text-base">Business Details</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Industry</span><span className="font-medium text-foreground">{supplier.industry}</span></div>
                <Separator />
                <div className="flex justify-between"><span className="text-muted-foreground">Employees</span><span className="font-medium text-foreground">{supplier.employeeCount}</span></div>
                <Separator />
                <div className="flex justify-between"><span className="text-muted-foreground">Revenue</span><span className="font-medium text-foreground">{supplier.annualRevenue}</span></div>
                <Separator />
                <div className="flex justify-between"><span className="text-muted-foreground">GSTIN</span><span className="font-mono text-xs text-foreground">{supplier.gstin}</span></div>
                <Separator />
                <div className="flex justify-between"><span className="text-muted-foreground">Member Since</span><span className="font-medium text-foreground">{new Date(supplier.memberSince).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}</span></div>
              </CardContent>
            </Card>

            {/* Trust Score Breakdown */}
            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><Shield className="h-4 w-4 text-primary" /> Trust Score</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <ScoreBar label="Delivery" value={supplier.trustScore.delivery} icon={Package} />
                <ScoreBar label="Quality" value={supplier.trustScore.quality} icon={Star} />
                <ScoreBar label="Response Time" value={supplier.trustScore.responseTime} icon={Clock} />
                <ScoreBar label="Compliance" value={supplier.trustScore.compliance} icon={CheckCircle} />
                <ScoreBar label="Transactions" value={supplier.trustScore.transactionHistory} icon={IndianRupee} />
              </CardContent>
            </Card>

            {/* Contact */}
            <Card>
              <CardHeader><CardTitle className="text-base">Contact</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground"><Mail className="h-4 w-4" /> {supplier.contactEmail}</div>
                <div className="flex items-center gap-2 text-muted-foreground"><Phone className="h-4 w-4" /> {supplier.contactPhone}</div>
                <div className="flex items-center gap-2 text-muted-foreground"><Globe className="h-4 w-4" /> {supplier.website}</div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Response Rate</span>
                  <span className="font-semibold text-success">{supplier.responseRate}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Response Time</span>
                  <span className="font-medium text-foreground">{supplier.responseTime}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right: Product Catalog */}
          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-xl font-display font-bold text-foreground">Product Catalog ({supplierProducts.length + supplier.products.length - supplierProducts.length} items)</h2>

            {/* Products from catalog */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {supplierProducts.map(p => (
                <Card key={p.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-2">
                      <Badge variant="outline" className="text-xs">{p.category}</Badge>
                      {p.inStock ? <Badge className="bg-success/10 text-success border-success/20 text-xs">In Stock</Badge> : <Badge variant="destructive" className="text-xs">Out of Stock</Badge>}
                    </div>
                    <h3 className="font-display font-semibold text-foreground">{p.name}</h3>
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{p.description}</p>
                    <div className="flex items-center gap-3 mt-3 text-sm">
                      <span className="font-semibold text-foreground">₹{p.pricePerUnit}/{p.unit}</span>
                      <span className="text-muted-foreground">MOQ: {p.minOrderQty}</span>
                      <span className="text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" />{p.leadTimeDays}d</span>
                    </div>
                    <Button size="sm" className="w-full mt-3" onClick={() => navigate("/buyer/dashboard")}>Get Best Price</Button>
                  </CardContent>
                </Card>
              ))}

              {/* Additional listed products */}
              {supplier.products.filter(name => !supplierProducts.some(sp => sp.name === name)).map(name => (
                <Card key={name} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-5">
                    <h3 className="font-display font-semibold text-foreground">{name}</h3>
                    <p className="text-sm text-muted-foreground mt-1">Contact supplier for pricing and availability</p>
                    <Button size="sm" variant="outline" className="w-full mt-3" onClick={() => navigate(`/messages?supplier=${id}`)}>
                      <MessageCircle className="h-3.5 w-3.5 mr-1" /> Inquire Now
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
