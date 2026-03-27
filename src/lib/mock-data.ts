import { GSTInfo, TrustScore, CatalogProduct, RFQ, RFQResponse, Order, BuyerData } from "./types";

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
  "Manufacturing", "Chemicals & Petrochemicals", "Textiles & Apparel", "Food Processing",
  "Automotive & Auto Parts", "Electronics & Electrical", "Metals & Mining",
  "Pharmaceuticals", "Construction & Building Materials", "Packaging",
];

export const PRODUCT_CATEGORIES = [
  "Raw Materials", "Industrial Machinery", "Fasteners & Hardware", "Electrical Components",
  "Chemicals", "Packaging Materials", "Tools & Equipment", "Safety & PPE",
  "Pipes & Fittings", "Bearings & Gears",
];

export const UNITS = ["Kg", "Ton", "Piece", "Meter", "Liter", "Box", "Pack", "Set", "Roll", "Sq. Meter"];

export const DEFAULT_TRUST_SCORE: TrustScore = {
  overall: 420, delivery: 65, quality: 72, responseTime: 58, compliance: 80, transactionHistory: 45,
};

export function getSupplierFromStorage() {
  const data = localStorage.getItem("vyapar_supplier");
  return data ? JSON.parse(data) : null;
}

export function saveSupplierToStorage(data: unknown) {
  localStorage.setItem("vyapar_supplier", JSON.stringify(data));
}

// Buyer mock data
export const MOCK_CATALOG: CatalogProduct[] = [
  { id: "p1", name: "SS304 Hex Bolts M8x40", category: "Fasteners & Hardware", description: "High-grade stainless steel hex bolts, corrosion resistant", unit: "Piece", minOrderQty: 500, pricePerUnit: 12, specifications: "Material: SS304, Grade: A2-70, Thread: M8, Length: 40mm", inStock: true, leadTimeDays: 5, supplierId: "s1", supplierName: "Rajesh Fasteners Pvt Ltd", supplierScore: 780, supplierCity: "Ludhiana", supplierState: "Punjab" },
  { id: "p2", name: "Industrial Bearing 6205-2RS", category: "Bearings & Gears", description: "Deep groove ball bearing, double rubber sealed", unit: "Piece", minOrderQty: 100, pricePerUnit: 185, specifications: "Bore: 25mm, OD: 52mm, Width: 15mm, Dynamic Load: 14.8kN", inStock: true, leadTimeDays: 3, supplierId: "s2", supplierName: "National Engineering Co", supplierScore: 850, supplierCity: "Jamnagar", supplierState: "Gujarat" },
  { id: "p3", name: "GI Pipes 1.5 inch", category: "Pipes & Fittings", description: "Hot-dip galvanized steel pipes for plumbing and structural use", unit: "Meter", minOrderQty: 50, pricePerUnit: 320, specifications: "OD: 48.3mm, Wall: 3.25mm, IS:1239 Part 1, Medium Class", inStock: true, leadTimeDays: 7, supplierId: "s3", supplierName: "Tata Steel Distributors", supplierScore: 920, supplierCity: "Mumbai", supplierState: "Maharashtra" },
  { id: "p4", name: "PVC Insulated Copper Wire 2.5 sq mm", category: "Electrical Components", description: "Multi-strand copper conductor with PVC insulation", unit: "Meter", minOrderQty: 200, pricePerUnit: 28, specifications: "Conductor: 2.5 sq mm, Voltage: 1100V, IS:694, FR Grade", inStock: true, leadTimeDays: 4, supplierId: "s4", supplierName: "Polycab Wires Ltd", supplierScore: 890, supplierCity: "Halol", supplierState: "Gujarat" },
  { id: "p5", name: "HDPE Granules (Blow Grade)", category: "Raw Materials", description: "High-density polyethylene granules for blow molding", unit: "Kg", minOrderQty: 1000, pricePerUnit: 98, specifications: "MFI: 0.35 g/10min, Density: 0.952, Blow Molding Grade", inStock: false, leadTimeDays: 10, supplierId: "s5", supplierName: "Reliance Polymers", supplierScore: 950, supplierCity: "Navi Mumbai", supplierState: "Maharashtra" },
  { id: "p6", name: "Safety Helmet ISI Marked", category: "Safety & PPE", description: "Industrial safety helmet with ratchet adjustment", unit: "Piece", minOrderQty: 50, pricePerUnit: 210, specifications: "IS:2925, HDPE Shell, 6-Point Suspension, Weight: 350g", inStock: true, leadTimeDays: 2, supplierId: "s6", supplierName: "Karam Industries", supplierScore: 810, supplierCity: "Gurgaon", supplierState: "Haryana" },
  { id: "p7", name: "Corrugated Boxes (12x10x8)", category: "Packaging Materials", description: "3-ply corrugated shipping boxes, brown kraft", unit: "Piece", minOrderQty: 200, pricePerUnit: 18, specifications: "3-Ply, Flute: B, ECT: 32, Brown Kraft, Printed", inStock: true, leadTimeDays: 5, supplierId: "s7", supplierName: "Printpack India", supplierScore: 720, supplierCity: "Noida", supplierState: "Uttar Pradesh" },
  { id: "p8", name: "Sodium Hydroxide (Caustic Soda)", category: "Chemicals", description: "Industrial grade caustic soda flakes, 98% purity", unit: "Kg", minOrderQty: 500, pricePerUnit: 42, specifications: "Purity: 98% min, NaCl: 0.1% max, Fe: 10ppm max", inStock: true, leadTimeDays: 6, supplierId: "s8", supplierName: "Grasim Chemicals", supplierScore: 870, supplierCity: "Nagda", supplierState: "Madhya Pradesh" },
  { id: "p9", name: "Hydraulic Cylinder 50mm Bore", category: "Industrial Machinery", description: "Double-acting hydraulic cylinder for industrial applications", unit: "Piece", minOrderQty: 5, pricePerUnit: 8500, specifications: "Bore: 50mm, Stroke: 300mm, Pressure: 210 bar, Chrome Rod", inStock: true, leadTimeDays: 14, supplierId: "s9", supplierName: "Wipro Infrastructure", supplierScore: 830, supplierCity: "Bengaluru", supplierState: "Karnataka" },
  { id: "p10", name: "Cutting Tool Insert CNMG 120408", category: "Tools & Equipment", description: "Carbide turning insert for CNC machining", unit: "Piece", minOrderQty: 10, pricePerUnit: 320, specifications: "Grade: IC8250, Chipbreaker: PP, Coating: TiAlN PVD", inStock: true, leadTimeDays: 3, supplierId: "s10", supplierName: "Sandvik Coromant India", supplierScore: 960, supplierCity: "Pune", supplierState: "Maharashtra" },
];

const MOCK_RESPONSES: RFQResponse[] = [
  { id: "r1", supplierId: "s1", supplierName: "Rajesh Fasteners Pvt Ltd", supplierScore: 780, pricePerUnit: 11.5, totalPrice: 57500, leadTimeDays: 5, notes: "Can deliver in two batches. 10% advance required.", submittedAt: "2026-03-24T10:30:00Z" },
  { id: "r2", supplierId: "s11", supplierName: "Guru Nanak Bolts", supplierScore: 650, pricePerUnit: 10.8, totalPrice: 54000, leadTimeDays: 8, notes: "Best price for bulk. Full payment on delivery.", submittedAt: "2026-03-24T14:15:00Z" },
  { id: "r3", supplierId: "s12", supplierName: "Precision Fasteners Ltd", supplierScore: 890, pricePerUnit: 13.2, totalPrice: 66000, leadTimeDays: 3, notes: "Premium quality with test certificates. Express delivery available.", submittedAt: "2026-03-25T09:00:00Z" },
];

export const MOCK_RFQS: RFQ[] = [
  { id: "rfq1", title: "SS304 Hex Bolts M8 - 5000 pcs", category: "Fasteners & Hardware", description: "Require SS304 hex bolts M8x40 for automotive assembly line. Must meet ISO 4014 standards.", quantity: 5000, unit: "Piece", budget: 65000, deliveryDate: "2026-04-15", deliveryLocation: "Pune, Maharashtra", status: "responses", createdAt: "2026-03-22T08:00:00Z", responses: MOCK_RESPONSES },
  { id: "rfq2", title: "HDPE Granules Blow Grade - 5 Tons", category: "Raw Materials", description: "Need HDPE blow grade granules for bottle manufacturing. MFI 0.3-0.5 required.", quantity: 5000, unit: "Kg", budget: 500000, deliveryDate: "2026-04-20", deliveryLocation: "Ahmedabad, Gujarat", status: "sent", createdAt: "2026-03-24T12:00:00Z", responses: [] },
];

export const MOCK_ORDERS: Order[] = [
  { id: "ord1", rfqId: "rfq0", productName: "GI Pipes 1.5 inch - 200m", supplierName: "Tata Steel Distributors", supplierScore: 920, quantity: 200, unit: "Meter", pricePerUnit: 310, totalAmount: 62000, status: "shipped", orderDate: "2026-03-15", expectedDelivery: "2026-03-28", trackingId: "DTDC9283746" },
  { id: "ord2", productName: "Safety Helmets ISI - 100 pcs", supplierName: "Karam Industries", supplierScore: 810, quantity: 100, unit: "Piece", pricePerUnit: 205, totalAmount: 20500, status: "delivered", orderDate: "2026-03-10", expectedDelivery: "2026-03-14" },
  { id: "ord3", productName: "Cutting Tool Inserts CNMG - 50 pcs", supplierName: "Sandvik Coromant India", supplierScore: 960, quantity: 50, unit: "Piece", pricePerUnit: 315, totalAmount: 15750, status: "confirmed", orderDate: "2026-03-25", expectedDelivery: "2026-04-01" },
];

export function getBuyerFromStorage(): BuyerData {
  const data = localStorage.getItem("vyapar_buyer");
  return data ? JSON.parse(data) : { companyName: "Acme Manufacturing Ltd", rfqs: MOCK_RFQS, orders: MOCK_ORDERS };
}

export function saveBuyerToStorage(data: BuyerData) {
  localStorage.setItem("vyapar_buyer", JSON.stringify(data));
}
