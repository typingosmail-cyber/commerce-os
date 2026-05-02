import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { MOCK_CATALOG, PRODUCT_CATEGORIES } from "@/lib/mock-data";
import { CatalogProduct } from "@/lib/types";
import { GetBestPriceModal } from "./GetBestPriceModal";
import { toggleWishlist, isInWishlist, toggleCompare, isInCompare } from "@/lib/wishlist";
import { getSupplierTier, tierRank, getTierPerks, type BadgeTier } from "@/lib/supplier-tiers";
import {
  Search, MapPin, Shield, Clock, Filter, ShoppingCart, Sparkles, Store,
  Heart, GitCompareArrows, SlidersHorizontal, X, Star, Award, BadgeCheck,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

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
  const [showFilters, setShowFilters] = useState(false);
  const [priceRange, setPriceRange] = useState([0, 10000]);
  const [minRating, setMinRating] = useState(0);
  const [minTier, setMinTier] = useState<BadgeTier | "any">("any");
  const [sortBy, setSortBy] = useState("relevance");
  const [wishlistState, setWishlistState] = useState<Record<string, boolean>>({});
  const [compareState, setCompareState] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const wl: Record<string, boolean> = {};
    const cl: Record<string, boolean> = {};
    MOCK_CATALOG.forEach((p) => {
      wl[p.id] = isInWishlist(p.id);
      cl[p.id] = isInCompare(p.id);
    });
    setWishlistState(wl);
    setCompareState(cl);
  }, []);

  const maxPrice = Math.max(...MOCK_CATALOG.map((p) => p.pricePerUnit));

  const minTierRank = minTier === "any" ? -1 : tierRank(minTier);

  let filtered = MOCK_CATALOG.filter((p) => {
    const matchesQuery = !query || p.name.toLowerCase().includes(query.toLowerCase()) || p.supplierName.toLowerCase().includes(query.toLowerCase()) || p.description.toLowerCase().includes(query.toLowerCase());
    const matchesCat = category === "all" || p.category === category;
    const matchesStock = !stockOnly || p.inStock;
    const matchesPrice = p.pricePerUnit >= priceRange[0] && p.pricePerUnit <= priceRange[1];
    const matchesRating = p.supplierScore >= minRating;
    const matchesTier = minTierRank < 0 || tierRank(getSupplierTier(p.supplierScore).tier) >= minTierRank;
    return matchesQuery && matchesCat && matchesStock && matchesPrice && matchesRating && matchesTier;
  });

  // Default ("relevance") sort: prioritize verification tier, then trust score —
  // higher badges always surface first.
  if (sortBy === "relevance") {
    filtered = [...filtered].sort((a, b) => {
      const tierDiff = tierRank(getSupplierTier(b.supplierScore).tier) - tierRank(getSupplierTier(a.supplierScore).tier);
      if (tierDiff !== 0) return tierDiff;
      return b.supplierScore - a.supplierScore;
    });
  }
  else if (sortBy === "tier") filtered = [...filtered].sort((a, b) => tierRank(getSupplierTier(b.supplierScore).tier) - tierRank(getSupplierTier(a.supplierScore).tier) || b.supplierScore - a.supplierScore);
  else if (sortBy === "price-asc") filtered = [...filtered].sort((a, b) => a.pricePerUnit - b.pricePerUnit);
  else if (sortBy === "price-desc") filtered = [...filtered].sort((a, b) => b.pricePerUnit - a.pricePerUnit);
  else if (sortBy === "rating") filtered = [...filtered].sort((a, b) => b.supplierScore - a.supplierScore);
  else if (sortBy === "lead-time") filtered = [...filtered].sort((a, b) => a.leadTimeDays - b.leadTimeDays);

  const handleWishlist = (p: CatalogProduct) => {
    toggleWishlist(p.id);
    setWishlistState((prev) => ({ ...prev, [p.id]: !prev[p.id] }));
    toast({ title: wishlistState[p.id] ? "Removed from wishlist" : "Saved to wishlist" });
  };

  const handleCompare = (p: CatalogProduct) => {
    const list = toggleCompare(p.id);
    setCompareState((prev) => ({ ...prev, [p.id]: !prev[p.id] }));
    if (!compareState[p.id]) {
      toast({ title: "Added to compare", description: `${list.length}/4 products` });
    }
  };

  const activeFilters = (category !== "all" ? 1 : 0) + (stockOnly ? 1 : 0) + (priceRange[0] > 0 || priceRange[1] < maxPrice ? 1 : 0) + (minRating > 0 ? 1 : 0) + (minTier !== "any" ? 1 : 0);

  return (
    <div className="space-y-5">
      {/* Search + Sort bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search products, suppliers, materials..." value={query} onChange={(e) => setQuery(e.target.value)} className="pl-9" />
        </div>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="relevance">Relevance (Verified First)</SelectItem>
            <SelectItem value="tier">Verification Tier</SelectItem>
            <SelectItem value="price-asc">Price: Low to High</SelectItem>
            <SelectItem value="price-desc">Price: High to Low</SelectItem>
            <SelectItem value="rating">Highest Rated</SelectItem>
            <SelectItem value="lead-time">Fastest Delivery</SelectItem>
          </SelectContent>
        </Select>
        <Button
          variant={showFilters ? "default" : "outline"}
          onClick={() => setShowFilters(!showFilters)}
          className="shrink-0 relative"
        >
          <SlidersHorizontal className="h-4 w-4 mr-2" /> Filters
          {activeFilters > 0 && (
            <span className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-destructive text-destructive-foreground text-[10px] flex items-center justify-center">
              {activeFilters}
            </span>
          )}
        </Button>
      </div>

      {/* Advanced Filters Panel */}
      {showFilters && (
        <Card className="border-primary/20">
          <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-2 block">Category</label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {PRODUCT_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-2 block">
                Price Range: ₹{priceRange[0]} – ₹{priceRange[1]}
              </label>
              <Slider
                min={0}
                max={maxPrice}
                step={10}
                value={priceRange}
                onValueChange={setPriceRange}
                className="mt-3"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-2 block">
                Min Trust Score: {minRating || "Any"}
              </label>
              <Slider
                min={0}
                max={1000}
                step={50}
                value={[minRating]}
                onValueChange={([v]) => setMinRating(v)}
                className="mt-3"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-2 block flex items-center gap-1">
                <BadgeCheck className="h-3 w-3" /> Min. Verification Tier
              </label>
              <Select value={minTier} onValueChange={(v) => setMinTier(v as BadgeTier | "any")}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any tier</SelectItem>
                  <SelectItem value="bronze">Bronze+</SelectItem>
                  <SelectItem value="silver">Silver+</SelectItem>
                  <SelectItem value="gold">Gold+</SelectItem>
                  <SelectItem value="platinum">Platinum only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs font-medium text-muted-foreground">Quick Filters</label>
              <Button variant={stockOnly ? "default" : "outline"} size="sm" onClick={() => setStockOnly(!stockOnly)}>
                In Stock Only
              </Button>
              <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={() => {
                setCategory("all"); setStockOnly(false); setPriceRange([0, maxPrice]); setMinRating(0); setMinTier("any");
              }}>
                <X className="h-3 w-3 mr-1" /> Clear All
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{filtered.length} products found</p>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="text-xs" onClick={() => navigate("/wishlist")}>
            <Heart className="h-3.5 w-3.5 mr-1" /> Wishlist
          </Button>
          <Button variant="ghost" size="sm" className="text-xs" onClick={() => navigate("/compare")}>
            <GitCompareArrows className="h-3.5 w-3.5 mr-1" /> Compare
          </Button>
        </div>
      </div>

      {/* Product grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map((p) => (
          <Card key={p.id} className="hover:shadow-md transition-shadow group">
            <CardContent className="p-5">
              <div className="flex justify-between items-start mb-3">
                <Badge variant="outline" className="text-xs">{p.category}</Badge>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleWishlist(p)}>
                    <Heart className={`h-3.5 w-3.5 ${wishlistState[p.id] ? "fill-current text-destructive" : "text-muted-foreground"}`} />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleCompare(p)}>
                    <GitCompareArrows className={`h-3.5 w-3.5 ${compareState[p.id] ? "text-primary" : "text-muted-foreground"}`} />
                  </Button>
                  <Shield className="h-3.5 w-3.5 text-muted-foreground" />
                  <ScoreBadge score={p.supplierScore} />
                </div>
              </div>
              <h3
                className="font-semibold text-foreground group-hover:text-primary transition-colors cursor-pointer"
                onClick={() => navigate(`/product/${p.id}`)}
              >
                {p.name}
              </h3>
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
