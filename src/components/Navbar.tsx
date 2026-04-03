import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Search, Bell, ShoppingCart, User, Menu, X, MessageCircle,
  Grid3X3, Building2, ChevronDown, LogIn, UserPlus, Heart,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const NAV_LINKS = [
  { label: "Categories", path: "/categories", icon: Grid3X3 },
  { label: "Compare", path: "/compare", icon: Heart },
  { label: "Messages", path: "/messages", icon: MessageCircle },
];

export function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/categories?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <header className="border-b bg-card/95 backdrop-blur-sm sticky top-0 z-50">
      {/* Top bar */}
      <div className="bg-primary text-primary-foreground">
        <div className="container flex items-center justify-between py-1 text-[11px]">
          <div className="flex items-center gap-4">
            <span>India's Trusted B2B Marketplace</span>
            <span className="hidden md:inline text-primary-foreground/70">|</span>
            <span className="hidden md:inline text-primary-foreground/70">24/7 Buyer Support: 1800-XXX-XXXX</span>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => navigate("/supplier/onboarding")} className="hover:underline">
              Sell on Vyapar OS
            </button>
            <span className="text-primary-foreground/50">|</span>
            <button className="hover:underline">Help</button>
          </div>
        </div>
      </div>

      {/* Main nav */}
      <div className="container flex items-center gap-4 py-3">
        {/* Logo */}
        <div
          className="flex items-center gap-2 cursor-pointer shrink-0"
          onClick={() => navigate("/")}
        >
          <div className="h-9 w-9 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-sm">V</span>
          </div>
          <div className="hidden sm:block">
            <span className="font-bold text-foreground text-lg leading-none">Vyapar OS</span>
            <p className="text-[9px] text-muted-foreground leading-none mt-0.5">B2B Commerce Platform</p>
          </div>
        </div>

        {/* Search bar */}
        <form onSubmit={handleSearch} className="flex-1 max-w-2xl hidden md:flex">
          <div className="flex w-full border border-border rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-ring">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="rounded-none border-r text-xs text-muted-foreground h-10 px-3 shrink-0">
                  All Categories <ChevronDown className="h-3 w-3 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem onClick={() => navigate("/categories?group=Building & Construction")}>Building & Construction</DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/categories?group=Industrial Machinery")}>Industrial Machinery</DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/categories?group=Electronics & Electrical")}>Electronics & Electrical</DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/categories?group=Chemicals & Solvents")}>Chemicals & Solvents</DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/categories?group=Packaging & Printing")}>Packaging & Printing</DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/categories?group=Safety & Protection")}>Safety & Protection</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Input
              placeholder="Search for products, suppliers, or services..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="border-0 rounded-none h-10 focus-visible:ring-0 text-sm"
            />
            <Button type="submit" size="sm" className="rounded-none h-10 px-4">
              <Search className="h-4 w-4" />
            </Button>
          </div>
        </form>

        {/* Right actions */}
        <div className="flex items-center gap-1 shrink-0">
          {NAV_LINKS.map((link) => (
            <Button
              key={link.path}
              variant={location.pathname === link.path ? "secondary" : "ghost"}
              size="sm"
              className="hidden lg:flex text-xs"
              onClick={() => navigate(link.path)}
            >
              <link.icon className="h-4 w-4 mr-1" />
              {link.label}
            </Button>
          ))}

          <Button variant="ghost" size="icon" className="relative" onClick={() => navigate("/messages")}>
            <Bell className="h-4 w-4" />
            <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-destructive text-destructive-foreground text-[9px] flex items-center justify-center">3</span>
          </Button>

          <Button variant="ghost" size="icon" className="hidden sm:flex" onClick={() => navigate("/wishlist")}>
            <Heart className="h-4 w-4" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <User className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => navigate("/buyer/dashboard")}>
                <ShoppingCart className="h-4 w-4 mr-2" /> Buyer Dashboard
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/supplier/dashboard")}>
                <Building2 className="h-4 w-4 mr-2" /> Supplier Dashboard
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <LogIn className="h-4 w-4 mr-2" /> Sign In
              </DropdownMenuItem>
              <DropdownMenuItem>
                <UserPlus className="h-4 w-4 mr-2" /> Create Account
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            size="sm"
            className="hidden sm:flex text-xs"
            onClick={() => navigate("/supplier/onboarding")}
          >
            <Building2 className="h-3 w-3 mr-1" /> List Your Business
          </Button>

          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile search + nav */}
      {mobileOpen && (
        <div className="md:hidden border-t px-4 py-3 space-y-3 bg-card">
          <form onSubmit={handleSearch} className="flex gap-2">
            <Input
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 text-sm"
            />
            <Button type="submit" size="sm"><Search className="h-4 w-4" /></Button>
          </form>
          <div className="flex flex-col gap-1">
            {NAV_LINKS.map((link) => (
              <Button
                key={link.path}
                variant="ghost"
                size="sm"
                className="justify-start"
                onClick={() => { navigate(link.path); setMobileOpen(false); }}
              >
                <link.icon className="h-4 w-4 mr-2" /> {link.label}
              </Button>
            ))}
            <Button variant="ghost" size="sm" className="justify-start" onClick={() => { navigate("/buyer/dashboard"); setMobileOpen(false); }}>
              <ShoppingCart className="h-4 w-4 mr-2" /> Buyer Dashboard
            </Button>
            <Button variant="ghost" size="sm" className="justify-start" onClick={() => { navigate("/supplier/onboarding"); setMobileOpen(false); }}>
              <Building2 className="h-4 w-4 mr-2" /> Become a Supplier
            </Button>
          </div>
        </div>
      )}
    </header>
  );
}
