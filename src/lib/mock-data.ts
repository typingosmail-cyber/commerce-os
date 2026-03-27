import { GSTInfo, TrustScore } from "./types";

export const MOCK_GST_DATA: Record<string, GSTInfo> = {
  "27AABCU9603R1ZM": {
    gstin: "27AABCU9603R1ZM",
    legalName: "ULTRATECH CEMENT LTD",
    tradeName: "UltraTech Cement",
    address: "B Wing, Ahura Centre, 2nd Floor, Mahakali Caves Road, Andheri East",
    state: "Maharashtra",
    status: "Active",
    registrationDate: "2017-07-01",
    businessType: "Private Limited Company",
  },
  "29AAGCB7383J1ZL": {
    gstin: "29AAGCB7383J1ZL",
    legalName: "BHARAT FORGE LIMITED",
    tradeName: "Bharat Forge",
    address: "Mundhwa, Pune-Nagar Road",
    state: "Karnataka",
    status: "Active",
    registrationDate: "2017-07-01",
    businessType: "Public Limited Company",
  },
};

export const INDUSTRIES = [
  "Manufacturing",
  "Chemicals & Petrochemicals",
  "Textiles & Apparel",
  "Food Processing",
  "Automotive & Auto Parts",
  "Electronics & Electrical",
  "Metals & Mining",
  "Pharmaceuticals",
  "Construction & Building Materials",
  "Packaging",
];

export const PRODUCT_CATEGORIES = [
  "Raw Materials",
  "Industrial Machinery",
  "Fasteners & Hardware",
  "Electrical Components",
  "Chemicals",
  "Packaging Materials",
  "Tools & Equipment",
  "Safety & PPE",
  "Pipes & Fittings",
  "Bearings & Gears",
];

export const UNITS = ["Kg", "Ton", "Piece", "Meter", "Liter", "Box", "Pack", "Set", "Roll", "Sq. Meter"];

export const DEFAULT_TRUST_SCORE: TrustScore = {
  overall: 420,
  delivery: 65,
  quality: 72,
  responseTime: 58,
  compliance: 80,
  transactionHistory: 45,
};

export function getSupplierFromStorage() {
  const data = localStorage.getItem("vyapar_supplier");
  return data ? JSON.parse(data) : null;
}

export function saveSupplierToStorage(data: unknown) {
  localStorage.setItem("vyapar_supplier", JSON.stringify(data));
}
