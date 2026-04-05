import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { GuaranteeExplainer, SmartDealCard } from "@/components/DealGuarantee";
import { CATEGORY_GROUPS, MOCK_CATALOG, MOCK_SUPPLIERS } from "@/lib/mock-data";
import {
  Shield, Zap, Package, TrendingUp, ArrowRight, Building2, ShoppingCart,
  Search, Cog, Star, Users, CheckCircle2, MapPin, Clock, Phone,
  Building, Truck, Award, IndianRupee, Factory, Verified,
} from "lucide-react";
import { useState } from "react";

const ICON_MAP: Record<string, React.ElementType> = {
  building: Building2, cog: Cog, zap: Zap, flask: Package, package: Package, shield: Shield,
};

const STATS = [
  { value: "2.5L+", label: "Products Listed", icon: Package },
  { value: "45K+", label: "Verified Suppliers", icon: Factory },
  { value: "1.2L+", label: "Active Buyers", icon: Users },
  { value: "₹850Cr+", label: "Monthly GMV", icon: IndianRupee },
];

const FEATURES = [
  { icon: Shield, title: "Escrow-Protected Deals", desc: "Every transaction backed by milestone-based escrow with AI risk scoring and dispute resolution." },
  { icon: Zap, title: "AI-Powered Matching", desc: "Game-theory-driven matching engine finds optimal suppliers using Bayesian trust scoring." },
  { icon: Truck, title: "End-to-End Tracking", desc: "Track orders from PO to delivery with real-time status updates and logistics integration." },
  { icon: Award, title: "Creator Affiliate Network", desc: "1000+ business creators drive demand. Earn commissions by recommending verified suppliers." },
];

const TESTIMONIALS = [
  { name: "Vikram Patel", role: "Purchase Head", company: "Tata AutoComp", text: "Vyapar OS helped us reduce our supplier discovery time by 70%. The trust scores give us confidence in new vendors.", avatar: "VP" },
  { name: "Priya Sharma", role: "Procurement Manager", company: "L&T Construction", text: "We source 40% of our materials through Vyapar OS now. The RFQ system and price comparison tools are excellent.", avatar: "PS" },
  { name: "Rajesh Gupta", role: "Owner", company: "Gupta Fasteners", text: "As a supplier, our inquiries grew 5x after listing on Vyapar OS. The platform's reach across India is impressive.", avatar: "RG" },
];

const RECENT_REQUIREMENTS = [
  { title: "SS304 Hex Bolts M8 - 5000 pcs", buyer: "Automotive Co., Pune", time: "2 hours ago", budget: "₹65,000" },
  { title: "HDPE Granules Blow Grade - 5 Tons", buyer: "Packaging Ltd., Ahmedabad", time: "4 hours ago", budget: "₹5,00,000" },
  { title: "PVC Copper Wire 2.5mm - 10km", buyer: "Electrical Works, Delhi", time: "6 hours ago", budget: "₹2,80,000" },
  { title: "Safety Helmets ISI - 500 pcs", buyer: "Construction Pvt Ltd, Bangalore", time: "8 hours ago", budget: "₹1,05,000" },
  { title: "Hydraulic Cylinders 50mm - 20 units", buyer: "Engineering Co., Chennai", time: "12 hours ago", budget: "₹1,70,000" },
];

export default function Index() {
  const navigate = useNavigate();
  const [heroSearch, setHeroSearch] = useState("");

  const handleHeroSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (heroSearch.trim()) {
      navigate(`/categories?search=${encodeURIComponent(heroSearch.trim())}`);
    } else {
      navigate("/categories");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero */}
      <section className="bg-gradient-to-br from-primary via-primary to-primary/90 text-primary-foreground">
        <div className="container py-16 md:py-24 text-center max-w-4xl">
          <Badge className="bg-secondary text-secondary-foreground mb-6 px-4 py-1.5 text-sm font-medium">
            🇮🇳 India's #1 B2B Commerce Platform
          </Badge>
          <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold leading-tight">
            Find Verified Suppliers &
            <br />
            <span className="text-secondary">Grow Your Business</span>
          </h1>
          <p className="text-lg text-primary-foreground/80 mt-4 max-w-2xl mx-auto">
            Connect with 45,000+ GST-verified manufacturers and suppliers across India.
            Get best prices, compare quotes, and order with confidence.
          </p>

          {/* Hero search */}
          <form onSubmit={handleHeroSearch} className="mt-8 max-w-2xl mx-auto">
            <div className="flex bg-card rounded-xl overflow-hidden shadow-lg">
              <Input
                placeholder="Search for products, materials, or suppliers..."
                value={heroSearch}
                onChange={(e) => setHeroSearch(e.target.value)}
                className="border-0 h-14 text-base text-foreground rounded-none focus-visible:ring-0 px-5"
              />
              <Button type="submit" size="lg" className="rounded-none h-14 px-8 bg-secondary text-secondary-foreground hover:bg-secondary/90">
                <Search className="h-5 w-5 mr-2" /> Search
              </Button>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2 mt-3 text-sm text-primary-foreground/60">
              <span>Popular:</span>
              {["Steel Pipes", "Bearings", "Safety Helmets", "Copper Wire", "Fasteners"].map((term) => (
                <button
                  key={term}
                  onClick={() => { setHeroSearch(term); }}
                  className="hover:text-primary-foreground transition-colors underline underline-offset-2"
                >
                  {term}
                </button>
              ))}
            </div>
          </form>

          {/* Quick actions */}
          <div className="flex flex-wrap gap-3 justify-center mt-8">
            <Button size="lg" variant="secondary" onClick={() => navigate("/categories")}>
              <ShoppingCart className="h-4 w-4 mr-2" /> Browse Products
            </Button>
            <Button size="lg" variant="outline" className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10" onClick={() => navigate("/buyer/dashboard")}>
              Post Your Requirement
            </Button>
            <Button size="lg" variant="outline" className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10" onClick={() => navigate("/supplier/onboarding")}>
              <Building2 className="h-4 w-4 mr-2" /> List Your Business — Free
            </Button>
          </div>
          <div className="flex items-center justify-center gap-6 mt-4 text-sm text-primary-foreground/60">
            <button onClick={() => navigate("/escrow")} className="flex items-center gap-1 hover:text-primary-foreground transition-colors">
              <Shield className="h-3 w-3" /> Escrow Protected
            </button>
            <button onClick={() => navigate("/creator/dashboard")} className="flex items-center gap-1 hover:text-primary-foreground transition-colors">
              <Award className="h-3 w-3" /> Earn as Creator
            </button>
            <button onClick={() => navigate("/pricing")} className="flex items-center gap-1 hover:text-primary-foreground transition-colors">
              <Zap className="h-3 w-3" /> View Plans
            </button>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-b bg-card">
        <div className="container py-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {STATS.map((stat) => (
              <div key={stat.label} className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <stat.icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-xl font-bold text-foreground">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Category Preview */}
      <section className="container py-12">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Browse by Category</h2>
            <p className="text-sm text-muted-foreground mt-1">Explore products across major industries</p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => navigate("/categories")}>
            View All <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {CATEGORY_GROUPS.slice(0, 6).map((group) => {
            const Icon = ICON_MAP[group.icon] || Package;
            return (
              <Card
                key={group.name}
                className="hover:shadow-lg transition-all cursor-pointer group overflow-hidden"
                onClick={() => navigate(`/categories?group=${group.name}`)}
              >
                <div className="h-24 relative overflow-hidden">
                  <img
                    src={group.heroImage}
                    alt={group.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-foreground/60 to-transparent" />
                  <div className="absolute bottom-2 left-2">
                    <div className="h-7 w-7 rounded-md bg-card/90 flex items-center justify-center">
                      <Icon className="h-3.5 w-3.5 text-primary" />
                    </div>
                  </div>
                </div>
                <CardContent className="p-3">
                  <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors text-xs leading-tight">
                    {group.name}
                  </h3>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {group.categories.reduce((a, c) => a + c.productCount, 0).toLocaleString()} products
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Top Suppliers */}
      <section className="bg-muted/50 py-12">
        <div className="container">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-foreground">Top Verified Suppliers</h2>
              <p className="text-sm text-muted-foreground mt-1">Highest rated suppliers on the platform</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => navigate("/categories")}>
              View All <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {MOCK_SUPPLIERS.slice(0, 3).map((supplier) => (
              <Card
                key={supplier.id}
                className="hover:shadow-lg transition-all cursor-pointer group"
                onClick={() => navigate(`/supplier/${supplier.id}`)}
              >
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                        <Building className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground text-sm group-hover:text-primary transition-colors">
                          {supplier.name}
                        </h3>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <MapPin className="h-3 w-3" />
                          {supplier.city}, {supplier.state}
                        </div>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-[10px] shrink-0">
                      <Verified className="h-3 w-3 mr-0.5 text-success" /> GST Verified
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{supplier.description}</p>
                  <div className="flex items-center gap-3 text-xs">
                    <div className="flex items-center gap-1">
                      <Star className="h-3 w-3 fill-current text-yellow-500" />
                      <span className="font-semibold text-foreground">{supplier.trustScore.overall}/1000</span>
                    </div>
                    <span className="text-muted-foreground">•</span>
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Clock className="h-3 w-3" /> {supplier.responseTime}
                    </div>
                    <span className="text-muted-foreground">•</span>
                    <span className="text-muted-foreground">{supplier.responseRate}% response</span>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-3">
                    {supplier.certifications.slice(0, 3).map((cert) => (
                      <Badge key={cert} variant="secondary" className="text-[9px] py-0">
                        {cert}
                      </Badge>
                    ))}
                  </div>
                  <div className="flex gap-2 mt-4">
                    <Button size="sm" className="flex-1 h-8 text-xs" onClick={(e) => { e.stopPropagation(); navigate(`/messages?supplier=${supplier.id}`); }}>
                      <Phone className="h-3 w-3 mr-1" /> Contact
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1 h-8 text-xs" onClick={(e) => { e.stopPropagation(); navigate(`/supplier/${supplier.id}`); }}>
                      View Profile
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Recent Requirements - Live Feed */}
      <section className="container py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recent buyer requirements */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="h-2 w-2 rounded-full bg-success animate-pulse" />
              <h2 className="text-xl font-bold text-foreground">Live Buyer Requirements</h2>
            </div>
            <div className="space-y-2">
              {RECENT_REQUIREMENTS.map((req, idx) => (
                <Card key={idx} className="hover:shadow-sm transition-shadow cursor-pointer" onClick={() => navigate("/supplier/onboarding")}>
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-foreground text-sm truncate">{req.title}</h4>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                        <span>{req.buyer}</span>
                        <span>•</span>
                        <span>{req.time}</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0 ml-3">
                      <p className="font-semibold text-foreground text-sm">{req.budget}</p>
                      <Button size="sm" variant="outline" className="h-6 text-[10px] mt-1 px-2">
                        Send Quote
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Trending products */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="h-5 w-5 text-destructive" />
              <h2 className="text-xl font-bold text-foreground">Trending Products</h2>
            </div>
            <div className="space-y-2">
              {MOCK_CATALOG.slice(0, 5).map((product, idx) => (
                <Card key={product.id} className="hover:shadow-sm transition-shadow cursor-pointer" onClick={() => navigate(`/product/${product.id}`)}>
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 text-sm font-bold text-primary">
                      #{idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-foreground text-sm truncate">{product.name}</h4>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                        <span>{product.supplierName}</span>
                        <span>•</span>
                        <span className="flex items-center gap-0.5">
                          <Star className="h-3 w-3 fill-current text-yellow-500" />
                          {product.supplierScore}
                        </span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-semibold text-foreground text-sm">₹{product.pricePerUnit}/{product.unit}</p>
                      {product.inStock ? (
                        <Badge variant="outline" className="text-[9px] text-success border-success/30">In Stock</Badge>
                      ) : (
                        <Badge variant="outline" className="text-[9px] text-muted-foreground">Made to Order</Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Vyapar Guarantee Section */}
      <section className="container py-12">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3">
            <GuaranteeExplainer />
          </div>
          <div className="lg:col-span-2">
            <SmartDealCard
              dealValue={170000}
              supplierName="Precision Hydraulics, Chennai"
              productName="Hydraulic Cylinders 50mm × 20 units"
              riskScore={92}
              trustScore={845}
            />
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="bg-muted/50 py-12">
        <div className="container">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-foreground">Why 45,000+ Businesses Trust Vyapar OS</h2>
            <p className="text-sm text-muted-foreground mt-2">Built for India's manufacturing and trading ecosystem</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {FEATURES.map((f) => (
              <Card key={f.title} className="hover:shadow-md transition-shadow text-center">
                <CardContent className="p-6">
                  <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <f.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-2">{f.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="container py-12">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-foreground">Trusted by Leading Businesses</h2>
          <p className="text-sm text-muted-foreground mt-2">Hear from our buyers and suppliers across India</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {TESTIMONIALS.map((t) => (
            <Card key={t.name} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center gap-1 mb-3">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-current text-yellow-500" />
                  ))}
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed italic mb-4">"{t.text}"</p>
                <div className="flex items-center gap-3 pt-3 border-t border-border">
                  <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center">
                    <span className="text-primary-foreground font-semibold text-xs">{t.avatar}</span>
                  </div>
                  <div>
                    <p className="font-semibold text-foreground text-sm">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.role}, {t.company}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Creator CTA */}
      <section className="bg-gradient-to-r from-secondary/10 via-background to-secondary/10 py-12">
        <div className="container">
          <div className="flex flex-col md:flex-row items-center gap-8 max-w-4xl mx-auto">
            <div className="flex-1">
              <Badge className="bg-secondary text-secondary-foreground mb-3">New: Creator Program</Badge>
              <h2 className="text-2xl font-bold text-foreground mb-2">Earn by Recommending Suppliers</h2>
              <p className="text-sm text-muted-foreground mb-4">
                Join 1000+ business creators earning 3-5% commission on every deal.
                Create content, generate affiliate links, and climb the leaderboard.
              </p>
              <div className="flex gap-3">
                <Button onClick={() => navigate("/creator/dashboard")}>
                  <Award className="h-4 w-4 mr-2" /> Join Creator Program
                </Button>
                <Button variant="outline" onClick={() => navigate("/pricing")}>
                  View Plans
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Avg. Monthly Earning", value: "₹42K" },
                { label: "Active Creators", value: "1,200+" },
                { label: "Conversion Rate", value: "26%" },
                { label: "Top Creator Earned", value: "₹8.9L" },
              ].map(s => (
                <Card key={s.label} className="text-center">
                  <CardContent className="p-4">
                    <p className="text-lg font-bold text-foreground">{s.value}</p>
                    <p className="text-[10px] text-muted-foreground">{s.label}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-primary text-primary-foreground py-16">
        <div className="container text-center max-w-2xl">
          <h2 className="text-3xl font-bold">Ready to Grow Your Business?</h2>
          <p className="text-primary-foreground/80 mt-3 text-lg">
            Join 45,000+ verified businesses on India's fastest growing B2B platform
          </p>
          <div className="flex flex-wrap gap-3 justify-center mt-8">
            <Button size="lg" variant="secondary" onClick={() => navigate("/categories")}>
              <Search className="h-4 w-4 mr-2" /> Start Buying
            </Button>
            <Button size="lg" variant="outline" className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10" onClick={() => navigate("/supplier/onboarding")}>
              <Building2 className="h-4 w-4 mr-2" /> Start Selling — Free
            </Button>
            <Button size="lg" variant="outline" className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10" onClick={() => navigate("/creator/dashboard")}>
              <Award className="h-4 w-4 mr-2" /> Earn as Creator
            </Button>
          </div>
          <div className="flex items-center justify-center gap-6 mt-6 text-sm text-primary-foreground/60">
            <span className="flex items-center gap-1"><CheckCircle2 className="h-4 w-4" /> Escrow Protected</span>
            <span className="flex items-center gap-1"><CheckCircle2 className="h-4 w-4" /> AI Trust Scoring</span>
            <span className="flex items-center gap-1"><CheckCircle2 className="h-4 w-4" /> GST Verified</span>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
