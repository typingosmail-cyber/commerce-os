import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { PRODUCT_CATEGORIES, UNITS } from "@/lib/mock-data";
import { RFQ, CatalogProduct } from "@/lib/types";
import { matchSuppliers } from "@/lib/supplier-matching";
import {
  buildRFQAddendum,
  formatAddendumText,
  type TierQuestion,
  type NegotiationTerm,
} from "@/lib/rfq-tier-questions";
import { FileText, Send, ArrowLeft, Sparkles, HelpCircle, Handshake, ShieldCheck } from "lucide-react";

interface Props {
  prefill?: CatalogProduct | null;
  onSubmit: (rfq: RFQ) => void;
  onCancel: () => void;
}

const TIER_COLOR: Record<string, string> = {
  platinum: "bg-secondary/15 text-secondary border-secondary/30",
  gold: "bg-warning/15 text-warning border-warning/30",
  silver: "bg-muted text-foreground border-border",
  bronze: "bg-warning/10 text-warning border-warning/20",
  unverified: "bg-destructive/10 text-destructive border-destructive/20",
};

export function RFQForm({ prefill, onSubmit, onCancel }: Props) {
  const [form, setForm] = useState({
    title: prefill ? `${prefill.name} - Bulk Order` : "",
    category: prefill?.category || "",
    description: prefill ? `Require ${prefill.name}. ${prefill.specifications}` : "",
    quantity: prefill?.minOrderQty || 0,
    unit: prefill?.unit || "",
    budget: prefill ? prefill.pricePerUnit * (prefill.minOrderQty || 100) : 0,
    deliveryDate: "",
    deliveryLocation: "",
  });

  // Track which auto-suggested questions/terms the buyer wants to include.
  const [excludedQ, setExcludedQ] = useState<Set<string>>(new Set());
  const [excludedT, setExcludedT] = useState<Set<string>>(new Set());

  const update = (field: string, value: string | number) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  // Live shortlist preview (top 5) for tier-aware addendum.
  const { shortlist, addendum } = useMemo(() => {
    if (!form.category || !form.quantity) {
      return { shortlist: [], addendum: { shortlistTiers: [], questions: [], terms: [] } };
    }
    const matches = matchSuppliers({
      category: form.category,
      quantity: form.quantity,
      unit: form.unit,
      budget: form.budget,
      deliveryDate: form.deliveryDate,
    }).slice(0, 5);
    return { shortlist: matches, addendum: buildRFQAddendum(matches) };
  }, [form.category, form.quantity, form.unit, form.budget, form.deliveryDate]);

  const selectedQuestions: TierQuestion[] = addendum.questions.filter((q) => !excludedQ.has(q.id));
  const selectedTerms: NegotiationTerm[] = addendum.terms.filter((t) => !excludedT.has(t.id));

  const toggle = (set: Set<string>, id: string, setter: (s: Set<string>) => void) => {
    const next = new Set(set);
    next.has(id) ? next.delete(id) : next.add(id);
    setter(next);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const addendumText = formatAddendumText(selectedQuestions, selectedTerms);
    const rfq: RFQ = {
      id: `rfq-${Date.now()}`,
      ...form,
      description: form.description + addendumText,
      status: "sent",
      createdAt: new Date().toISOString(),
      responses: [],
    };
    onSubmit(rfq);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 animate-fade-in-up">
      <div className="flex items-center gap-3">
        <Button type="button" variant="ghost" size="icon" onClick={onCancel}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h2 className="text-2xl font-display font-bold text-foreground">Create RFQ</h2>
          <p className="text-muted-foreground text-sm">Request for Quotation from verified suppliers</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileText className="h-5 w-5 text-secondary" />
            Requirement Details
          </CardTitle>
          <CardDescription>Describe what you need — AI will match you with the best suppliers</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <Label>RFQ Title *</Label>
            <Input value={form.title} onChange={(e) => update("title", e.target.value)} placeholder="e.g. SS304 Bolts M8 - 5000 pcs" required className="mt-1.5" />
          </div>
          <div>
            <Label>Category *</Label>
            <Select value={form.category} onValueChange={(v) => update("category", v)}>
              <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select category" /></SelectTrigger>
              <SelectContent>{PRODUCT_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <Label>Quantity *</Label>
              <Input type="number" value={form.quantity || ""} onChange={(e) => update("quantity", Number(e.target.value))} required className="mt-1.5" />
            </div>
            <div className="w-28">
              <Label>Unit</Label>
              <Select value={form.unit} onValueChange={(v) => update("unit", v)}>
                <SelectTrigger className="mt-1.5"><SelectValue placeholder="Unit" /></SelectTrigger>
                <SelectContent>{UNITS.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Budget (₹)</Label>
            <Input type="number" value={form.budget || ""} onChange={(e) => update("budget", Number(e.target.value))} className="mt-1.5" />
          </div>
          <div>
            <Label>Required By *</Label>
            <Input type="date" value={form.deliveryDate} onChange={(e) => update("deliveryDate", e.target.value)} required className="mt-1.5" />
          </div>
          <div className="md:col-span-2">
            <Label>Delivery Location *</Label>
            <Input value={form.deliveryLocation} onChange={(e) => update("deliveryLocation", e.target.value)} placeholder="e.g. Pune, Maharashtra" required className="mt-1.5" />
          </div>
          <div className="md:col-span-2">
            <Label>Detailed Description *</Label>
            <Textarea value={form.description} onChange={(e) => update("description", e.target.value)} rows={4} placeholder="Specifications, quality standards, packaging requirements..." required className="mt-1.5" />
          </div>
        </CardContent>
      </Card>

      {/* Tier-aware auto-included addendum */}
      {shortlist.length > 0 && (
        <Card className="border-secondary/30 bg-secondary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Sparkles className="h-5 w-5 text-secondary" />
              AI Addendum — Tier-Aware Questions & Terms
            </CardTitle>
            <CardDescription>
              Auto-generated based on the top {shortlist.length} matched suppliers. Uncheck anything you don't want sent.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Shortlist chips */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Shortlist Preview</p>
              <div className="flex flex-wrap gap-2">
                {shortlist.map((s) => (
                  <Badge key={s.supplierId} variant="outline" className={`gap-1 ${TIER_COLOR[s.tier] || ""}`}>
                    <ShieldCheck className="h-3 w-3" />
                    {s.supplierName}
                    <span className="opacity-70">· {s.tierLabel}</span>
                  </Badge>
                ))}
              </div>
            </div>

            {/* Questions */}
            {addendum.questions.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
                  <HelpCircle className="h-3.5 w-3.5" /> Questions to Suppliers ({selectedQuestions.length}/{addendum.questions.length})
                </p>
                <div className="space-y-2">
                  {addendum.questions.map((q) => (
                    <label key={q.id} className="flex items-start gap-2.5 p-2.5 rounded-md bg-background border border-border hover:border-secondary/50 cursor-pointer transition-colors">
                      <Checkbox
                        checked={!excludedQ.has(q.id)}
                        onCheckedChange={() => toggle(excludedQ, q.id, setExcludedQ)}
                        className="mt-0.5"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground">{q.text}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          <span className="opacity-70">For:</span> {q.tiers.join(", ")} · {q.rationale}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Negotiation terms */}
            {addendum.terms.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
                  <Handshake className="h-3.5 w-3.5" /> Proposed Negotiation Terms ({selectedTerms.length}/{addendum.terms.length})
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {addendum.terms.map((t) => (
                    <label key={t.id} className="flex items-start gap-2.5 p-2.5 rounded-md bg-background border border-border hover:border-secondary/50 cursor-pointer transition-colors">
                      <Checkbox
                        checked={!excludedT.has(t.id)}
                        onCheckedChange={() => toggle(excludedT, t.id, setExcludedT)}
                        className="mt-0.5"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground">{t.label}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{t.detail}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {shortlist.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="py-6 text-center text-sm text-muted-foreground">
            <Sparkles className="h-5 w-5 mx-auto mb-2 text-secondary/60" />
            Pick a category and quantity to auto-generate tier-aware supplier questions & negotiation terms.
          </CardContent>
        </Card>
      )}

      <Button type="submit" size="lg" className="w-full">
        <Send className="h-4 w-4 mr-2" />
        Send RFQ {selectedQuestions.length + selectedTerms.length > 0 ? `+ ${selectedQuestions.length + selectedTerms.length} auto-clauses` : ""} to Matched Suppliers
      </Button>
    </form>
  );
}
