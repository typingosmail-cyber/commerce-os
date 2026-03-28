import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MOCK_CATALOG, PRODUCT_CATEGORIES } from "@/lib/mock-data";
import { CatalogProduct } from "@/lib/types";
import { GetBestPriceModal } from "./GetBestPriceModal";
import { Search, Package, MapPin, Shield, Clock, Filter, ShoppingCart, Sparkles, Store } from "lucide-react";

interface Props {
  onCreateRFQ: (product: CatalogProduct) => void;
}

function ScoreBadge({ score }: { score: number }) {
  const color = score >= 800 ? "bg-success/10 text-success border-success/20"
    : score >= 600 ? "bg-secondary/10 text-secondary border-secondary/20"
    : "bg-warning/10 text-warning border-warning/20";
  return <Badge className={`${color} text-xs`}>{score}</Badge>;
}

export function ProductSearch({ onCreateRFQ }: Props) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [stockOnly, setStockOnly] = useState(false);
  const [bestPriceProduct, setBestPriceProduct] = useState<CatalogProduct | null>(null);

  const filtered = MOCK_CATALOG.filter((p) => {
    const matchesQuery = !query || p.name.toLowerCase().includes(query.toLowerCase()) || p.supplierName.toLowerCase().includes(query.toLowerCase()) || p.description.toLowerCase().includes(query.toLowerCase());
    const matchesCat = category === "all" || p.category === category;
    const matchesStock = !stockOnly || p.inStock;
    return matchesQuery && matchesCat && matchesStock;
  });

  return (
    <div className="space-y-5">
      {/* Search bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search products, suppliers, materials..." value={query} onChange={(e) => setQuery(e.target.value)} className="pl-9" />
        </div>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-full sm:w-52">
            <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {PRODUCT_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button variant={stockOnly ? "default" : "outline"} size="default" onClick={() => setStockOnly(!stockOnly)} className="shrink-0">
          In Stock Only
        </Button>
      </div>

      <p className="text-sm text-muted-foreground">{filtered.length} products found</p>

      {/* Product grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map((p) => (
          <Card key={p.id} className="hover:shadow-md transition-shadow group">
            <CardContent className="p-5">
              <div className="flex justify-between items-start mb-3">
                <Badge variant="outline" className="text-xs">{p.category}</Badge>
                <div className="flex items-center gap-1.5">
                  <Shield className="h-3.5 w-3.5 text-muted-foreground" />
                  <ScoreBadge score={p.supplierScore} />
                </div>
              </div>
              <h3 className="font-display font-semibold text-foreground group-hover:text-primary transition-colors">{p.name}</h3>
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{p.description}</p>

              <div className="flex items-center gap-4 mt-3 text-sm">
                <span className="font-semibold text-foreground">₹{p.pricePerUnit}/{p.unit}</span>
                <span className="text-muted-foreground">MOQ: {p.minOrderQty}</span>
                <span className="flex items-center gap-1 text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" /> {p.leadTimeDays}d
                </span>
              </div>

              <div className="flex items-center justify-between mt-4 pt-3 border-t">
                <button className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors" onClick={() => navigate(`/supplier/${p.supplierId}`)}>
                  <Store className="h-3.5 w-3.5" />
                  <span className="font-medium text-foreground">{p.supplierName}</span>
                </button>
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="h-3 w-3" /> {p.supplierCity}
                </span>
              </div>

              <div className="flex gap-2 mt-3">
                <Button size="sm" className="flex-1" onClick={() => setBestPriceProduct(p)}>
                  <Sparkles className="h-3.5 w-3.5 mr-1.5" /> Get Best Price
                </Button>
                <Button size="sm" variant="outline" className="flex-1" onClick={() => onCreateRFQ(p)}>
                  <ShoppingCart className="h-3.5 w-3.5 mr-1.5" /> Request Quote
                </Button>
                {p.inStock ? (
                  <Badge className="bg-success/10 text-success border-success/20 shrink-0">In Stock</Badge>
                ) : (
                  <Badge variant="destructive" className="bg-destructive/10 text-destructive border-destructive/20 shrink-0">Out of Stock</Badge>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Get Best Price Modal */}
      <GetBestPriceModal product={bestPriceProduct} open={!!bestPriceProduct} onClose={() => setBestPriceProduct(null)} />
    </div>
  );
}
