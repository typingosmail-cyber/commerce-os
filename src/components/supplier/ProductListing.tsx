import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { PRODUCT_CATEGORIES, UNITS } from "@/lib/mock-data";
import { Product } from "@/lib/types";
import { Package, Plus, Trash2, CheckCircle2, ArrowRight } from "lucide-react";

interface Props {
  products: Product[];
  onComplete: (products: Product[]) => void;
}

const emptyProduct = (): Partial<Product> => ({
  name: "",
  category: "",
  description: "",
  unit: "",
  minOrderQty: 1,
  pricePerUnit: 0,
  specifications: "",
  images: [],
  inStock: true,
  leadTimeDays: 7,
});

export function ProductListing({ products: initialProducts, onComplete }: Props) {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [draft, setDraft] = useState<Partial<Product>>(emptyProduct());
  const [showForm, setShowForm] = useState(initialProducts.length === 0);

  const updateDraft = (field: string, value: unknown) =>
    setDraft((prev) => ({ ...prev, [field]: value }));

  const addProduct = () => {
    if (!draft.name || !draft.category || !draft.pricePerUnit) return;
    const product: Product = {
      ...(draft as Product),
      id: crypto.randomUUID(),
    };
    setProducts((prev) => [...prev, product]);
    setDraft(emptyProduct());
    setShowForm(false);
  };

  const removeProduct = (id: string) =>
    setProducts((prev) => prev.filter((p) => p.id !== id));

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-display font-bold text-foreground">Product Catalog</h2>
          <p className="text-muted-foreground mt-1">List the products you supply</p>
        </div>
        {products.length > 0 && (
          <Badge variant="secondary" className="text-sm px-3 py-1">
            {products.length} product{products.length !== 1 ? "s" : ""}
          </Badge>
        )}
      </div>

      {products.map((p) => (
        <Card key={p.id}>
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-md bg-secondary/20 flex items-center justify-center shrink-0">
                  <Package className="h-5 w-5 text-secondary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">{p.name}</h3>
                  <p className="text-sm text-muted-foreground">{p.category}</p>
                  <div className="flex gap-3 mt-1.5 text-sm">
                    <span className="font-medium">₹{p.pricePerUnit}/{p.unit}</span>
                    <span className="text-muted-foreground">MOQ: {p.minOrderQty}</span>
                    <span className="text-muted-foreground">Lead: {p.leadTimeDays}d</span>
                  </div>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => removeProduct(p.id)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}

      {showForm ? (
        <Card className="border-secondary/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Plus className="h-5 w-5 text-secondary" />
              Add Product
            </CardTitle>
            <CardDescription>Fill in product details for your catalog</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Label>Product Name *</Label>
                <Input value={draft.name} onChange={(e) => updateDraft("name", e.target.value)} placeholder="e.g. Stainless Steel Hex Bolts M8x40" className="mt-1.5" />
              </div>
              <div>
                <Label>Category *</Label>
                <Select value={draft.category} onValueChange={(v) => updateDraft("category", v)}>
                  <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>{PRODUCT_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Unit</Label>
                <Select value={draft.unit} onValueChange={(v) => updateDraft("unit", v)}>
                  <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select unit" /></SelectTrigger>
                  <SelectContent>{UNITS.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Price per Unit (₹) *</Label>
                <Input type="number" value={draft.pricePerUnit || ""} onChange={(e) => updateDraft("pricePerUnit", Number(e.target.value))} className="mt-1.5" />
              </div>
              <div>
                <Label>Min Order Qty</Label>
                <Input type="number" value={draft.minOrderQty || ""} onChange={(e) => updateDraft("minOrderQty", Number(e.target.value))} className="mt-1.5" />
              </div>
              <div>
                <Label>Lead Time (days)</Label>
                <Input type="number" value={draft.leadTimeDays || ""} onChange={(e) => updateDraft("leadTimeDays", Number(e.target.value))} className="mt-1.5" />
              </div>
              <div className="flex items-center gap-3">
                <Label>In Stock</Label>
                <Switch checked={draft.inStock} onCheckedChange={(v) => updateDraft("inStock", v)} />
              </div>
              <div className="md:col-span-2">
                <Label>Description</Label>
                <Textarea value={draft.description} onChange={(e) => updateDraft("description", e.target.value)} rows={2} className="mt-1.5" placeholder="Product details..." />
              </div>
              <div className="md:col-span-2">
                <Label>Specifications</Label>
                <Textarea value={draft.specifications} onChange={(e) => updateDraft("specifications", e.target.value)} rows={2} className="mt-1.5" placeholder="Material: SS304, Grade: A2-70..." />
              </div>
            </div>
            <div className="flex gap-3">
              <Button onClick={addProduct} disabled={!draft.name || !draft.category || !draft.pricePerUnit}>
                <CheckCircle2 className="h-4 w-4 mr-2" /> Add Product
              </Button>
              {products.length > 0 && (
                <Button variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Button variant="outline" onClick={() => setShowForm(true)} className="w-full border-dashed h-14">
          <Plus className="h-4 w-4 mr-2" /> Add Another Product
        </Button>
      )}

      {products.length > 0 && (
        <Button onClick={() => onComplete(products)} size="lg" className="w-full">
          Complete Onboarding <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      )}
    </div>
  );
}
