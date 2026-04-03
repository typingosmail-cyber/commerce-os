import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { GSTVerification } from "@/components/supplier/GSTVerification";
import { BusinessProfileForm } from "@/components/supplier/BusinessProfileForm";
import { ProductListing } from "@/components/supplier/ProductListing";
import { OnboardingStepper } from "@/components/supplier/OnboardingStepper";
import { GSTInfo, BusinessProfile, Product, SupplierData } from "@/lib/types";
import { DEFAULT_TRUST_SCORE, getSupplierFromStorage, saveSupplierToStorage } from "@/lib/mock-data";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

const STEPS = [
  { label: "GST Verification", description: "Verify business identity" },
  { label: "Business Profile", description: "Company details" },
  { label: "Product Catalog", description: "List your products" },
];

export default function SupplierOnboarding() {
  const navigate = useNavigate();
  const [data, setData] = useState<SupplierData>(() => {
    const saved = getSupplierFromStorage();
    return saved || {
      gstInfo: null,
      profile: null,
      products: [],
      trustScore: DEFAULT_TRUST_SCORE,
      onboardingStep: 0,
      onboardingComplete: false,
    };
  });

  useEffect(() => {
    saveSupplierToStorage(data);
  }, [data]);

  useEffect(() => {
    if (data.onboardingComplete) {
      navigate("/supplier/dashboard");
    }
  }, [data.onboardingComplete, navigate]);

  const handleGSTVerified = (gstInfo: GSTInfo) => {
    setData((prev) => ({ ...prev, gstInfo, onboardingStep: 1 }));
  };

  const handleProfileComplete = (profile: BusinessProfile) => {
    setData((prev) => ({ ...prev, profile, onboardingStep: 2 }));
  };

  const handleProductsComplete = (products: Product[]) => {
    setData((prev) => ({ ...prev, products, onboardingComplete: true, onboardingStep: 3 }));
  };

  const goBack = () => {
    if (data.onboardingStep > 0) {
      setData((prev) => ({ ...prev, onboardingStep: prev.onboardingStep - 1 }));
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      {/* Back button for onboarding steps */}
      {data.onboardingStep > 0 && (
        <div className="container max-w-4xl pt-4">
          <Button variant="ghost" size="sm" onClick={goBack}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
        </div>
      )}

      {/* Stepper */}
      <div className="container max-w-4xl py-6">
        <OnboardingStepper currentStep={data.onboardingStep} steps={STEPS} />
      </div>

      {/* Content */}
      <main className="container max-w-4xl pb-16">
        {data.onboardingStep === 0 && (
          <GSTVerification onVerified={handleGSTVerified} initialData={data.gstInfo} />
        )}
        {data.onboardingStep === 1 && data.gstInfo && (
          <BusinessProfileForm gstInfo={data.gstInfo} onComplete={handleProfileComplete} initialData={data.profile} />
        )}
        {data.onboardingStep === 2 && (
          <ProductListing products={data.products} onComplete={handleProductsComplete} />
        )}
      </main>
      <Footer />
    </div>
  );
}
