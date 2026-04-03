import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CATEGORY_GROUPS, MOCK_CATALOG } from "@/lib/mock-data";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { CategorySidebar } from "@/components/CategorySidebar";
import {
  Building2, Cog, Zap, FlaskConical, Package, Shield,
  Search, ArrowLeft, ArrowRight, TrendingUp, Star, Flame, Eye,
} from "lucide-react";

const ICON_MAP: Record<string, React.ElementType> = {
  building: Building2, cog: Cog, zap: Zap, flask: FlaskConical, package: Package, shield: Shield,
};

// Simulated trending products — pick top items and add trending metadata
const TRENDING_PRODUCTS = MOCK_CATALOG.map((p, i) => ({
  ...p,
  trendScore: [98, 95, 92, 89, 85, 82, 78, 75, 72, 68][i] || 60,
  weeklyInquiries: [340, 290, 265, 230, 210, 195, 175, 160, 145, 130][i] || 100,
  views: [12400, 10800, 9500, 8200, 7600, 6900, 6100, 5500, 4800, 4200][i] || 3000,
})).sort((a, b) => b.trendScore - a.trendScore);

export default function CategoryBrowse() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const selectedGroup = searchParams.get("group");
  const selectedSub = searchParams.get("sub");
  const viewMode = searchParams.get("view");
  const searchFromUrl = searchParams.get("search") || "";
  const [search, setSearch] = useState(searchFromUrl);

  const filteredGroups = search
    ? CATEGORY_GROUPS.filter(
        (g) =>
          g.name.toLowerCase().includes(search.toLowerCase()) ||
          g.categories.some((c) => c.name.toLowerCase().includes(search.toLowerCase()))
      )
    : CATEGORY_GROUPS;

  const matchingProducts = selectedSub
    ? MOCK_CATALOG.filter(
        (p) =>
          p.category.toLowerCase().includes(selectedSub.toLowerCase()) ||
          p.name.toLowerCase().includes(selectedSub.toLowerCase())
      )
    : [];

  const showTrending = viewMode === "trending" || (!selectedGroup && !selectedSub && !search);

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <CategorySidebar />

        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-10">
            <div className="flex items-center gap-3 px-4 py-3 md:px-6">
              <SidebarTrigger />
              <span className="font-bold text-foreground text-lg">Browse Categories</span>
            </div>
          </header>

          <main className="flex-1 overflow-auto px-4 py-6 md:px-6 space-y-8">
            {/* Search */}
            <div className="relative max-w-xl mx-auto">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Search categories, products, materials..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-11 h-12 text-base"
              />
            </div>

            {/* Breadcrumb */}
            {(selectedGroup || selectedSub) && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <button onClick={() => navigate("/categories")} className="hover:text-foreground transition-colors">
                  All Categories
                </button>
                {selectedGroup && (
                  <>
                    <ArrowRight className="h-3 w-3" />
                    <button
                      onClick={() => navigate(`/categories?group=${selectedGroup}`)}
                      className="hover:text-foreground transition-colors"
                    >
                      {selectedGroup}
                    </button>
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

            {/* Trending Products Section */}
            {showTrending && !selectedGroup && !selectedSub && (
              <section className="space-y-4">
                <div className="flex items-center gap-2">
                  <Flame className="h-5 w-5 text-destructive" />
                  <h2 className="text-xl font-bold text-foreground">Trending Products</h2>
                  <Badge variant="secondary" className="text-xs">This Week</Badge>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {TRENDING_PRODUCTS.slice(0, 8).map((p, idx) => (
                    <Card
                      key={p.id}
                      className="hover:shadow-lg transition-all cursor-pointer group border hover:border-primary/30 relative overflow-hidden"
                      onClick={() => navigate(`/product/${p.id}`)}
                    >
                      {idx < 3 && (
                        <div className="absolute top-2 left-2 z-10">
                          <Badge className="bg-destructive text-destructive-foreground text-[10px] px-1.5 py-0.5">
                            #{idx + 1} Trending
                          </Badge>
                        </div>
                      )}
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <Badge variant="outline" className="text-[10px]">{p.category}</Badge>
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Star className="h-3 w-3 fill-current text-yellow-500" />
                            <span className="text-[10px]">{p.supplierScore}</span>
                          </div>
                        </div>
                        <h3 className="font-semibold text-foreground text-sm group-hover:text-primary transition-colors line-clamp-2">
                          {p.name}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{p.description}</p>
                        <div className="flex items-center justify-between mt-3 pt-2 border-t border-border">
                          <span className="font-bold text-foreground text-sm">
                            ₹{p.pricePerUnit}/{p.unit}
                          </span>
                          <span className="text-[10px] text-muted-foreground">{p.supplierCity}</span>
                        </div>
                        <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <TrendingUp className="h-3 w-3 text-green-500" />
                            {p.weeklyInquiries} inquiries
                          </span>
                          <span className="flex items-center gap-1">
                            <Eye className="h-3 w-3" />
                            {(p.views / 1000).toFixed(1)}k views
                          </span>
                        </div>
                        <Button
                          size="sm"
                          className="w-full mt-3 h-8 text-xs"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/product/${p.id}`);
                          }}
                        >
                          Get Best Price
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </section>
            )}

            {/* Sub-category product listing */}
            {selectedSub ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-foreground">{selectedSub}</h2>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      navigate(selectedGroup ? `/categories?group=${selectedGroup}` : "/categories")
                    }
                  >
                    <ArrowLeft className="h-4 w-4 mr-1" /> Back
                  </Button>
                </div>
                {matchingProducts.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {matchingProducts.map((p) => (
                      <Card
                        key={p.id}
                        className="hover:shadow-md transition-shadow cursor-pointer"
                        onClick={() => navigate(`/buyer/dashboard`)}
                      >
                        <CardContent className="p-5">
                          <Badge variant="outline" className="text-xs mb-2">{p.category}</Badge>
                          <h3 className="font-semibold text-foreground">{p.name}</h3>
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{p.description}</p>
                          <div className="flex items-center justify-between mt-3">
                            <span className="font-semibold text-foreground">₹{p.pricePerUnit}/{p.unit}</span>
                            <span className="text-xs text-muted-foreground">{p.supplierName}</span>
                          </div>
                          <Button
                            size="sm"
                            className="w-full mt-3"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/buyer/dashboard`);
                            }}
                          >
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
              <div className="space-y-6">
                {(() => {
                  const group = CATEGORY_GROUPS.find((g) => g.name === selectedGroup);
                  if (!group) return null;
                  const Icon = ICON_MAP[group.icon] || Package;
                  return (
                    <>
                      {/* Hero banner */}
                      <div className="relative rounded-xl overflow-hidden h-48 md:h-56">
                        <img src={group.heroImage} alt={group.name} className="w-full h-full object-cover" loading="lazy" />
                        <div className="absolute inset-0 bg-gradient-to-r from-foreground/80 to-foreground/20" />
                        <div className="absolute inset-0 flex items-center p-8">
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center">
                                <Icon className="h-5 w-5 text-primary-foreground" />
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-background/70 hover:text-background"
                                onClick={() => navigate("/categories")}
                              >
                                <ArrowLeft className="h-4 w-4 mr-1" /> All Categories
                              </Button>
                            </div>
                            <h2 className="text-2xl md:text-3xl font-bold text-background">{group.name}</h2>
                            <p className="text-background/70 text-sm mt-1">
                              {group.categories.reduce((sum, c) => sum + c.productCount, 0).toLocaleString()} products
                              across {group.categories.length} sub-categories
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Sub-category grid */}
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {group.categories.map((cat) => (
                          <Card
                            key={cat.name}
                            className="hover:shadow-lg transition-all cursor-pointer group border-2 hover:border-primary/30"
                            onClick={() => navigate(`/categories?group=${selectedGroup}&sub=${cat.name}`)}
                          >
                            <CardContent className="p-5 text-center">
                              <div className="h-16 w-16 mx-auto rounded-xl overflow-hidden bg-muted flex items-center justify-center mb-3 group-hover:ring-2 group-hover:ring-primary/30 transition-all">
                                <img src={cat.image} alt={cat.name} className="w-full h-full object-cover" loading="lazy" />
                              </div>
                              <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors text-sm">
                                {cat.name}
                              </h3>
                              <p className="text-xs text-muted-foreground mt-1">{cat.productCount.toLocaleString()} products</p>
                              <div className="flex items-center justify-center gap-1 mt-2 text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                                <span>Browse</span>
                                <ArrowRight className="h-3 w-3" />
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </>
                  );
                })()}
              </div>
            ) : (
              /* All category groups */
              <div className="space-y-10">
                {filteredGroups.map((group) => {
                  const Icon = ICON_MAP[group.icon] || Package;
                  const totalProducts = group.categories.reduce((sum, c) => sum + c.productCount, 0);
                  return (
                    <section key={group.name}>
                      <div
                        className="relative rounded-xl overflow-hidden h-40 mb-5 cursor-pointer group"
                        onClick={() => navigate(`/categories?group=${group.name}`)}
                      >
                        <img
                          src={group.heroImage}
                          alt={group.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          loading="lazy"
                          width={640}
                          height={512}
                        />
                        <div className="absolute inset-0 bg-gradient-to-r from-foreground/75 via-foreground/40 to-transparent" />
                        <div className="absolute inset-0 flex items-center justify-between p-6">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                                <Icon className="h-4 w-4 text-primary-foreground" />
                              </div>
                              <h2 className="text-xl md:text-2xl font-bold text-background">{group.name}</h2>
                            </div>
                            <div className="flex items-center gap-3 text-background/70 text-sm">
                              <span>{totalProducts.toLocaleString()} products</span>
                              <span>•</span>
                              <span>{group.categories.length} sub-categories</span>
                            </div>
                          </div>
                          <Button variant="secondary" size="sm" className="opacity-90 group-hover:opacity-100">
                            View All <ArrowRight className="h-4 w-4 ml-1" />
                          </Button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                        {group.categories.map((cat) => (
                          <Card
                            key={cat.name}
                            className="hover:shadow-md transition-all cursor-pointer group/card border hover:border-primary/30"
                            onClick={() => navigate(`/categories?group=${group.name}&sub=${cat.name}`)}
                          >
                            <CardContent className="p-4 text-center">
                              <div className="h-12 w-12 mx-auto rounded-lg overflow-hidden bg-muted flex items-center justify-center mb-2 group-hover/card:ring-2 group-hover/card:ring-primary/30 transition-all">
                                <img src={cat.image} alt={cat.name} className="w-full h-full object-cover" loading="lazy" />
                              </div>
                              <h3 className="font-medium text-foreground group-hover/card:text-primary transition-colors text-xs leading-tight">
                                {cat.name}
                              </h3>
                              <div className="flex items-center justify-center gap-1 mt-1">
                                <TrendingUp className="h-3 w-3 text-muted-foreground" />
                                <span className="text-[10px] text-muted-foreground">{cat.productCount.toLocaleString()}</span>
                              </div>
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
      </div>
    </SidebarProvider>
  );
}
