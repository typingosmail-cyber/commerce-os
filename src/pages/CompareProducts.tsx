import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { MOCK_CATALOG } from "@/lib/mock-data";
import { getCompareList, clearCompare, toggleCompare } from "@/lib/wishlist";
import {
  GitCompareArrows, Trash2, Star, MapPin, Clock,
  CheckCircle2, XCircle, Trophy, ArrowLeft,
} from "lucide-react";

export default function CompareProducts() {
  const navigate = useNavigate();
  const [compareIds, setCompareIds] = useState<string[]>(getCompareList());

  useEffect(() => {
    const handler = () => setCompareIds(getCompareList());
    window.addEventListener("compare-change", handler);
    return () => window.removeEventListener("compare-change", handler);
  }, []);

  const products = compareIds.map((id) => MOCK_CATALOG.find((p) => p.id === id)).filter(Boolean) as typeof MOCK_CATALOG;

  const bestPrice = products.length > 0 ? Math.min(...products.map((p) => p.pricePerUnit)) : 0;
  const bestScore = products.length > 0 ? Math.max(...products.map((p) => p.supplierScore)) : 0;
  const bestLead = products.length > 0 ? Math.min(...products.map((p) => p.leadTimeDays)) : 0;

  const handleRemove = (id: string) => {
    toggleCompare(id);
    setCompareIds(getCompareList());
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="container py-6 space-y-6 flex-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                <GitCompareArrows className="h-6 w-6 text-primary" /> Compare Products
              </h1>
              <p className="text-sm text-muted-foreground">{products.length} products selected (max 4)</p>
            </div>
          </div>
          {products.length > 0 && (
            <Button variant="outline" size="sm" onClick={() => { clearCompare(); setCompareIds([]); }}>
              <Trash2 className="h-4 w-4 mr-1" /> Clear All
            </Button>
          )}
        </div>

        {products.length === 0 ? (
          <Card>
            <CardContent className="p-16 text-center">
              <GitCompareArrows className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
              <h2 className="text-xl font-semibold text-foreground">No products to compare</h2>
              <p className="text-muted-foreground mt-2">Add products to compare from the product catalog</p>
              <Button className="mt-4" onClick={() => navigate("/categories")}>Browse Products</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="text-left p-4 border-b bg-muted/50 text-sm font-semibold text-muted-foreground w-40">Feature</th>
                  {products.map((p) => (
                    <th key={p.id} className="p-4 border-b bg-muted/50 min-w-[220px]">
                      <div className="text-left space-y-2">
                        <button
                          className="text-sm font-semibold text-foreground hover:text-primary transition-colors text-left"
                          onClick={() => navigate(`/product/${p.id}`)}
                        >
                          {p.name}
                        </button>
                        <Button variant="ghost" size="sm" className="h-6 text-xs text-muted-foreground" onClick={() => handleRemove(p.id)}>
                          <XCircle className="h-3 w-3 mr-1" /> Remove
                        </Button>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <CompareRow label="Category" values={products.map((p) => <Badge key={p.id} variant="outline" className="text-xs">{p.category}</Badge>)} />
                <CompareRow
                  label="Price"
                  values={products.map((p) => (
                    <span className="flex items-center gap-1">
                      <span className={`font-bold ${p.pricePerUnit === bestPrice ? "text-success" : "text-foreground"}`}>
                        ₹{p.pricePerUnit}
                      </span>
                      <span className="text-xs text-muted-foreground">/{p.unit}</span>
                      {p.pricePerUnit === bestPrice && <Trophy className="h-3.5 w-3.5 text-success" />}
                    </span>
                  ))}
                />
                <CompareRow label="MOQ" values={products.map((p) => <span className="text-foreground">{p.minOrderQty} {p.unit}s</span>)} />
                <CompareRow
                  label="Lead Time"
                  values={products.map((p) => (
                    <span className={`flex items-center gap-1 ${p.leadTimeDays === bestLead ? "text-success font-semibold" : "text-foreground"}`}>
                      <Clock className="h-3.5 w-3.5" /> {p.leadTimeDays} days
                      {p.leadTimeDays === bestLead && <Trophy className="h-3.5 w-3.5 text-success" />}
                    </span>
                  ))}
                />
                <CompareRow
                  label="Availability"
                  values={products.map((p) =>
                    p.inStock ? (
                      <span className="flex items-center gap-1 text-success"><CheckCircle2 className="h-4 w-4" /> In Stock</span>
                    ) : (
                      <span className="flex items-center gap-1 text-warning"><XCircle className="h-4 w-4" /> Made to Order</span>
                    )
                  )}
                />
                <CompareRow
                  label="Supplier"
                  values={products.map((p) => (
                    <button className="text-sm text-foreground hover:text-primary transition-colors text-left" onClick={() => navigate(`/supplier/${p.supplierId}`)}>
                      {p.supplierName}
                    </button>
                  ))}
                />
                <CompareRow
                  label="Trust Score"
                  values={products.map((p) => (
                    <span className="flex items-center gap-1">
                      <Star className={`h-3.5 w-3.5 fill-current ${p.supplierScore === bestScore ? "text-success" : "text-yellow-500"}`} />
                      <span className={p.supplierScore === bestScore ? "font-bold text-success" : "text-foreground"}>
                        {p.supplierScore}
                      </span>
                      {p.supplierScore === bestScore && <Trophy className="h-3.5 w-3.5 text-success" />}
                    </span>
                  ))}
                />
                <CompareRow
                  label="Location"
                  values={products.map((p) => (
                    <span className="flex items-center gap-1 text-sm text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5" /> {p.supplierCity}, {p.supplierState}
                    </span>
                  ))}
                />
                <CompareRow
                  label="Description"
                  values={products.map((p) => <span className="text-sm text-muted-foreground">{p.description}</span>)}
                />
                <CompareRow
                  label="Specifications"
                  values={products.map((p) => <span className="text-xs text-muted-foreground">{p.specifications}</span>)}
                />
                <CompareRow
                  label="Actions"
                  values={products.map((p) => (
                    <div className="flex flex-col gap-2">
                      <Button size="sm" className="w-full text-xs" onClick={() => navigate(`/product/${p.id}`)}>
                        Get Best Price
                      </Button>
                      <Button size="sm" variant="outline" className="w-full text-xs" onClick={() => navigate(`/messages?supplier=${p.supplierId}`)}>
                        Contact Supplier
                      </Button>
                    </div>
                  ))}
                />
              </tbody>
            </table>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}

function CompareRow({ label, values }: { label: string; values: React.ReactNode[] }) {
  return (
    <tr className="border-b last:border-0">
      <td className="p-4 text-sm font-medium text-muted-foreground align-top">{label}</td>
      {values.map((v, i) => (
        <td key={i} className="p-4 align-top">{v}</td>
      ))}
    </tr>
  );
}
