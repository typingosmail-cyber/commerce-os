import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PRODUCT_CATEGORIES, UNITS } from "@/lib/mock-data";
import { RFQ, CatalogProduct } from "@/lib/types";
import { FileText, Send, ArrowLeft } from "lucide-react";

interface Props {
  prefill?: CatalogProduct | null;
  onSubmit: (rfq: RFQ) => void;
  onCancel: () => void;
}

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

  const update = (field: string, value: string | number) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const rfq: RFQ = {
      id: `rfq-${Date.now()}`,
      ...form,
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

      <Button type="submit" size="lg" className="w-full">
        <Send className="h-4 w-4 mr-2" /> Send RFQ to Matched Suppliers
      </Button>
    </form>
  );
}
