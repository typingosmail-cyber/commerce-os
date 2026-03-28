import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { UNITS, MOCK_SUPPLIERS, getInquiriesFromStorage, saveInquiriesToStorage } from "@/lib/mock-data";
import { CatalogProduct, Inquiry } from "@/lib/types";
import { Send, Shield, CheckCircle, Sparkles } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Props {
  product: CatalogProduct | null;
  open: boolean;
  onClose: () => void;
}

export function GetBestPriceModal({ product, open, onClose }: Props) {
  const [form, setForm] = useState({
    buyerName: "",
    buyerEmail: "",
    buyerPhone: "",
    quantity: product?.minOrderQty || 100,
    unit: product?.unit || "Piece",
    message: "",
  });
  const [submitted, setSubmitted] = useState(false);

  const update = (field: string, value: string | number) =>
    setForm(prev => ({ ...prev, [field]: value }));

  // Find related suppliers for this product category
  const relatedSuppliers = MOCK_SUPPLIERS.filter(s =>
    product && (s.products.some(p => p.toLowerCase().includes(product.name.toLowerCase().split(" ")[0])) || s.industry.toLowerCase().includes(product.category.toLowerCase()))
  ).slice(0, 3);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!product) return;

    const inquiry: Inquiry = {
      id: `inq-${Date.now()}`,
      productName: product.name,
      buyerName: form.buyerName,
      buyerEmail: form.buyerEmail,
      buyerPhone: form.buyerPhone,
      quantity: form.quantity,
      unit: form.unit,
      message: form.message,
      supplierIds: [product.supplierId, ...relatedSuppliers.map(s => s.id)],
      status: "pending",
      createdAt: new Date().toISOString(),
    };

    const existing = getInquiriesFromStorage();
    saveInquiriesToStorage([inquiry, ...existing]);

    setSubmitted(true);
    toast({ title: "Inquiry Sent! 🎉", description: `${relatedSuppliers.length + 1} suppliers will respond with their best price.` });
  };

  const handleClose = () => {
    setSubmitted(false);
    setForm({ buyerName: "", buyerEmail: "", buyerPhone: "", quantity: product?.minOrderQty || 100, unit: product?.unit || "Piece", message: "" });
    onClose();
  };

  if (!product) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        {submitted ? (
          <div className="py-8 text-center space-y-4">
            <div className="h-16 w-16 rounded-full bg-success/10 flex items-center justify-center mx-auto">
              <CheckCircle className="h-8 w-8 text-success" />
            </div>
            <h3 className="text-xl font-display font-bold text-foreground">Inquiry Sent Successfully!</h3>
            <p className="text-muted-foreground text-sm">
              Your inquiry for <span className="font-semibold text-foreground">{product.name}</span> has been sent to {relatedSuppliers.length + 1} verified suppliers.
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              {[product.supplierName, ...relatedSuppliers.map(s => s.name)].map(name => (
                <Badge key={name} variant="outline" className="text-xs">{name}</Badge>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">Expect responses within 2-4 hours</p>
            <Button onClick={handleClose} className="mt-2">Done</Button>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 font-display">
                <Sparkles className="h-5 w-5 text-secondary" /> Get Best Price
              </DialogTitle>
              <DialogDescription>
                Send your requirement to multiple verified suppliers and get competitive quotes
              </DialogDescription>
            </DialogHeader>

            {/* Product context */}
            <div className="bg-muted/50 rounded-lg p-3 flex items-center justify-between">
              <div>
                <p className="font-semibold text-foreground text-sm">{product.name}</p>
                <p className="text-xs text-muted-foreground">₹{product.pricePerUnit}/{product.unit} • {product.supplierName}</p>
              </div>
              <Badge className="bg-success/10 text-success border-success/20 text-xs">
                <Shield className="h-3 w-3 mr-1" /> {product.supplierScore}
              </Badge>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Your Name *</Label>
                  <Input value={form.buyerName} onChange={e => update("buyerName", e.target.value)} placeholder="Company / Name" required className="mt-1" />
                </div>
                <div>
                  <Label className="text-xs">Phone *</Label>
                  <Input value={form.buyerPhone} onChange={e => update("buyerPhone", e.target.value)} placeholder="+91-XXXXX-XXXXX" required className="mt-1" />
                </div>
              </div>
              <div>
                <Label className="text-xs">Email *</Label>
                <Input type="email" value={form.buyerEmail} onChange={e => update("buyerEmail", e.target.value)} placeholder="you@company.com" required className="mt-1" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Quantity *</Label>
                  <Input type="number" value={form.quantity || ""} onChange={e => update("quantity", Number(e.target.value))} required className="mt-1" />
                </div>
                <div>
                  <Label className="text-xs">Unit</Label>
                  <Select value={form.unit} onValueChange={v => update("unit", v)}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>{UNITS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label className="text-xs">Additional Details</Label>
                <Textarea value={form.message} onChange={e => update("message", e.target.value)} rows={2} placeholder="Specifications, delivery location, budget..." className="mt-1" />
              </div>

              <div className="bg-primary/5 rounded-lg p-3 text-xs text-muted-foreground">
                <p className="font-medium text-foreground mb-1">📤 Inquiry will be sent to:</p>
                <div className="flex flex-wrap gap-1.5">
                  <Badge variant="secondary" className="text-[10px]">{product.supplierName}</Badge>
                  {relatedSuppliers.map(s => (
                    <Badge key={s.id} variant="outline" className="text-[10px]">{s.name}</Badge>
                  ))}
                </div>
              </div>

              <Button type="submit" className="w-full">
                <Send className="h-4 w-4 mr-2" /> Send Inquiry to {relatedSuppliers.length + 1} Suppliers
              </Button>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
