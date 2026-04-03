import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrustScoreDisplay } from "@/components/supplier/TrustScoreDisplay";
import { SupplierData } from "@/lib/types";
import { getSupplierFromStorage, saveSupplierToStorage } from "@/lib/mock-data";
import {
  Building2, Package, ShoppingCart, TrendingUp, Eye, MessageSquare, LogOut,
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

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

  const handleLogout = () => {
    localStorage.removeItem("vyapar_supplier");
    navigate("/");
  };

  const stats = [
    { label: "Products Listed", value: data.products.length, icon: Package, color: "text-secondary" },
    { label: "Profile Views", value: 128, icon: Eye, color: "text-success" },
    { label: "RFQ Received", value: 7, icon: ShoppingCart, color: "text-primary" },
    { label: "Enquiries", value: 23, icon: MessageSquare, color: "text-warning" },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <main className="container py-8 space-y-8">
        {/* Welcome */}
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-xl bg-primary/10 flex items-center justify-center">
            <Building2 className="h-7 w-7 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-display font-bold text-foreground">
              {data.profile?.companyName}
            </h2>
            <div className="flex items-center gap-2 mt-0.5">
              <Badge variant="secondary">{data.profile?.industry}</Badge>
              <Badge className="bg-success/10 text-success border-success/20">GST Verified</Badge>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map((s) => (
            <Card key={s.label}>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                  <s.icon className={`h-5 w-5 ${s.color}`} />
                </div>
                <div>
                  <p className="text-2xl font-display font-bold text-foreground">{s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Trust Score */}
        <TrustScoreDisplay score={data.trustScore} />

        {/* Products */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5 text-secondary" />
                Your Products
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
            <TrendingUp className="h-6 w-6 text-primary shrink-0 mt-0.5" />
            <div>
              <h3 className="font-display font-semibold text-foreground">Improve Your Trust Score</h3>
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
