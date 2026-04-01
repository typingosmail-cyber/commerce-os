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

// Category browsing types
export interface SubCategory {
  name: string;
  productCount: number;
  image: string;
}

export interface CategoryGroup {
  name: string;
  icon: string;
  heroImage?: string;
  categories: SubCategory[];
}

// Supplier storefront
export interface SupplierProfile {
  id: string;
  name: string;
  gstin: string;
  industry: string;
  subIndustry: string;
  city: string;
  state: string;
  yearEstablished: string;
  employeeCount: string;
  annualRevenue: string;
  description: string;
  contactEmail: string;
  contactPhone: string;
  website: string;
  responseRate: number;
  responseTime: string;
  trustScore: TrustScore;
  products: string[];
  certifications: string[];
  memberSince: string;
}

// Messaging types
export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderType: "buyer" | "supplier";
  text: string;
  timestamp: string;
}

// Inquiry / Get Best Price
export interface Inquiry {
  id: string;
  productName: string;
  buyerName: string;
  buyerEmail: string;
  buyerPhone: string;
  quantity: number;
  unit: string;
  message: string;
  supplierIds: string[];
  status: "pending" | "responded" | "closed";
  createdAt: string;
}
