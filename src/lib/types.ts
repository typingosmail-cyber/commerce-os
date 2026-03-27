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

// Buyer types
export interface CatalogProduct {
  id: string;
  name: string;
  category: string;
  description: string;
  unit: string;
  minOrderQty: number;
  pricePerUnit: number;
  specifications: string;
  inStock: boolean;
  leadTimeDays: number;
  supplierId: string;
  supplierName: string;
  supplierScore: number;
  supplierCity: string;
  supplierState: string;
}

export interface RFQ {
  id: string;
  title: string;
  category: string;
  description: string;
  quantity: number;
  unit: string;
  budget: number;
  deliveryDate: string;
  deliveryLocation: string;
  status: "draft" | "sent" | "responses" | "awarded" | "closed";
  createdAt: string;
  responses: RFQResponse[];
}

export interface RFQResponse {
  id: string;
  supplierId: string;
  supplierName: string;
  supplierScore: number;
  pricePerUnit: number;
  totalPrice: number;
  leadTimeDays: number;
  notes: string;
  submittedAt: string;
}

export interface Order {
  id: string;
  rfqId?: string;
  productName: string;
  supplierName: string;
  supplierScore: number;
  quantity: number;
  unit: string;
  pricePerUnit: number;
  totalAmount: number;
  status: "confirmed" | "processing" | "shipped" | "delivered" | "cancelled";
  orderDate: string;
  expectedDelivery: string;
  trackingId?: string;
}

export interface BuyerData {
  companyName: string;
  rfqs: RFQ[];
  orders: Order[];
}
