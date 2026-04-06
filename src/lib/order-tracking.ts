// Order Tracking Engine — milestone-based status, ETA prediction, logistics

export interface TrackingMilestone {
  id: string;
  label: string;
  description: string;
  status: "completed" | "active" | "upcoming";
  timestamp?: string;
  location?: string;
  icon: "check" | "package" | "truck" | "warehouse" | "mappin" | "shield";
}

export interface LogisticsPartner {
  id: string;
  name: string;
  logo: string;
  trackingUrl: string;
  rating: number;
  onTimeRate: number;
}

export interface ETAPrediction {
  estimatedDate: string;
  confidence: number; // 0-100
  bestCase: string;
  worstCase: string;
  factors: ETAFactor[];
}

export interface ETAFactor {
  name: string;
  impact: "positive" | "negative" | "neutral";
  detail: string;
}

export interface TrackedOrder {
  id: string;
  orderId: string;
  productName: string;
  supplierName: string;
  buyerName: string;
  quantity: number;
  unit: string;
  totalAmount: number;
  status: "confirmed" | "processing" | "quality_check" | "dispatched" | "in_transit" | "out_for_delivery" | "delivered";
  milestones: TrackingMilestone[];
  eta: ETAPrediction;
  logistics: LogisticsPartner;
  trackingNumber: string;
  origin: string;
  destination: string;
  weight: string;
  lastUpdate: string;
  temperatureSensitive: boolean;
  insuranceValue: number;
  liveLocation?: { lat: number; lng: number; updatedAt: string };
}

export const LOGISTICS_PARTNERS: LogisticsPartner[] = [
  { id: "lp1", name: "BlueDart Express", logo: "🚚", trackingUrl: "https://bluedart.com/track/", rating: 4.5, onTimeRate: 94 },
  { id: "lp2", name: "Delhivery", logo: "📦", trackingUrl: "https://delhivery.com/track/", rating: 4.3, onTimeRate: 91 },
  { id: "lp3", name: "DTDC Logistics", logo: "🏷️", trackingUrl: "https://dtdc.com/track/", rating: 4.1, onTimeRate: 88 },
  { id: "lp4", name: "XpressBees", logo: "🐝", trackingUrl: "https://xpressbees.com/track/", rating: 4.4, onTimeRate: 92 },
];

function buildMilestones(status: TrackedOrder["status"]): TrackingMilestone[] {
  const stages: { key: TrackedOrder["status"]; label: string; desc: string; icon: TrackingMilestone["icon"] }[] = [
    { key: "confirmed", label: "Order Confirmed", desc: "Supplier accepted the order", icon: "check" },
    { key: "processing", label: "Processing", desc: "Being prepared & packaged", icon: "package" },
    { key: "quality_check", label: "Quality Check", desc: "QC inspection passed", icon: "shield" },
    { key: "dispatched", label: "Dispatched", desc: "Handed to logistics partner", icon: "warehouse" },
    { key: "in_transit", label: "In Transit", desc: "On the way to destination", icon: "truck" },
    { key: "out_for_delivery", label: "Out for Delivery", desc: "Last-mile delivery started", icon: "mappin" },
    { key: "delivered", label: "Delivered", desc: "Successfully received", icon: "check" },
  ];

  const currentIdx = stages.findIndex((s) => s.key === status);
  const now = new Date();

  return stages.map((s, i) => ({
    id: `ms-${i}`,
    label: s.label,
    description: s.desc,
    icon: s.icon,
    status: i < currentIdx ? "completed" as const : i === currentIdx ? "active" as const : "upcoming" as const,
    timestamp: i <= currentIdx ? new Date(now.getTime() - (currentIdx - i) * 86400000).toISOString() : undefined,
    location: i <= currentIdx ? ["Mumbai", "Pune", "Nagpur", "Delhi", "Gurgaon", "Noida", "Destination"][i] : undefined,
  }));
}

function predictETA(status: TrackedOrder["status"]): ETAPrediction {
  const daysLeft: Record<string, number> = {
    confirmed: 10, processing: 8, quality_check: 6, dispatched: 4, in_transit: 2, out_for_delivery: 1, delivered: 0,
  };
  const d = daysLeft[status] || 3;
  const est = new Date(Date.now() + d * 86400000);
  const best = new Date(Date.now() + Math.max(0, d - 1) * 86400000);
  const worst = new Date(Date.now() + (d + 2) * 86400000);

  return {
    estimatedDate: est.toISOString().split("T")[0],
    confidence: status === "delivered" ? 100 : status === "out_for_delivery" ? 95 : 75 + Math.floor(Math.random() * 15),
    bestCase: best.toISOString().split("T")[0],
    worstCase: worst.toISOString().split("T")[0],
    factors: [
      { name: "Route Congestion", impact: d > 4 ? "negative" : "neutral", detail: d > 4 ? "High traffic on NH-48 corridor" : "Normal traffic conditions" },
      { name: "Weather", impact: "positive", detail: "Clear skies along delivery route" },
      { name: "Supplier Rating", impact: "positive", detail: "Supplier has 94% on-time dispatch rate" },
      { name: "Logistics Partner", impact: "neutral", detail: "Partner averages 2.1 days for this lane" },
    ],
  };
}

export const MOCK_TRACKED_ORDERS: TrackedOrder[] = [
  {
    id: "trk-001", orderId: "ORD-2024-4521", productName: "Cold Rolled Steel Coils",
    supplierName: "Tata Steel Industries", buyerName: "Mahindra Auto Parts",
    quantity: 500, unit: "MT", totalAmount: 2450000,
    status: "in_transit",
    milestones: buildMilestones("in_transit"),
    eta: predictETA("in_transit"),
    logistics: LOGISTICS_PARTNERS[0],
    trackingNumber: "BD9847562310",
    origin: "Jamshedpur, Jharkhand", destination: "Pune, Maharashtra",
    weight: "500 MT", lastUpdate: new Date(Date.now() - 3600000).toISOString(),
    temperatureSensitive: false, insuranceValue: 2700000,
    liveLocation: { lat: 20.5937, lng: 78.9629, updatedAt: new Date(Date.now() - 1800000).toISOString() },
  },
  {
    id: "trk-002", orderId: "ORD-2024-4522", productName: "Pharmaceutical Grade Chemicals",
    supplierName: "Gujarat Chem Works", buyerName: "Sun Pharma Ltd",
    quantity: 200, unit: "KG", totalAmount: 890000,
    status: "quality_check",
    milestones: buildMilestones("quality_check"),
    eta: predictETA("quality_check"),
    logistics: LOGISTICS_PARTNERS[1],
    trackingNumber: "DL7483920156",
    origin: "Ahmedabad, Gujarat", destination: "Mumbai, Maharashtra",
    weight: "200 KG", lastUpdate: new Date(Date.now() - 7200000).toISOString(),
    temperatureSensitive: true, insuranceValue: 1000000,
  },
  {
    id: "trk-003", orderId: "ORD-2024-4523", productName: "Industrial Bearings SKF Series",
    supplierName: "Precision Engineering Co.", buyerName: "Bajaj Auto",
    quantity: 5000, unit: "PCS", totalAmount: 1750000,
    status: "out_for_delivery",
    milestones: buildMilestones("out_for_delivery"),
    eta: predictETA("out_for_delivery"),
    logistics: LOGISTICS_PARTNERS[3],
    trackingNumber: "XB2039485712",
    origin: "Chennai, Tamil Nadu", destination: "Aurangabad, Maharashtra",
    weight: "2.5 MT", lastUpdate: new Date(Date.now() - 900000).toISOString(),
    temperatureSensitive: false, insuranceValue: 1900000,
  },
  {
    id: "trk-004", orderId: "ORD-2024-4524", productName: "Organic Cotton Fabric Rolls",
    supplierName: "Tirupur Textiles", buyerName: "FabIndia Retail",
    quantity: 1000, unit: "Meters", totalAmount: 320000,
    status: "dispatched",
    milestones: buildMilestones("dispatched"),
    eta: predictETA("dispatched"),
    logistics: LOGISTICS_PARTNERS[2],
    trackingNumber: "DT5829173640",
    origin: "Tirupur, Tamil Nadu", destination: "Delhi, NCR",
    weight: "450 KG", lastUpdate: new Date(Date.now() - 5400000).toISOString(),
    temperatureSensitive: false, insuranceValue: 350000,
  },
];

export function getOrderProgress(order: TrackedOrder): number {
  const total = order.milestones.length;
  const done = order.milestones.filter((m) => m.status === "completed").length;
  const active = order.milestones.filter((m) => m.status === "active").length;
  return Math.round(((done + active * 0.5) / total) * 100);
}
