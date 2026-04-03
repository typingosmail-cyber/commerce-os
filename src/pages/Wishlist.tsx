import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { MOCK_CATALOG } from "@/lib/mock-data";
import { getWishlist, toggleWishlist } from "@/lib/wishlist";
import {
  Heart, Star, MapPin, Clock, Trash2, ShoppingCart, ArrowLeft,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

export default function Wishlist() {
  const navigate = useNavigate();
  const [wishlistIds, setWishlistIds] = useState<string[]>(getWishlist());

  useEffect(() => {
    const handler = () => setWishlistIds(getWishlist());
    window.addEventListener("wishlist-change", handler);
    return () => window.removeEventListener("wishlist-change", handler);
  }, []);

  const products = wishlistIds.map((id) => MOCK_CATALOG.find((p) => p.id === id)).filter(Boolean) as typeof MOCK_CATALOG;

  const handleRemove = (id: string) => {
    toggleWishlist(id);
    setWishlistIds(getWishlist());
    toast({ title: "Removed from wishlist" });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="container py-6 space-y-6 flex-1">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Heart className="h-6 w-6 text-destructive fill-current" /> My Wishlist
            </h1>
            <p className="text-sm text-muted-foreground">{products.length} saved products</p>
          </div>
        </div>

        {products.length === 0 ? (
          <Card>
            <CardContent className="p-16 text-center">
              <Heart className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
              <h2 className="text-xl font-semibold text-foreground">Your wishlist is empty</h2>
              <p className="text-muted-foreground mt-2">Save products you're interested in for quick access</p>
              <Button className="mt-4" onClick={() => navigate("/categories")}>Browse Products</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {products.map((p) => (
              <Card key={p.id} className="hover:shadow-md transition-shadow group">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-2">
                    <Badge variant="outline" className="text-xs">{p.category}</Badge>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleRemove(p.id)}>
                      <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                    </Button>
                  </div>
                  <h3
                    className="font-semibold text-foreground group-hover:text-primary transition-colors cursor-pointer"
                    onClick={() => navigate(`/product/${p.id}`)}
                  >
                    {p.name}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{p.description}</p>
                  <div className="flex items-center gap-3 mt-3 text-sm">
                    <span className="font-bold text-foreground">₹{p.pricePerUnit}/{p.unit}</span>
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" /> {p.leadTimeDays}d
                    </span>
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Star className="h-3.5 w-3.5 fill-current text-yellow-500" /> {p.supplierScore}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3" /> {p.supplierName} • {p.supplierCity}
                  </div>
                  <div className="flex gap-2 mt-4">
                    <Button size="sm" className="flex-1" onClick={() => navigate(`/product/${p.id}`)}>
                      View Details
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => navigate("/buyer/dashboard")}>
                      <ShoppingCart className="h-3.5 w-3.5 mr-1" /> Get Quote
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
