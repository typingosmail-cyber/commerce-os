import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";
import { Check, X, Zap, Crown, Building2, Rocket, Shield, Star, TrendingUp, Users } from "lucide-react";
import { useState } from "react";
import { AuthModal } from "@/components/AuthModal";

const PLANS = [
  {
    id: "free" as const,
    name: "Starter",
    price: 0,
    period: "Forever Free",
    icon: Zap,
    description: "For businesses exploring B2B sourcing",
    highlight: false,
    features: [
      { text: "10 lead credits/month", included: true },
      { text: "Basic supplier search", included: true },
      { text: "Post 3 RFQs/month", included: true },
      { text: "Standard trust badge", included: true },
      { text: "Community support", included: true },
      { text: "AI supplier matching", included: false },
      { text: "Escrow protection", included: false },
      { text: "Priority ranking", included: false },
      { text: "Analytics dashboard", included: false },
      { text: "API access", included: false },
    ],
  },
  {
    id: "basic" as const,
    name: "Professional",
    price: 2999,
    period: "/month",
    icon: Star,
    description: "For growing businesses with regular sourcing needs",
    highlight: false,
    features: [
      { text: "50 lead credits/month", included: true },
      { text: "Advanced supplier search", included: true },
      { text: "Unlimited RFQs", included: true },
      { text: "Verified trust badge", included: true },
      { text: "Email + chat support", included: true },
      { text: "AI supplier matching", included: true },
      { text: "Basic escrow (2 milestones)", included: true },
      { text: "Priority ranking", included: false },
      { text: "Analytics dashboard", included: false },
      { text: "API access", included: false },
    ],
  },
  {
    id: "premium" as const,
    name: "Business",
    price: 9999,
    period: "/month",
    icon: Crown,
    description: "For enterprises with high-volume procurement",
    highlight: true,
    features: [
      { text: "200 lead credits/month", included: true },
      { text: "Priority supplier search", included: true },
      { text: "Unlimited RFQs + auto-bid", included: true },
      { text: "Premium trust badge", included: true },
      { text: "Dedicated account manager", included: true },
      { text: "AI matching + negotiation", included: true },
      { text: "Full escrow (3 milestones)", included: true },
      { text: "Top-page priority ranking", included: true },
      { text: "Full analytics + insights", included: true },
      { text: "API access", included: false },
    ],
  },
  {
    id: "enterprise" as const,
    name: "Enterprise",
    price: 49999,
    period: "/month",
    icon: Building2,
    description: "Custom infrastructure for large organizations",
    highlight: false,
    features: [
      { text: "Unlimited lead credits", included: true },
      { text: "Dedicated procurement portal", included: true },
      { text: "Custom RFQ workflows", included: true },
      { text: "Elite trust badge + verification", included: true },
      { text: "24/7 priority support", included: true },
      { text: "AI agent: auto-source + negotiate", included: true },
      { text: "Insurance-backed escrow", included: true },
      { text: "Featured listings", included: true },
      { text: "Enterprise analytics + reports", included: true },
      { text: "Full API + ERP integration", included: true },
    ],
  },
];

const VALUE_PROPS = [
  { icon: Shield, title: "Transaction Protection", desc: "Escrow-backed payments with milestone releases" },
  { icon: TrendingUp, title: "AI Demand Prediction", desc: "Know what buyers need before they ask" },
  { icon: Users, title: "Creator Network", desc: "Get leads from 1000+ business creators" },
  { icon: Rocket, title: "Zero Leakage", desc: "Workflow tools that keep deals on-platform" },
];

export default function Pricing() {
  const { user, isLoggedIn, updatePlan } = useAuth();
  const { toast } = useToast();
  const [showAuth, setShowAuth] = useState(false);

  const handleSelectPlan = (planId: typeof PLANS[number]["id"]) => {
    if (!isLoggedIn) {
      setShowAuth(true);
      return;
    }
    updatePlan(planId);
    toast({ title: "Plan updated!", description: `You're now on the ${PLANS.find(p => p.id === planId)?.name} plan.` });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      {/* Hero */}
      <section className="bg-gradient-to-br from-primary via-primary to-primary/90 text-primary-foreground py-16">
        <div className="container text-center max-w-3xl">
          <Badge className="bg-secondary text-secondary-foreground mb-4">Pricing Plans</Badge>
          <h1 className="text-3xl md:text-5xl font-bold">
            Invest in Growth,<br />
            <span className="text-secondary">Not Just Leads</span>
          </h1>
          <p className="text-primary-foreground/80 mt-4 text-lg">
            From free lead access to full enterprise procurement infrastructure.
            Pay only for the value you capture.
          </p>
        </div>
      </section>

      {/* Plans Grid */}
      <section className="container py-12 -mt-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {PLANS.map((plan) => (
            <Card
              key={plan.id}
              className={`relative overflow-hidden transition-all hover:shadow-lg ${
                plan.highlight ? "border-2 border-secondary ring-2 ring-secondary/20 scale-[1.02]" : ""
              }`}
            >
              {plan.highlight && (
                <div className="absolute top-0 right-0 bg-secondary text-secondary-foreground text-[10px] font-bold px-3 py-1 rounded-bl-lg">
                  MOST POPULAR
                </div>
              )}
              <CardHeader className="pb-2">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
                  <plan.icon className="h-5 w-5 text-primary" />
                </div>
                <CardTitle className="text-lg">{plan.name}</CardTitle>
                <p className="text-xs text-muted-foreground">{plan.description}</p>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <span className="text-3xl font-bold text-foreground">
                    {plan.price === 0 ? "Free" : `₹${plan.price.toLocaleString()}`}
                  </span>
                  {plan.price > 0 && <span className="text-sm text-muted-foreground">{plan.period}</span>}
                </div>

                <ul className="space-y-2 mb-6">
                  {plan.features.map((f) => (
                    <li key={f.text} className="flex items-start gap-2 text-xs">
                      {f.included ? (
                        <Check className="h-3.5 w-3.5 text-success shrink-0 mt-0.5" />
                      ) : (
                        <X className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0 mt-0.5" />
                      )}
                      <span className={f.included ? "text-foreground" : "text-muted-foreground/50"}>
                        {f.text}
                      </span>
                    </li>
                  ))}
                </ul>

                <Button
                  className="w-full"
                  variant={plan.highlight ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleSelectPlan(plan.id)}
                  disabled={user?.plan === plan.id}
                >
                  {user?.plan === plan.id ? "Current Plan" : plan.price === 0 ? "Get Started" : "Upgrade Now"}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Value props */}
      <section className="bg-muted/50 py-12">
        <div className="container">
          <h2 className="text-2xl font-bold text-foreground text-center mb-8">Every Plan Includes</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {VALUE_PROPS.map((v) => (
              <Card key={v.title}>
                <CardContent className="p-5 text-center">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mx-auto mb-3">
                    <v.icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="font-semibold text-foreground text-sm mb-1">{v.title}</h3>
                  <p className="text-xs text-muted-foreground">{v.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Revenue model transparency */}
      <section className="container py-12">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-foreground">How We Earn (Transparency)</h2>
          <p className="text-sm text-muted-foreground mt-2">We believe in transparent, value-aligned monetization</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto">
          {[
            { title: "Lead Credits", desc: "Suppliers pay ₹50–₹5000 per high-intent buyer lead depending on industry & deal size", pct: "35%" },
            { title: "Subscription Revenue", desc: "Monthly/annual plans for advanced features, analytics, and priority access", pct: "30%" },
            { title: "Transaction Fee", desc: "1-3% platform fee on escrow-protected transactions for trust & dispute resolution", pct: "25%" },
          ].map((r) => (
            <Card key={r.title}>
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-foreground text-sm">{r.title}</h3>
                  <Badge variant="secondary" className="text-xs">{r.pct} of revenue</Badge>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{r.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <Footer />
      <AuthModal open={showAuth} onClose={() => setShowAuth(false)} />
    </div>
  );
}
