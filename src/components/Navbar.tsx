import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useAuth, type UserRole } from "@/lib/auth-context";
import { AuthModal } from "@/components/AuthModal";
import {
  Search, ShoppingCart, Menu, X, MessageCircle,
  Grid3X3, Building2, ChevronDown, Heart, Crown, Shield,
  LogOut, IndianRupee, ArrowRightLeft, Wallet,
} from "lucide-react";
import { NotificationCenter } from "@/components/NotificationCenter";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";

const NAV_LINKS = [
  { label: "Categories", path: "/categories", icon: Grid3X3 },
  { label: "Compare", path: "/compare", icon: Heart },
  { label: "Messages", path: "/messages", icon: MessageCircle },
];

const ROLE_CONFIG: Record<UserRole, { label: string; icon: React.ElementType; color: string; dashboard: string }> = {
  buyer: { label: "Buyer", icon: ShoppingCart, color: "bg-primary text-primary-foreground", dashboard: "/buyer/dashboard" },
  seller: { label: "Seller", icon: Building2, color: "bg-success text-success-foreground", dashboard: "/supplier/dashboard" },
  creator: { label: "Creator", icon: Crown, color: "bg-secondary text-secondary-foreground", dashboard: "/creator/dashboard" },
};

export function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isLoggedIn, logout, switchRole } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAuth, setShowAuth] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/categories?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const activeRole = user?.activeRole ? ROLE_CONFIG[user.activeRole] : null;

  return (
    <>
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
              <button onClick={() => navigate("/pricing")} className="hover:underline">
                Pricing & Plans
              </button>
              <span className="text-primary-foreground/50">|</span>
              <button onClick={() => navigate("/escrow")} className="hover:underline flex items-center gap-1">
                <Shield className="h-3 w-3" /> Transaction Protection
              </button>
              <span className="text-primary-foreground/50">|</span>
              <button onClick={() => navigate("/supplier/onboarding")} className="hover:underline">
                Sell on Vyapar OS
              </button>
            </div>
          </div>
        </div>

        {/* Main nav */}
        <div className="container flex items-center gap-4 py-3">
          {/* Logo */}
          <div className="flex items-center gap-2 cursor-pointer shrink-0" onClick={() => navigate("/")}>
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
                  {["Building & Construction", "Industrial Machinery", "Electronics & Electrical", "Chemicals & Solvents", "Packaging & Printing", "Safety & Protection"].map(g => (
                    <DropdownMenuItem key={g} onClick={() => navigate(`/categories?group=${g}`)}>{g}</DropdownMenuItem>
                  ))}
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
                <link.icon className="h-4 w-4 mr-1" /> {link.label}
              </Button>
            ))}

            <Button variant="ghost" size="icon" className="relative" onClick={() => navigate("/messages")}>
              <Bell className="h-4 w-4" />
              <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-destructive text-destructive-foreground text-[9px] flex items-center justify-center">3</span>
            </Button>

            <Button variant="ghost" size="icon" className="hidden sm:flex" onClick={() => navigate("/wishlist")}>
              <Heart className="h-4 w-4" />
            </Button>

            {/* Role switcher + User menu */}
            {isLoggedIn && user ? (
              <div className="flex items-center gap-1">
                {/* Role switcher */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="text-xs h-8 gap-1 hidden sm:flex">
                      <ArrowRightLeft className="h-3 w-3" />
                      {activeRole && (
                        <Badge className={`${activeRole.color} text-[9px] px-1.5 py-0`}>
                          {activeRole.label}
                        </Badge>
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuLabel className="text-xs">Switch Role</DropdownMenuLabel>
                    {(["buyer", "seller", "creator"] as UserRole[]).map(role => {
                      const cfg = ROLE_CONFIG[role];
                      return (
                        <DropdownMenuItem key={role} onClick={() => { switchRole(role); navigate(cfg.dashboard); }} className="gap-2">
                          <cfg.icon className="h-4 w-4" />
                          <span>{cfg.label} Mode</span>
                          {user.activeRole === role && <Badge variant="outline" className="ml-auto text-[9px]">Active</Badge>}
                        </DropdownMenuItem>
                      );
                    })}
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* User menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="gap-2 h-8">
                      <div className="h-7 w-7 rounded-full bg-primary flex items-center justify-center">
                        <span className="text-primary-foreground text-[10px] font-bold">{user.avatar}</span>
                      </div>
                      <span className="hidden md:inline text-xs">{user.name.split(" ")[0]}</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <div className="p-3 border-b">
                      <p className="font-semibold text-foreground text-sm">{user.name}</p>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline" className="text-[9px]">
                          <Wallet className="h-3 w-3 mr-1" /> {user.creditsRemaining} credits
                        </Badge>
                        <Badge variant="outline" className="text-[9px] capitalize">{user.plan} plan</Badge>
                      </div>
                    </div>
                    <DropdownMenuItem onClick={() => navigate("/buyer/dashboard")}>
                      <ShoppingCart className="h-4 w-4 mr-2" /> Buyer Dashboard
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate("/supplier/dashboard")}>
                      <Building2 className="h-4 w-4 mr-2" /> Seller Dashboard
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate("/creator/dashboard")}>
                      <Crown className="h-4 w-4 mr-2" /> Creator Dashboard
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => navigate("/escrow")}>
                      <Shield className="h-4 w-4 mr-2" /> Escrow Center
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate("/pricing")}>
                      <IndianRupee className="h-4 w-4 mr-2" /> Plans & Pricing
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={logout} className="text-destructive">
                      <LogOut className="h-4 w-4 mr-2" /> Sign Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ) : (
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" className="text-xs" onClick={() => setShowAuth(true)}>
                  Sign In
                </Button>
                <Button size="sm" className="text-xs" onClick={() => setShowAuth(true)}>
                  Get Started
                </Button>
              </div>
            )}

            <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobileOpen(!mobileOpen)}>
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="md:hidden border-t px-4 py-3 space-y-3 bg-card">
            <form onSubmit={handleSearch} className="flex gap-2">
              <Input placeholder="Search products..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="h-9 text-sm" />
              <Button type="submit" size="sm"><Search className="h-4 w-4" /></Button>
            </form>
            <div className="flex flex-col gap-1">
              {NAV_LINKS.map((link) => (
                <Button key={link.path} variant="ghost" size="sm" className="justify-start" onClick={() => { navigate(link.path); setMobileOpen(false); }}>
                  <link.icon className="h-4 w-4 mr-2" /> {link.label}
                </Button>
              ))}
              {isLoggedIn ? (
                <>
                  <div className="flex gap-1 py-1">
                    {(["buyer", "seller", "creator"] as UserRole[]).map(role => {
                      const cfg = ROLE_CONFIG[role];
                      return (
                        <Button key={role} variant={user?.activeRole === role ? "default" : "outline"} size="sm" className="flex-1 text-xs" onClick={() => { switchRole(role); navigate(cfg.dashboard); setMobileOpen(false); }}>
                          <cfg.icon className="h-3 w-3 mr-1" /> {cfg.label}
                        </Button>
                      );
                    })}
                  </div>
                  <Button variant="ghost" size="sm" className="justify-start" onClick={() => { navigate("/escrow"); setMobileOpen(false); }}>
                    <Shield className="h-4 w-4 mr-2" /> Escrow Center
                  </Button>
                  <Button variant="ghost" size="sm" className="justify-start text-destructive" onClick={() => { logout(); setMobileOpen(false); }}>
                    <LogOut className="h-4 w-4 mr-2" /> Sign Out
                  </Button>
                </>
              ) : (
                <Button size="sm" onClick={() => { setShowAuth(true); setMobileOpen(false); }}>
                  Sign In / Create Account
                </Button>
              )}
            </div>
          </div>
        )}
      </header>

      <AuthModal open={showAuth} onClose={() => setShowAuth(false)} />
    </>
  );
}
