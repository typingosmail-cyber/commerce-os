import { GSTInfo, TrustScore, CatalogProduct, RFQ, RFQResponse, Order, BuyerData, SupplierProfile, CategoryGroup, Message, Inquiry } from "./types";

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

// Category groups (IndiaMart-style)
export const CATEGORY_GROUPS: CategoryGroup[] = [
  {
    name: "Building & Construction",
    icon: "building",
    heroImage: "/categories/building-construction.jpg",
    categories: [
      { name: "Cement & Concrete", productCount: 1240, image: "/categories/sub/cement-concrete.jpg" },
      { name: "Steel & TMT Bars", productCount: 890, image: "/categories/sub/steel-tmt-bars.jpg" },
      { name: "Pipes & Fittings", productCount: 1560, image: "/categories/sub/pipes-fittings.jpg" },
      { name: "Electrical Wiring", productCount: 720, image: "/categories/sub/electrical-wiring.jpg" },
      { name: "Paints & Coatings", productCount: 430, image: "/categories/sub/paints-coatings.jpg" },
      { name: "Construction Machines", productCount: 310, image: "/categories/sub/construction-machines.jpg" },
    ],
  },
  {
    name: "Industrial Machinery",
    icon: "cog",
    heroImage: "/categories/industrial-machinery.jpg",
    categories: [
      { name: "CNC Machines", productCount: 520, image: "/categories/sub/cnc-machines.jpg" },
      { name: "Hydraulic Equipment", productCount: 340, image: "/categories/sub/hydraulic-equipment.jpg" },
      { name: "Compressors", productCount: 280, image: "/categories/sub/compressors.jpg" },
      { name: "Welding Machines", productCount: 190, image: "/categories/sub/welding-machines.jpg" },
      { name: "Pumps & Motors", productCount: 670, image: "/categories/sub/pumps-motors.jpg" },
      { name: "Conveyor Systems", productCount: 150, image: "/categories/sub/conveyor-systems.jpg" },
    ],
  },
  {
    name: "Electronics & Electrical",
    icon: "zap",
    heroImage: "/categories/electronics-electrical.jpg",
    categories: [
      { name: "Cables & Wires", productCount: 890, image: "/categories/sub/cables-wires.jpg" },
      { name: "Switches & Sockets", productCount: 560, image: "/categories/sub/switches-sockets.jpg" },
      { name: "Transformers", productCount: 230, image: "/categories/sub/transformers.jpg" },
      { name: "Circuit Breakers", productCount: 410, image: "/categories/sub/circuit-breakers.jpg" },
      { name: "LED Lighting", productCount: 780, image: "/categories/sub/led-lighting.jpg" },
      { name: "Solar Panels", productCount: 320, image: "/categories/sub/solar-panels.jpg" },
    ],
  },
  {
    name: "Chemicals & Solvents",
    icon: "flask",
    heroImage: "/categories/chemicals-solvents.jpg",
    categories: [
      { name: "Industrial Chemicals", productCount: 1100, image: "/categories/sub/industrial-chemicals.jpg" },
      { name: "Adhesives & Sealants", productCount: 340, image: "/categories/sub/adhesives-sealants.jpg" },
      { name: "Lubricants & Oils", productCount: 280, image: "/categories/sub/lubricants-oils.jpg" },
      { name: "Cleaning Agents", productCount: 190, image: "/categories/sub/cleaning-agents.jpg" },
      { name: "Specialty Chemicals", productCount: 420, image: "/categories/sub/specialty-chemicals.jpg" },
      { name: "Water Treatment", productCount: 260, image: "/categories/sub/water-treatment.jpg" },
    ],
  },
  {
    name: "Packaging & Printing",
    icon: "package",
    heroImage: "/categories/packaging-printing.jpg",
    categories: [
      { name: "Corrugated Boxes", productCount: 670, image: "/categories/sub/corrugated-boxes.jpg" },
      { name: "Plastic Bags & Films", productCount: 890, image: "/categories/sub/plastic-bags-films.jpg" },
      { name: "Labels & Stickers", productCount: 340, image: "/categories/sub/labels-stickers.jpg" },
      { name: "Stretch Wraps", productCount: 180, image: "/categories/sub/stretch-wraps.jpg" },
      { name: "Printing Machines", productCount: 210, image: "/categories/sub/printing-machines.jpg" },
      { name: "Bottles & Containers", productCount: 520, image: "/categories/sub/bottles-containers.jpg" },
    ],
  },
  {
    name: "Safety & Protection",
    icon: "shield",
    heroImage: "/categories/safety-protection.jpg",
    categories: [
      { name: "Safety Helmets", productCount: 320, image: "/categories/sub/safety-helmets.jpg" },
      { name: "Safety Shoes", productCount: 450, image: "/categories/sub/safety-shoes.jpg" },
      { name: "Gloves & Masks", productCount: 680, image: "/categories/sub/gloves-masks.jpg" },
      { name: "Fire Safety", productCount: 290, image: "/categories/sub/fire-safety.jpg" },
      { name: "Safety Nets", productCount: 160, image: "/categories/sub/safety-nets.jpg" },
      { name: "CCTV & Security", productCount: 530, image: "/categories/sub/cctv-security.jpg" },
    ],
  },
];

// Supplier profiles for storefront pages
export const MOCK_SUPPLIERS: SupplierProfile[] = [
  {
    id: "s1", name: "Rajesh Fasteners Pvt Ltd", gstin: "03AABCR1234F1Z1",
    industry: "Manufacturing", subIndustry: "Fasteners",
    city: "Ludhiana", state: "Punjab",
    yearEstablished: "1998", employeeCount: "50-100",
    annualRevenue: "₹5-10 Cr", description: "Leading manufacturer of SS and MS fasteners with 25+ years of experience. ISO 9001:2015 certified.",
    contactEmail: "sales@rajeshfasteners.com", contactPhone: "+91-98765-43210",
    website: "www.rajeshfasteners.com", responseRate: 92, responseTime: "Within 4 hours",
    trustScore: { overall: 780, delivery: 82, quality: 85, responseTime: 78, compliance: 75, transactionHistory: 70 },
    products: ["SS304 Hex Bolts M8x40", "MS Hex Nuts M10", "Spring Washers", "Anchor Bolts"],
    certifications: ["ISO 9001:2015", "BIS Certified"],
    memberSince: "2019-03-15",
  },
  {
    id: "s2", name: "National Engineering Co", gstin: "24AABCN5678G1Z2",
    industry: "Manufacturing", subIndustry: "Bearings",
    city: "Jamnagar", state: "Gujarat",
    yearEstablished: "1985", employeeCount: "100-200",
    annualRevenue: "₹10-25 Cr", description: "Premium bearing manufacturer supplying to automotive and industrial sectors across India.",
    contactEmail: "info@nationalengg.com", contactPhone: "+91-99876-54321",
    website: "www.nationalengg.com", responseRate: 96, responseTime: "Within 2 hours",
    trustScore: { overall: 850, delivery: 90, quality: 92, responseTime: 88, compliance: 82, transactionHistory: 85 },
    products: ["Industrial Bearing 6205-2RS", "Tapered Roller Bearing", "Needle Bearing", "Thrust Bearing"],
    certifications: ["ISO 9001:2015", "ISO 14001:2015", "IATF 16949"],
    memberSince: "2018-06-20",
  },
  {
    id: "s3", name: "Tata Steel Distributors", gstin: "27AABCT9012H1Z3",
    industry: "Metals & Mining", subIndustry: "Steel",
    city: "Mumbai", state: "Maharashtra",
    yearEstablished: "1970", employeeCount: "500+",
    annualRevenue: "₹100+ Cr", description: "Authorized distributor of Tata Steel products. Largest network of steel distribution in Western India.",
    contactEmail: "orders@tatasteeldist.com", contactPhone: "+91-22-6789-0123",
    website: "www.tatasteeldist.com", responseRate: 98, responseTime: "Within 1 hour",
    trustScore: { overall: 920, delivery: 95, quality: 96, responseTime: 92, compliance: 90, transactionHistory: 95 },
    products: ["GI Pipes 1.5 inch", "TMT Bars Fe500D", "HR Coils", "CR Sheets", "Structural Steel"],
    certifications: ["ISO 9001:2015", "ISO 14001:2015", "SA 8000"],
    memberSince: "2017-01-10",
  },
  {
    id: "s4", name: "Polycab Wires Ltd", gstin: "24AABCP3456I1Z4",
    industry: "Electronics & Electrical", subIndustry: "Wires & Cables",
    city: "Halol", state: "Gujarat",
    yearEstablished: "1996", employeeCount: "200-500",
    annualRevenue: "₹50-100 Cr", description: "India's leading wires and cables manufacturer with pan-India presence.",
    contactEmail: "b2b@polycab.com", contactPhone: "+91-98765-12345",
    website: "www.polycab.com", responseRate: 94, responseTime: "Within 3 hours",
    trustScore: { overall: 890, delivery: 88, quality: 94, responseTime: 85, compliance: 92, transactionHistory: 88 },
    products: ["PVC Insulated Copper Wire 2.5 sq mm", "XLPE Cable", "Armoured Cable", "Solar Cable"],
    certifications: ["ISO 9001:2015", "BIS Certified", "NABL Accredited Lab"],
    memberSince: "2018-09-05",
  },
  {
    id: "s10", name: "Sandvik Coromant India", gstin: "27AABCS7890K1Z0",
    industry: "Manufacturing", subIndustry: "Cutting Tools",
    city: "Pune", state: "Maharashtra",
    yearEstablished: "1962", employeeCount: "500+",
    annualRevenue: "₹100+ Cr", description: "Global leader in metal cutting tools and tooling systems for manufacturing industry.",
    contactEmail: "india@sandvik.com", contactPhone: "+91-20-2740-1234",
    website: "www.sandvik.coromant.com", responseRate: 99, responseTime: "Within 1 hour",
    trustScore: { overall: 960, delivery: 98, quality: 99, responseTime: 95, compliance: 95, transactionHistory: 97 },
    products: ["Cutting Tool Insert CNMG 120408", "Milling Cutters", "Drilling Tools", "Boring Bars"],
    certifications: ["ISO 9001:2015", "ISO 14001:2015", "OHSAS 18001"],
    memberSince: "2017-07-01",
  },
];

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

// Mock inquiries
export const MOCK_INQUIRIES: Inquiry[] = [
  {
    id: "inq1",
    productName: "SS304 Hex Bolts M8x40",
    buyerName: "Acme Manufacturing",
    buyerEmail: "purchase@acme.com",
    buyerPhone: "+91-98765-00001",
    quantity: 5000,
    unit: "Piece",
    message: "Need urgent delivery. Can you match ₹11/pc for bulk?",
    supplierIds: ["s1"],
    status: "pending",
    createdAt: "2026-03-26T10:00:00Z",
  },
];

// Mock messages
export const MOCK_MESSAGES: Message[] = [
  { id: "m1", conversationId: "conv1", senderId: "buyer1", senderName: "Acme Manufacturing", senderType: "buyer", text: "Hi, we need 5000 SS304 Hex Bolts M8x40. Can you offer a better price for bulk?", timestamp: "2026-03-26T10:00:00Z" },
  { id: "m2", conversationId: "conv1", senderId: "s1", senderName: "Rajesh Fasteners Pvt Ltd", senderType: "supplier", text: "Hello! Yes, for 5000+ pieces we can offer ₹11.2/piece. Delivery in 5-7 days.", timestamp: "2026-03-26T10:15:00Z" },
  { id: "m3", conversationId: "conv1", senderId: "buyer1", senderName: "Acme Manufacturing", senderType: "buyer", text: "That works. Can you share the test certificates and delivery timeline?", timestamp: "2026-03-26T10:30:00Z" },
  { id: "m4", conversationId: "conv1", senderId: "s1", senderName: "Rajesh Fasteners Pvt Ltd", senderType: "supplier", text: "Sure! Attaching test certs. We can dispatch within 3 days of PO confirmation. 50% advance, 50% on delivery.", timestamp: "2026-03-26T11:00:00Z" },
  { id: "m5", conversationId: "conv2", senderId: "buyer1", senderName: "Acme Manufacturing", senderType: "buyer", text: "We're looking for GI Pipes 1.5 inch, 200 meters. What's your best price?", timestamp: "2026-03-27T09:00:00Z" },
  { id: "m6", conversationId: "conv2", senderId: "s3", senderName: "Tata Steel Distributors", senderType: "supplier", text: "For 200m we can offer ₹305/meter including delivery to Maharashtra. IS:1239 certified.", timestamp: "2026-03-27T09:20:00Z" },
];

export interface Conversation {
  id: string;
  participantId: string;
  participantName: string;
  participantType: "buyer" | "supplier";
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  productContext?: string;
}

export const MOCK_CONVERSATIONS: Conversation[] = [
  { id: "conv1", participantId: "s1", participantName: "Rajesh Fasteners Pvt Ltd", participantType: "supplier", lastMessage: "Sure! Attaching test certs. We can dispatch within 3 days...", lastMessageTime: "2026-03-26T11:00:00Z", unreadCount: 1, productContext: "SS304 Hex Bolts M8x40" },
  { id: "conv2", participantId: "s3", participantName: "Tata Steel Distributors", participantType: "supplier", lastMessage: "For 200m we can offer ₹305/meter including delivery...", lastMessageTime: "2026-03-27T09:20:00Z", unreadCount: 0, productContext: "GI Pipes 1.5 inch" },
];

export function getBuyerFromStorage(): BuyerData {
  const data = localStorage.getItem("vyapar_buyer");
  return data ? JSON.parse(data) : { companyName: "Acme Manufacturing Ltd", rfqs: MOCK_RFQS, orders: MOCK_ORDERS };
}

export function saveBuyerToStorage(data: BuyerData) {
  localStorage.setItem("vyapar_buyer", JSON.stringify(data));
}

export function getMessagesFromStorage(): Message[] {
  const data = localStorage.getItem("vyapar_messages");
  return data ? JSON.parse(data) : MOCK_MESSAGES;
}

export function saveMessagesToStorage(messages: Message[]) {
  localStorage.setItem("vyapar_messages", JSON.stringify(messages));
}

export function getInquiriesFromStorage(): Inquiry[] {
  const data = localStorage.getItem("vyapar_inquiries");
  return data ? JSON.parse(data) : MOCK_INQUIRIES;
}

export function saveInquiriesToStorage(inquiries: Inquiry[]) {
  localStorage.setItem("vyapar_inquiries", JSON.stringify(inquiries));
}
