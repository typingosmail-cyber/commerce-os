import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CompareFloatingBar } from "@/components/CompareFloatingBar";
import { AuthProvider } from "@/lib/auth-context";
import { NotificationProvider } from "@/lib/notifications";
import Index from "./pages/Index";
import SupplierOnboarding from "./pages/SupplierOnboarding";
import SupplierDashboard from "./pages/SupplierDashboard";
import BuyerDashboard from "./pages/BuyerDashboard";
import CategoryBrowse from "./pages/CategoryBrowse";
import SupplierStorefront from "./pages/SupplierStorefront";
import Messages from "./pages/Messages";
import ProductDetail from "./pages/ProductDetail";
import CompareProducts from "./pages/CompareProducts";
import Wishlist from "./pages/Wishlist";
import Pricing from "./pages/Pricing";
import CreatorDashboard from "./pages/CreatorDashboard";
import EscrowCenter from "./pages/EscrowCenter";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/categories" element={<CategoryBrowse />} />
            <Route path="/product/:id" element={<ProductDetail />} />
            <Route path="/compare" element={<CompareProducts />} />
            <Route path="/wishlist" element={<Wishlist />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/creator/dashboard" element={<CreatorDashboard />} />
            <Route path="/escrow" element={<EscrowCenter />} />
            <Route path="/supplier/onboarding" element={<SupplierOnboarding />} />
            <Route path="/supplier/dashboard" element={<SupplierDashboard />} />
            <Route path="/supplier/:id" element={<SupplierStorefront />} />
            <Route path="/buyer/dashboard" element={<BuyerDashboard />} />
            <Route path="/messages" element={<Messages />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          <CompareFloatingBar />
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
