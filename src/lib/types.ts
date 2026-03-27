export interface GSTInfo {
  gstin: string;
  legalName: string;
  tradeName: string;
  address: string;
  state: string;
  status: string;
  registrationDate: string;
  businessType: string;
}

export interface BusinessProfile {
  companyName: string;
  industry: string;
  subIndustry: string;
  yearEstablished: string;
  employeeCount: string;
  annualRevenue: string;
  description: string;
  website: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  logo?: string;
}

export interface Product {
  id: string;
  name: string;
  category: string;
  description: string;
  unit: string;
  minOrderQty: number;
  pricePerUnit: number;
  specifications: string;
  images: string[];
  inStock: boolean;
  leadTimeDays: number;
}

export interface TrustScore {
  overall: number;
  delivery: number;
  quality: number;
  responseTime: number;
  compliance: number;
  transactionHistory: number;
}

export interface SupplierData {
  gstInfo: GSTInfo | null;
  profile: BusinessProfile | null;
  products: Product[];
  trustScore: TrustScore;
  onboardingStep: number;
  onboardingComplete: boolean;
}
