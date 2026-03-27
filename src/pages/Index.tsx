import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Shield, Zap, Package, TrendingUp, ArrowRight, Building2, ShoppingCart,
} from "lucide-react";

const FEATURES = [
  { icon: Shield, title: "GST Verified Trust", desc: "Every supplier verified against government records with dynamic trust scoring" },
  { icon: Zap, title: "AI-Powered Matching", desc: "Smart procurement engine that matches buyers with the right suppliers" },
  { icon: Package, title: "End-to-End Workflow", desc: "From discovery to payment — manage the entire supply chain in one place" },
  { icon: TrendingUp, title: "Dynamic Scoring", desc: "0–1000 trust score based on delivery, quality, and transaction performance" },
];

export default function Index() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container flex items-center justify-between py-4">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-display font-bold text-sm">V</span>
            </div>
            <span className="font-display font-bold text-foreground text-xl">Vyapar OS</span>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => navigate("/supplier/onboarding")}>
              <Building2 className="h-4 w-4 mr-1" /> I'm a Supplier
            </Button>
            <Button variant="outline" onClick={() => navigate("/buyer/dashboard")}>
              <ShoppingCart className="h-4 w-4 mr-1" /> I'm a Buyer
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="container py-20 md:py-32 text-center max-w-3xl">
        <Badge variant="secondary" className="mb-6 px-4 py-1.5 text-sm font-medium">
          B2B Commerce Operating System
        </Badge>
        <h1 className="text-4xl md:text-6xl font-display font-bold text-foreground leading-tight">
          The <span className="text-secondary">trust layer</span> for
          <br />B2B commerce
        </h1>
        <p className="text-lg text-muted-foreground mt-6 max-w-xl mx-auto">
          Discover verified suppliers, negotiate with AI, transact securely, and build your business reputation — all in one platform.
        </p>
        <div className="flex gap-3 justify-center mt-8">
          <Button size="lg" onClick={() => navigate("/supplier/onboarding")}>
            Start as Supplier <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
          <Button size="lg" variant="outline" onClick={() => navigate("/buyer/dashboard")}>
            Start as Buyer <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </section>

      {/* Features */}
      <section className="container pb-20">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl mx-auto">
          {FEATURES.map((f) => (
            <Card key={f.title} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6 flex items-start gap-4">
                <div className="h-11 w-11 rounded-lg bg-secondary/10 flex items-center justify-center shrink-0">
                  <f.icon className="h-5 w-5 text-secondary" />
                </div>
                <div>
                  <h3 className="font-display font-semibold text-foreground">{f.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{f.desc}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-6">
        <div className="container text-center text-sm text-muted-foreground">
          Vyapar OS — Built for India's SME ecosystem
        </div>
      </footer>
    </div>
  );
}
