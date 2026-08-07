import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Brain, Sparkles, Upload, Trash2, ArrowRight, Bot, ShieldCheck, Coins, Truck, FileText, Activity, Zap, Mic } from "lucide-react";
import {
  loadDeals, deleteDeal, extractIntent, createDealFromSpec, upsertDeal,
  type TradeDeal, type RiskProfile, type DealSpec,
} from "@/lib/trade-os";
import { toast } from "sonner";

const SAMPLE_PROMPTS = [
  "Need 5000 M8 hex bolts, grade 8.8, zinc plated. Target ₹4.20/pc, delivery in 18 days, ISO 9001 supplier.",
  "Looking for 10000 SS304 M6×25mm Allen bolts for auto assembly line. BIS certified, deliver Mumbai in 3 weeks.",
  "Procure 2 tons of M12 stud bolts DIN 976, grade 10.9, hot-dip galvanized. Best price, lowest risk.",
];

const PIPELINE_PREVIEW = [
  { icon: Brain, label: "Understanding", desc: "Normalize spec" },
  { icon: Bot, label: "Matching", desc: "Semantic + graph" },
  { icon: ShieldCheck, label: "Trust", desc: "KYC + reputation" },
  { icon: Activity, label: "Pricing", desc: "Fair market" },
  { icon: Sparkles, label: "Negotiation", desc: "Multi-round" },
  { icon: Zap, label: "Risk + Sim", desc: "Scenarios" },
  { icon: FileText, label: "Contract", desc: "Enforceable" },
  { icon: Coins, label: "Escrow", desc: "Milestone release" },
  { icon: Truck, label: "Logistics", desc: "Route + ETA" },
];

type AIIntent = {
  product?: string;
  specifications?: Record<string, string>;
  quantity?: number;
  unit?: string;
  target_price?: number;
  delivery_deadline?: string;
  compliance_requirements?: string[];
  risk_profile?: RiskProfile;
  category?: string;
  confidence?: number;
  clarifications?: string[];
  optimizations?: string[];
};

export default function TradeOS() {
  const navigate = useNavigate();
  const [deals, setDeals] = useState<TradeDeal[]>([]);
  const [text, setText] = useState(SAMPLE_PROMPTS[0]);
  const [quantity, setQuantity] = useState(5000);
  const [unit, setUnit] = useState("Piece");
  const [targetPrice, setTargetPrice] = useState(4.2);
  const [deadline, setDeadline] = useState(new Date(Date.now() + 21 * 86400000).toISOString().slice(0, 10));
  const [riskProfile, setRiskProfile] = useState<RiskProfile>("balanced");
  const [attachments, setAttachments] = useState<string[]>([]);
  const [ai, setAi] = useState<AIIntent | null>(null);
  const [parsing, setParsing] = useState(false);

  useEffect(() => { setDeals(loadDeals()); }, []);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).map((f) => f.name);
    setAttachments((p) => [...p, ...files]);
    if (files.length) toast.success(`${files.length} attachment(s) registered (mock parse).`);
  };

  const parseWithAI = async () => {
    if (!text.trim()) { toast.error("Enter buyer intent first."); return; }
    setParsing(true);
    setAi(null);
    try {
      const out = await generateJSON<AIIntent>(
        "deal_intent",
        `Buyer brief: ${text}\nAttachments: ${attachments.join(", ") || "none"}\nCurrent form values — quantity: ${quantity} ${unit}, target ₹${targetPrice}/unit, deadline ${deadline}, risk ${riskProfile}.`,
      );
      setAi(out);
      if (out.quantity && out.quantity > 0) setQuantity(out.quantity);
      if (out.unit) setUnit(out.unit);
      if (out.target_price && out.target_price > 0) setTargetPrice(out.target_price);
      if (out.delivery_deadline && /^\d{4}-\d{2}-\d{2}$/.test(out.delivery_deadline)) setDeadline(out.delivery_deadline);
      if (out.risk_profile) setRiskProfile(out.risk_profile);
      toast.success("Intent normalized by the Understanding Agent.");
    } catch (e) {
      toast.error((e as Error).message || "AI parsing failed.");
    } finally {
      setParsing(false);
    }
  };

  const createIntent = () => {
    if (!text.trim()) { toast.error("Enter buyer intent or upload BOM."); return; }
    const spec: DealSpec = extractIntent({
      text, quantity, unit, targetPrice, deadline, riskProfile, attachments,
    });
    if (ai) {
      if (ai.product) spec.product = ai.product;
      if (ai.specifications && Object.keys(ai.specifications).length) {
        spec.specifications = { ...spec.specifications, ...ai.specifications };
      }
      if (ai.compliance_requirements?.length) {
        spec.compliance = Array.from(new Set([...spec.compliance, ...ai.compliance_requirements]));
      }
      if (ai.category) spec.inferredCategory = ai.category;
      if (typeof ai.confidence === "number") spec.confidence = Math.min(1, Math.max(0, ai.confidence));
    }
    const deal = createDealFromSpec(spec);
    upsertDeal(deal);
    toast.success("Intent captured. Launching Trade OS console…");
    navigate(`/trade-os/${deal.id}`);
  };

  const remove = (id: string) => {
    deleteDeal(id);
    setDeals(loadDeals());
    toast.success("Deal removed.");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-8 max-w-7xl">
        {/* Hero */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <Brain className="w-4 h-4" /> Autonomous Trade OS
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-2 font-display">
            Convert intent into executed trade — autonomously
          </h1>
          <p className="text-muted-foreground max-w-3xl">
            Drop in a natural-language brief, BOM, or specification. Eight agents collaborate to match suppliers,
            verify trust, negotiate, simulate scenarios, draft contracts, fund escrow, and ship — with full audit trail.
          </p>
        </div>

        {/* Pipeline preview */}
        <Card className="mb-8 border-primary/20 bg-gradient-to-br from-primary/5 to-secondary/5">
          <CardContent className="pt-6">
            <div className="grid grid-cols-3 md:grid-cols-9 gap-3">
              {PIPELINE_PREVIEW.map((s, i) => (
                <div key={s.label} className="text-center">
                  <div className="w-10 h-10 rounded-lg bg-background border mx-auto flex items-center justify-center mb-1.5 shadow-sm">
                    <s.icon className="w-5 h-5 text-primary" />
                  </div>
                  <div className="text-xs font-semibold">{s.label}</div>
                  <div className="text-[10px] text-muted-foreground">{s.desc}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="new" className="space-y-6">
          <TabsList>
            <TabsTrigger value="new">New deal</TabsTrigger>
            <TabsTrigger value="active">Active deals ({deals.length})</TabsTrigger>
          </TabsList>

          {/* Intent capture */}
          <TabsContent value="new">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-secondary" /> Capture buyer intent
                </CardTitle>
                <CardDescription>Natural language, voice transcript, or BOM upload — all converge into a Deal Specification.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Label>Describe what you need</Label>
                  <Textarea
                    rows={4}
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="e.g. 5000 M8 hex bolts, grade 8.8, zinc plated, delivery in 18 days…"
                    className="mt-1.5"
                  />
                  <div className="flex flex-wrap gap-2 mt-2">
                    {SAMPLE_PROMPTS.map((p, i) => (
                      <Button key={i} size="sm" variant="outline" onClick={() => setText(p)}>
                        Sample {i + 1}
                      </Button>
                    ))}
                    <Button size="sm" variant="ghost" onClick={() => toast.info("Voice capture (mock) — transcript inserted.")}>
                      <Mic className="w-3.5 h-3.5 mr-1" /> Voice
                    </Button>
                    <label className="inline-flex">
                      <Button asChild size="sm" variant="ghost">
                        <span><Upload className="w-3.5 h-3.5 mr-1" /> Upload BOM / spec</span>
                      </Button>
                      <input type="file" multiple className="hidden" onChange={handleFile} />
                    </label>
                  </div>
                  {attachments.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {attachments.map((a, i) => (
                        <Badge key={i} variant="outline" className="text-xs">{a}</Badge>
                      ))}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <Label>Quantity</Label>
                    <Input type="number" value={quantity} onChange={(e) => setQuantity(+e.target.value)} className="mt-1.5" />
                  </div>
                  <div>
                    <Label>Unit</Label>
                    <Select value={unit} onValueChange={setUnit}>
                      <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {["Piece", "Kg", "Ton", "Box", "Set", "Meter"].map((u) => (
                          <SelectItem key={u} value={u}>{u}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Target ₹/unit</Label>
                    <Input type="number" step="0.01" value={targetPrice} onChange={(e) => setTargetPrice(+e.target.value)} className="mt-1.5" />
                  </div>
                  <div>
                    <Label>Deadline</Label>
                    <Input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} className="mt-1.5" />
                  </div>
                </div>

                <div>
                  <Label>Risk profile</Label>
                  <Select value={riskProfile} onValueChange={(v) => setRiskProfile(v as RiskProfile)}>
                    <SelectTrigger className="mt-1.5 md:w-72"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="conservative">Conservative — diversify, full insurance</SelectItem>
                      <SelectItem value="balanced">Balanced — split when valuable</SelectItem>
                      <SelectItem value="aggressive">Aggressive — best price, single source</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button onClick={createIntent} size="lg" className="w-full md:w-auto">
                  <Brain className="w-4 h-4 mr-2" /> Launch Trade OS pipeline
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Active deals */}
          <TabsContent value="active">
            {deals.length === 0 ? (
              <Card><CardContent className="pt-6 text-center text-muted-foreground py-12">
                No deals yet. Create one from the "New deal" tab.
              </CardContent></Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {deals.map((d) => (
                  <Card key={d.id} className="hover:border-primary/40 transition-colors">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <CardTitle className="text-base truncate">{d.spec.product}</CardTitle>
                          <CardDescription>
                            {d.spec.quantity.toLocaleString()} {d.spec.unit} • {d.spec.inferredCategory}
                          </CardDescription>
                        </div>
                        <Badge variant={d.stage === "completed" ? "default" : "secondary"}>
                          {d.stage}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex flex-wrap gap-1">
                        {d.spec.compliance.map((c) => <Badge key={c} variant="outline" className="text-xs">{c}</Badge>)}
                        <Badge variant="outline" className="text-xs capitalize">{d.spec.riskProfile}</Badge>
                      </div>
                      {d.finalPrice && (
                        <div className="text-sm">
                          <span className="text-muted-foreground">Negotiated:</span>{" "}
                          <span className="font-semibold">₹{d.finalPrice}/{d.spec.unit}</span>
                          {d.contract && <span className="text-muted-foreground"> • Total ₹{d.contract.totalValue.toLocaleString()}</span>}
                        </div>
                      )}
                      <div className="flex gap-2">
                        <Button asChild size="sm" className="flex-1">
                          <Link to={`/trade-os/${d.id}`}>Open console <ArrowRight className="w-3.5 h-3.5 ml-1" /></Link>
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => remove(d.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
      <Footer />
    </div>
  );
}
