import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { MOCK_CATALOG, MOCK_SUPPLIERS } from "@/lib/mock-data";
import { generatePriceHistory } from "@/lib/price-history";
import { toggleWishlist, isInWishlist, toggleCompare, isInCompare } from "@/lib/wishlist";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar,
} from "recharts";
import {
  Shield, Star, MapPin, Clock, Package, Heart, GitCompareArrows,
  TrendingUp, TrendingDown, Phone, MessageCircle, ArrowLeft,
  CheckCircle2, AlertCircle, Truck, Award, Share2, Building,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const product = MOCK_CATALOG.find((p) => p.id === id);
  const [wishlisted, setWishlisted] = useState(false);
  const [comparing, setComparing] = useState(false);

  useEffect(() => {
    if (product) {
      setWishlisted(isInWishlist(product.id));
      setComparing(isInCompare(product.id));
    }
  }, [product]);

  if (!product) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <main className="container py-16 text-center flex-1">
          <Package className="h-16 w-16 mx-auto text-muted-foreground/40 mb-4" />
          <h1 className="text-2xl font-bold text-foreground">Product not found</h1>
          <Button className="mt-4" onClick={() => navigate("/categories")}>Browse Products</Button>
        </main>
        <Footer />
      </div>
    );
  }

  const supplier = MOCK_SUPPLIERS.find((s) => s.id === product.supplierId);
  const priceHistory = generatePriceHistory(product.pricePerUnit);
  const relatedProducts = MOCK_CATALOG.filter(
    (p) => p.id !== product.id && (p.category === product.category || p.supplierId === product.supplierId)
  ).slice(0, 4);

  const priceChange = priceHistory.length >= 2
    ? ((priceHistory[priceHistory.length - 1].price - priceHistory[priceHistory.length - 2].price) / priceHistory[priceHistory.length - 2].price * 100)
    : 0;

  const handleWishlist = () => {
    toggleWishlist(product.id);
    setWishlisted(!wishlisted);
    toast({ title: wishlisted ? "Removed from wishlist" : "Added to wishlist" });
  };

  const handleCompare = () => {
    const list = toggleCompare(product.id);
    setComparing(!comparing);
    if (!comparing) {
      toast({ title: "Added to compare", description: `${list.length}/4 products selected` });
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="container py-6 space-y-6 flex-1">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <button onClick={() => navigate("/categories")} className="hover:text-foreground transition-colors">Categories</button>
          <span>/</span>
          <button onClick={() => navigate(`/categories?group=${product.category}`)} className="hover:text-foreground transition-colors">{product.category}</button>
          <span>/</span>
          <span className="text-foreground font-medium truncate">{product.name}</span>
        </div>

        {/* Main product section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Product Info */}
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <Badge variant="outline" className="mb-2">{product.category}</Badge>
                    <h1 className="text-2xl font-bold text-foreground">{product.name}</h1>
                    <p className="text-muted-foreground mt-2">{product.description}</p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button variant="ghost" size="icon" onClick={handleWishlist}>
                      <Heart className={`h-5 w-5 ${wishlisted ? "fill-current text-destructive" : "text-muted-foreground"}`} />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={handleCompare}>
                      <GitCompareArrows className={`h-5 w-5 ${comparing ? "text-primary" : "text-muted-foreground"}`} />
                    </Button>
                    <Button variant="ghost" size="icon">
                      <Share2 className="h-5 w-5 text-muted-foreground" />
                    </Button>
                  </div>
                </div>

                {/* Price & Meta */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted/50 rounded-xl">
                  <div>
                    <p className="text-xs text-muted-foreground">Price</p>
                    <p className="text-2xl font-bold text-foreground">₹{product.pricePerUnit}</p>
                    <p className="text-xs text-muted-foreground">per {product.unit}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">MOQ</p>
                    <p className="text-xl font-bold text-foreground">{product.minOrderQty}</p>
                    <p className="text-xs text-muted-foreground">{product.unit}s</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Lead Time</p>
                    <p className="text-xl font-bold text-foreground">{product.leadTimeDays}</p>
                    <p className="text-xs text-muted-foreground">days</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Availability</p>
                    {product.inStock ? (
                      <div className="flex items-center gap-1 mt-1">
                        <CheckCircle2 className="h-5 w-5 text-success" />
                        <span className="font-semibold text-success">In Stock</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 mt-1">
                        <AlertCircle className="h-5 w-5 text-warning" />
                        <span className="font-semibold text-warning">Made to Order</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Specifications */}
                <div className="mt-6">
                  <h3 className="font-semibold text-foreground mb-3">Specifications</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {product.specifications.split(",").map((spec, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm p-2 bg-muted/30 rounded-lg">
                        <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                        <span className="text-foreground">{spec.trim()}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-3 mt-6">
                  <Button size="lg" className="flex-1" onClick={() => navigate("/buyer/dashboard")}>
                    Get Best Price
                  </Button>
                  <Button size="lg" variant="outline" className="flex-1" onClick={() => navigate("/buyer/dashboard")}>
                    Request Quote
                  </Button>
                  <Button size="lg" variant="secondary" onClick={() => navigate(`/messages?supplier=${product.supplierId}`)}>
                    <MessageCircle className="h-4 w-4 mr-2" /> Chat
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Price History Chart */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    Price Trend (12 Months)
                  </CardTitle>
                  <Badge variant={priceChange >= 0 ? "destructive" : "secondary"} className="text-xs">
                    {priceChange >= 0 ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                    {Math.abs(priceChange).toFixed(1)}% vs last month
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={priceHistory}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                    <Tooltip
                      contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                      labelStyle={{ color: "hsl(var(--foreground))" }}
                    />
                    <Line type="monotone" dataKey="price" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Volume Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Monthly Trade Volume</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={150}>
                  <BarChart data={priceHistory}>
                    <XAxis dataKey="month" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                    <Tooltip
                      contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                    />
                    <Bar dataKey="volume" fill="hsl(var(--secondary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Supplier Card + Related */}
          <div className="space-y-4">
            {supplier && (
              <Card className="border-primary/20">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Building className="h-4 w-4 text-primary" /> Supplier
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-foreground">{supplier.name}</h3>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                      <MapPin className="h-3 w-3" /> {supplier.city}, {supplier.state}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1">
                      <Shield className="h-4 w-4 text-success" />
                      <span className="text-sm font-semibold text-foreground">{supplier.trustScore.overall}</span>
                      <span className="text-xs text-muted-foreground">/1000</span>
                    </div>
                    <Badge variant="outline" className="text-[10px]">
                      <CheckCircle2 className="h-3 w-3 mr-0.5 text-success" /> GST Verified
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2 bg-muted/50 rounded-lg">
                      <p className="text-muted-foreground">Response Rate</p>
                      <p className="font-semibold text-foreground">{supplier.responseRate}%</p>
                    </div>
                    <div className="p-2 bg-muted/50 rounded-lg">
                      <p className="text-muted-foreground">Response Time</p>
                      <p className="font-semibold text-foreground">{supplier.responseTime}</p>
                    </div>
                    <div className="p-2 bg-muted/50 rounded-lg">
                      <p className="text-muted-foreground">Since</p>
                      <p className="font-semibold text-foreground">{supplier.yearEstablished}</p>
                    </div>
                    <div className="p-2 bg-muted/50 rounded-lg">
                      <p className="text-muted-foreground">Employees</p>
                      <p className="font-semibold text-foreground">{supplier.employeeCount}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1">
                    {supplier.certifications.map((c) => (
                      <Badge key={c} variant="secondary" className="text-[9px]">{c}</Badge>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <Button size="sm" className="flex-1" onClick={() => navigate(`/messages?supplier=${supplier.id}`)}>
                      <Phone className="h-3 w-3 mr-1" /> Contact
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => navigate(`/supplier/${supplier.id}`)}>
                      View Profile
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Bulk Calculator */}
            <BulkCalculator price={product.pricePerUnit} unit={product.unit} moq={product.minOrderQty} />

            {/* Related Products */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Related Products</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {relatedProducts.map((rp) => (
                  <div
                    key={rp.id}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => navigate(`/product/${rp.id}`)}
                  >
                    <div className="h-10 w-10 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                      <Package className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{rp.name}</p>
                      <p className="text-xs text-muted-foreground">{rp.supplierName}</p>
                    </div>
                    <span className="text-sm font-semibold text-foreground shrink-0">₹{rp.pricePerUnit}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

function BulkCalculator({ price, unit, moq }: { price: number; unit: string; moq: number }) {
  const [qty, setQty] = useState(moq);

  // Simulated bulk discount tiers
  const getDiscount = (q: number) => {
    if (q >= moq * 10) return 0.12;
    if (q >= moq * 5) return 0.08;
    if (q >= moq * 2) return 0.05;
    return 0;
  };

  const discount = getDiscount(qty);
  const discountedPrice = Math.round(price * (1 - discount) * 100) / 100;
  const total = Math.round(discountedPrice * qty);

  return (
    <Card className="bg-secondary/5 border-secondary/20">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Award className="h-4 w-4 text-secondary" /> Bulk Price Calculator
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <label className="text-xs text-muted-foreground">Quantity ({unit}s)</label>
          <input
            type="number"
            value={qty}
            onChange={(e) => setQty(Math.max(moq, Number(e.target.value)))}
            min={moq}
            className="w-full mt-1 px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm"
          />
        </div>
        {discount > 0 && (
          <Badge className="bg-success/10 text-success border-success/20">
            {(discount * 100).toFixed(0)}% bulk discount applied
          </Badge>
        )}
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">Unit Price</p>
            <p className="font-semibold text-foreground">₹{discountedPrice}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Total</p>
            <p className="font-bold text-foreground text-lg">₹{total.toLocaleString()}</p>
          </div>
        </div>
        <div className="text-[10px] text-muted-foreground space-y-0.5">
          <p>• {moq * 2}+ {unit}s → 5% off</p>
          <p>• {moq * 5}+ {unit}s → 8% off</p>
          <p>• {moq * 10}+ {unit}s → 12% off</p>
        </div>
      </CardContent>
    </Card>
  );
}
