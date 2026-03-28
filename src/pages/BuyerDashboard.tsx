import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ProductSearch } from "@/components/buyer/ProductSearch";
import { RFQForm } from "@/components/buyer/RFQForm";
import { RFQList } from "@/components/buyer/RFQList";
import { OrderList } from "@/components/buyer/OrderList";
import { getBuyerFromStorage, saveBuyerToStorage } from "@/lib/mock-data";
import { BuyerData, CatalogProduct, RFQ, Order } from "@/lib/types";
import { SupplierMatchResults } from "@/components/buyer/SupplierMatchResults";
import { matchSuppliers, MatchedSupplier } from "@/lib/supplier-matching";
import { Search, FileText, Package, TrendingUp, ShoppingCart, ArrowLeft, LogOut, Sparkles } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export default function BuyerDashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState<BuyerData>(getBuyerFromStorage());
  const [tab, setTab] = useState("search");
  const [rfqPrefill, setRfqPrefill] = useState<CatalogProduct | null>(null);
  const [showRFQForm, setShowRFQForm] = useState(false);
  const [matchResults, setMatchResults] = useState<MatchedSupplier[] | null>(null);

  useEffect(() => {
    saveBuyerToStorage(data);
  }, [data]);

  const handleCreateRFQ = (product: CatalogProduct) => {
    setRfqPrefill(product);
    setShowRFQForm(true);
    setTab("rfqs");
  };

  const handleSubmitRFQ = (rfq: RFQ) => {
    setData((prev) => ({ ...prev, rfqs: [rfq, ...prev.rfqs] }));
    setShowRFQForm(false);
    setRfqPrefill(null);
    // Run AI matching
    const matches = matchSuppliers(rfq);
    setMatchResults(matches);
    toast({ title: "RFQ Sent!", description: `AI matched ${matches.length} suppliers for you.` });
  };

  const handleAwardRFQ = (rfqId: string, responseId: string) => {
    const rfq = data.rfqs.find((r) => r.id === rfqId);
    const response = rfq?.responses.find((r) => r.id === responseId);
    if (!rfq || !response) return;

    const order: Order = {
      id: `ord-${Date.now()}`,
      rfqId,
      productName: rfq.title,
      supplierName: response.supplierName,
      supplierScore: response.supplierScore,
      quantity: rfq.quantity,
      unit: rfq.unit,
      pricePerUnit: response.pricePerUnit,
      totalAmount: response.totalPrice,
      status: "confirmed",
      orderDate: new Date().toISOString().split("T")[0],
      expectedDelivery: rfq.deliveryDate,
    };

    setData((prev) => ({
      ...prev,
      rfqs: prev.rfqs.map((r) => r.id === rfqId ? { ...r, status: "awarded" as const } : r),
      orders: [order, ...prev.orders],
    }));

    toast({ title: "Order Created!", description: `Awarded to ${response.supplierName}` });
    setTab("orders");
  };

  const stats = [
    { label: "Active RFQs", value: data.rfqs.filter((r) => r.status === "sent" || r.status === "responses").length, icon: FileText, color: "text-primary" },
    { label: "Orders", value: data.orders.length, icon: Package, color: "text-secondary" },
    { label: "Responses", value: data.rfqs.reduce((a, r) => a + r.responses.length, 0), icon: TrendingUp, color: "text-success" },
    { label: "Total Spend", value: `₹${(data.orders.reduce((a, o) => a + o.totalAmount, 0) / 1000).toFixed(0)}K`, icon: ShoppingCart, color: "text-warning" },
  ];

  const handleReset = () => {
    localStorage.removeItem("vyapar_buyer");
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card sticky top-0 z-10">
        <div className="container py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-primary flex items-center justify-center cursor-pointer" onClick={() => navigate("/")}>
              <span className="text-primary-foreground font-display font-bold text-sm">V</span>
            </div>
            <div>
              <h1 className="font-display font-bold text-foreground text-lg">Vyapar OS</h1>
              <p className="text-xs text-muted-foreground">Buyer • {data.companyName}</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={handleReset}>
            <LogOut className="h-4 w-4 mr-1" /> Reset Demo
          </Button>
        </div>
      </header>

      <main className="container py-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map((s) => (
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

        {/* Tabs */}
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="w-full justify-start">
            <TabsTrigger value="search" className="gap-1.5">
              <Search className="h-4 w-4" /> Products
            </TabsTrigger>
            <TabsTrigger value="rfqs" className="gap-1.5">
              <FileText className="h-4 w-4" /> RFQs
              {data.rfqs.length > 0 && <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">{data.rfqs.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="orders" className="gap-1.5">
              <Package className="h-4 w-4" /> Orders
              {data.orders.length > 0 && <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">{data.orders.length}</Badge>}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="search" className="mt-6">
            <ProductSearch onCreateRFQ={handleCreateRFQ} />
          </TabsContent>

          <TabsContent value="rfqs" className="mt-6">
            {showRFQForm ? (
              <RFQForm prefill={rfqPrefill} onSubmit={handleSubmitRFQ} onCancel={() => { setShowRFQForm(false); setRfqPrefill(null); }} />
            ) : matchResults ? (
              <SupplierMatchResults matches={matchResults} onClose={() => setMatchResults(null)} />
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-display font-bold text-foreground">Your RFQs</h2>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => {
                      if (data.rfqs.length > 0) {
                        const latest = data.rfqs[0];
                        setMatchResults(matchSuppliers(latest));
                      }
                    }}>
                      <Sparkles className="h-4 w-4 mr-1.5" /> Re-match
                    </Button>
                    <Button onClick={() => setShowRFQForm(true)} size="sm">
                      <FileText className="h-4 w-4 mr-1.5" /> New RFQ
                    </Button>
                  </div>
                </div>
                <RFQList rfqs={data.rfqs} onSelect={() => {}} onAward={handleAwardRFQ} />
              </div>
            )}
          </TabsContent>

          <TabsContent value="orders" className="mt-6">
            <h2 className="text-xl font-display font-bold text-foreground mb-4">Your Orders</h2>
            <OrderList orders={data.orders} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
