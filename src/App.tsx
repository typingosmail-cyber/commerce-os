import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CompareFloatingBar } from "@/components/CompareFloatingBar";
import { AuthProvider } from "@/lib/auth-context";
import { ReviewerAuthProvider } from "@/lib/reviewer-auth";
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
import DemandIntelligence from "./pages/DemandIntelligence";
import OrderTracking from "./pages/OrderTracking";
import SupplierAnalytics from "./pages/SupplierAnalytics";
import SupplierVerification from "./pages/SupplierVerification";
import BuyerCredit from "./pages/BuyerCredit";
import BuyerRiskAudit from "./pages/BuyerRiskAudit";
import FraudDetection from "./pages/FraudDetection";
import AdminReviewer from "./pages/AdminReviewer";
import TradeOS from "./pages/TradeOS";
import TradeOSConsole from "./pages/TradeOSConsole";
import NotFound from "./pages/NotFound";
import SolutionsHub from "./pages/SolutionsHub";
import DynamicPage from "./pages/DynamicPage";
import SocialFeed from "./pages/SocialFeed";
import CompanyProfile from "./pages/CompanyProfile";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <ReviewerAuthProvider>
      <NotificationProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/categories" element={<CategoryBrowse />} />
            <Route path="/feed" element={<SocialFeed />} />
            <Route path="/network/:id" element={<CompanyProfile />} />
            <Route path="/product/:id" element={<ProductDetail />} />

            <Route path="/compare" element={<CompareProducts />} />
            <Route path="/wishlist" element={<Wishlist />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/creator/dashboard" element={<CreatorDashboard />} />
            <Route path="/escrow" element={<EscrowCenter />} />
            <Route path="/intelligence" element={<DemandIntelligence />} />
            <Route path="/tracking" element={<OrderTracking />} />
            <Route path="/supplier/onboarding" element={<SupplierOnboarding />} />
            <Route path="/supplier/dashboard" element={<SupplierDashboard />} />
            <Route path="/supplier/analytics" element={<SupplierAnalytics />} />
            <Route path="/supplier/verification" element={<SupplierVerification />} />
            <Route path="/supplier/:id" element={<SupplierStorefront />} />
            <Route path="/buyer/dashboard" element={<BuyerDashboard />} />
            <Route path="/buyer/credit" element={<BuyerCredit />} />
            <Route path="/buyer/risk-audit" element={<BuyerRiskAudit />} />
            <Route path="/admin/fraud" element={<FraudDetection />} />
            <Route path="/admin/reviewer" element={<AdminReviewer />} />
            <Route path="/trade-os" element={<TradeOS />} />
            <Route path="/trade-os/:id" element={<TradeOSConsole />} />
            <Route path="/messages" element={<Messages />} />
            <Route path="/solutions" element={<SolutionsHub />} />
            <Route path="/p/:slug" element={<DynamicPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          <CompareFloatingBar />
        </BrowserRouter>
      </TooltipProvider>
      </NotificationProvider>
      </ReviewerAuthProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
