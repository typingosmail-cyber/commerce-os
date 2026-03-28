import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CATEGORY_GROUPS, MOCK_CATALOG } from "@/lib/mock-data";
import { Building2, Cog, Zap, FlaskConical, Package, Shield, Search, ArrowLeft, ArrowRight, ShoppingCart } from "lucide-react";

const ICON_MAP: Record<string, React.ElementType> = {
  building: Building2, cog: Cog, zap: Zap, flask: FlaskConical, package: Package, shield: Shield,
};

export default function CategoryBrowse() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const selectedGroup = searchParams.get("group");
  const selectedSub = searchParams.get("sub");
  const [search, setSearch] = useState("");

  const filteredGroups = search
    ? CATEGORY_GROUPS.filter(g => g.name.toLowerCase().includes(search.toLowerCase()) || g.categories.some(c => c.name.toLowerCase().includes(search.toLowerCase())))
    : CATEGORY_GROUPS;

  // If a sub-category is selected, show matching products from catalog
  const matchingProducts = selectedSub
    ? MOCK_CATALOG.filter(p => p.category.toLowerCase().includes(selectedSub.toLowerCase()) || p.name.toLowerCase().includes(selectedSub.toLowerCase()))
    : [];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container flex items-center justify-between py-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-primary flex items-center justify-center cursor-pointer" onClick={() => navigate("/")}>
              <span className="text-primary-foreground font-display font-bold text-sm">V</span>
            </div>
            <span className="font-display font-bold text-foreground text-xl">Browse Categories</span>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate("/buyer/dashboard")}>
            <ShoppingCart className="h-4 w-4 mr-1" /> Buyer Dashboard
          </Button>
        </div>
      </header>

      <main className="container py-8 space-y-8">
        {/* Search */}
        <div className="relative max-w-xl mx-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input placeholder="Search categories, products, materials..." value={search} onChange={e => setSearch(e.target.value)} className="pl-11 h-12 text-base" />
        </div>

        {/* Breadcrumb */}
        {(selectedGroup || selectedSub) && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <button onClick={() => navigate("/categories")} className="hover:text-foreground transition-colors">All Categories</button>
            {selectedGroup && (
              <>
                <ArrowRight className="h-3 w-3" />
                <button onClick={() => navigate(`/categories?group=${selectedGroup}`)} className="hover:text-foreground transition-colors">{selectedGroup}</button>
              </>
            )}
            {selectedSub && (
              <>
                <ArrowRight className="h-3 w-3" />
                <span className="text-foreground font-medium">{selectedSub}</span>
              </>
            )}
          </div>
        )}

        {/* Sub-category product listing */}
        {selectedSub ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-display font-bold text-foreground">{selectedSub}</h2>
              <Button variant="ghost" size="sm" onClick={() => navigate(selectedGroup ? `/categories?group=${selectedGroup}` : "/categories")}>
                <ArrowLeft className="h-4 w-4 mr-1" /> Back
              </Button>
            </div>
            {matchingProducts.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {matchingProducts.map(p => (
                  <Card key={p.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate(`/buyer/dashboard`)}>
                    <CardContent className="p-5">
                      <Badge variant="outline" className="text-xs mb-2">{p.category}</Badge>
                      <h3 className="font-display font-semibold text-foreground">{p.name}</h3>
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{p.description}</p>
                      <div className="flex items-center justify-between mt-3">
                        <span className="font-semibold text-foreground">₹{p.pricePerUnit}/{p.unit}</span>
                        <span className="text-xs text-muted-foreground">{p.supplierName}</span>
                      </div>
                      <Button size="sm" className="w-full mt-3" onClick={(e) => { e.stopPropagation(); navigate(`/buyer/dashboard`); }}>
                        Get Best Price
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="p-12 text-center text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-3 opacity-40" />
                  <p className="font-medium">No products listed yet in this category</p>
                  <p className="text-sm mt-1">Try browsing other categories or search for specific products</p>
                </CardContent>
              </Card>
            )}
          </div>
        ) : selectedGroup ? (
          /* Sub-categories within a group */
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-display font-bold text-foreground">{selectedGroup}</h2>
              <Button variant="ghost" size="sm" onClick={() => navigate("/categories")}>
                <ArrowLeft className="h-4 w-4 mr-1" /> All Categories
              </Button>
            </div>
            {(() => {
              const group = CATEGORY_GROUPS.find(g => g.name === selectedGroup);
              if (!group) return null;
              return (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {group.categories.map(cat => (
                    <Card key={cat.name} className="hover:shadow-md transition-shadow cursor-pointer group" onClick={() => navigate(`/categories?group=${selectedGroup}&sub=${cat.name}`)}>
                      <CardContent className="p-5 text-center">
                        <div className="text-4xl mb-3">{cat.image}</div>
                        <h3 className="font-display font-semibold text-foreground group-hover:text-primary transition-colors text-sm">{cat.name}</h3>
                        <p className="text-xs text-muted-foreground mt-1">{cat.productCount.toLocaleString()} products</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              );
            })()}
          </div>
        ) : (
          /* All category groups */
          <div className="space-y-8">
            {filteredGroups.map(group => {
              const Icon = ICON_MAP[group.icon] || Package;
              return (
                <section key={group.name}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Icon className="h-4 w-4 text-primary" />
                      </div>
                      <h2 className="text-xl font-display font-bold text-foreground">{group.name}</h2>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => navigate(`/categories?group=${group.name}`)}>
                      View All <ArrowRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                    {group.categories.map(cat => (
                      <Card key={cat.name} className="hover:shadow-md transition-shadow cursor-pointer group" onClick={() => navigate(`/categories?group=${group.name}&sub=${cat.name}`)}>
                        <CardContent className="p-4 text-center">
                          <div className="text-3xl mb-2">{cat.image}</div>
                          <h3 className="font-display font-medium text-foreground group-hover:text-primary transition-colors text-xs leading-tight">{cat.name}</h3>
                          <p className="text-[10px] text-muted-foreground mt-1">{cat.productCount.toLocaleString()} products</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
