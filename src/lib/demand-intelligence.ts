import { CatalogProduct } from "@/lib/types";

export interface DemandPrediction {
  id: string;
  category: string;
  product: string;
  predictedDemand: number; // units per month
  confidence: number; // 0-100
  trend: "rising" | "stable" | "declining";
  changePercent: number;
  topRegions: string[];
  seasonality: string;
  aiInsight: string;
}

export interface PriceForecast {
  product: string;
  category: string;
  currentPrice: number;
  unit: string;
  forecast: { month: string; predicted: number; lower: number; upper: number; actual?: number }[];
  recommendation: "buy_now" | "wait" | "negotiate";
  aiReason: string;
  volatilityIndex: number; // 0-100
}

export interface AutoMatchSuggestion {
  id: string;
  buyerNeed: string;
  buyerLocation: string;
  quantity: number;
  unit: string;
  budget: number;
  matchedSuppliers: {
    name: string;
    city: string;
    score: number;
    price: number;
    matchReason: string;
    confidence: number;
  }[];
  matchScore: number;
  urgency: "high" | "medium" | "low";
  postedAgo: string;
}

export interface MarketSignal {
  id: string;
  type: "price_drop" | "demand_surge" | "supply_shortage" | "new_regulation" | "seasonal";
  title: string;
  description: string;
  impact: "high" | "medium" | "low";
  category: string;
  timestamp: string;
  actionable: boolean;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const NOW_MONTH = new Date().getMonth();

function futureMonths(count: number) {
  return Array.from({ length: count }, (_, i) => MONTHS[(NOW_MONTH + i) % 12]);
}

export const DEMAND_PREDICTIONS: DemandPrediction[] = [
  {
    id: "dp1", category: "Building & Construction", product: "TMT Steel Bars (Fe500D)",
    predictedDemand: 42000, confidence: 91, trend: "rising", changePercent: 18,
    topRegions: ["Maharashtra", "Gujarat", "Karnataka"],
    seasonality: "Peak: Oct-Mar (construction season)",
    aiInsight: "Government infra spending up 23% YoY. Smart Cities Mission Phase 3 driving demand in Tier-2 cities. Recommend increasing inventory by 15-20%.",
  },
  {
    id: "dp2", category: "Electronics & Electrical", product: "PVC Copper Wire 2.5mm",
    predictedDemand: 28500, confidence: 87, trend: "rising", changePercent: 12,
    topRegions: ["Delhi NCR", "Tamil Nadu", "Telangana"],
    seasonality: "Steady demand, slight dip in monsoon",
    aiInsight: "Real estate boom in Tier-1 cities and EV charging infra expansion are key drivers. Copper prices expected to stabilize in Q3.",
  },
  {
    id: "dp3", category: "Chemicals & Solvents", product: "HDPE Granules (Blow Grade)",
    predictedDemand: 15200, confidence: 78, trend: "stable", changePercent: 3,
    topRegions: ["Gujarat", "Rajasthan", "Madhya Pradesh"],
    seasonality: "Flat year-round with packaging spikes in festive season",
    aiInsight: "Packaging industry growth at 8% CAGR. Sustainability shift may increase recycled HDPE demand. Monitor government plastic regulation updates.",
  },
  {
    id: "dp4", category: "Safety & Protection", product: "Safety Helmets (ISI Certified)",
    predictedDemand: 8900, confidence: 94, trend: "rising", changePercent: 32,
    topRegions: ["All India"],
    seasonality: "Peak during construction season and compliance audits",
    aiInsight: "New OSHA-equivalent regulations mandate site safety compliance. 32% demand surge expected. First-mover advantage for certified suppliers.",
  },
  {
    id: "dp5", category: "Industrial Machinery", product: "Hydraulic Cylinders (50-100mm)",
    predictedDemand: 3400, confidence: 72, trend: "declining", changePercent: -8,
    topRegions: ["Punjab", "Haryana", "UP"],
    seasonality: "Agricultural season dependent",
    aiInsight: "Shift to electric actuators in some segments. However, retrofit market remains strong. Focus on replacement parts and customization services.",
  },
  {
    id: "dp6", category: "Packaging & Printing", product: "Corrugated Boxes (3-ply)",
    predictedDemand: 52000, confidence: 89, trend: "rising", changePercent: 22,
    topRegions: ["Maharashtra", "Karnataka", "Tamil Nadu"],
    seasonality: "Spike in festive season (Sep-Dec) and e-commerce sales",
    aiInsight: "E-commerce growth of 25% YoY directly drives packaging demand. D2C brands are the fastest-growing segment. Offer custom printing for premium margins.",
  },
];

export const PRICE_FORECASTS: PriceForecast[] = [
  {
    product: "TMT Steel Bars (Fe500D)", category: "Building & Construction",
    currentPrice: 48500, unit: "ton",
    forecast: futureMonths(8).map((m, i) => ({
      month: m,
      predicted: 48500 + (i < 3 ? i * 800 : (6 - i) * 400),
      lower: 47000 + (i < 3 ? i * 600 : (6 - i) * 300),
      upper: 50000 + (i < 3 ? i * 1000 : (6 - i) * 500),
      ...(i < 2 ? { actual: 48500 + i * 750 + (Math.random() - 0.5) * 500 } : {}),
    })),
    recommendation: "buy_now",
    aiReason: "Prices expected to rise 5-8% over next quarter due to iron ore shortage and monsoon logistics disruption. Lock in current rates.",
    volatilityIndex: 62,
  },
  {
    product: "Copper Wire (2.5mm PVC)", category: "Electronics & Electrical",
    currentPrice: 680, unit: "meter",
    forecast: futureMonths(8).map((m, i) => ({
      month: m,
      predicted: 680 - i * 12 + (i > 4 ? (i - 4) * 20 : 0),
      lower: 650 - i * 15 + (i > 4 ? (i - 4) * 15 : 0),
      upper: 710 - i * 8 + (i > 4 ? (i - 4) * 25 : 0),
      ...(i < 2 ? { actual: 680 - i * 10 + (Math.random() - 0.5) * 20 } : {}),
    })),
    recommendation: "wait",
    aiReason: "LME copper futures indicate a dip in Q3. Global copper surplus expected. Delay bulk purchases by 6-8 weeks for 8-12% savings.",
    volatilityIndex: 45,
  },
  {
    product: "HDPE Granules (Blow Grade)", category: "Chemicals & Solvents",
    currentPrice: 92000, unit: "ton",
    forecast: futureMonths(8).map((m, i) => ({
      month: m,
      predicted: 92000 + Math.sin(i * 0.8) * 3000,
      lower: 89000 + Math.sin(i * 0.8) * 2500,
      upper: 95000 + Math.sin(i * 0.8) * 3500,
      ...(i < 2 ? { actual: 92000 + Math.sin(i * 0.8) * 2800 + (Math.random() - 0.5) * 1000 } : {}),
    })),
    recommendation: "negotiate",
    aiReason: "Prices cyclical with crude oil. Current rates near cycle average. Negotiate bulk discounts or long-term contracts for stability.",
    volatilityIndex: 38,
  },
];

export const AUTO_MATCH_SUGGESTIONS: AutoMatchSuggestion[] = [
  {
    id: "am1", buyerNeed: "TMT Steel Bars Fe500D - 200 Tons", buyerLocation: "Pune, Maharashtra",
    quantity: 200, unit: "tons", budget: 9700000,
    matchedSuppliers: [
      { name: "Steel India Corp", city: "Mumbai", score: 892, price: 47800, matchReason: "Highest trust score + same state delivery", confidence: 96 },
      { name: "Tata Steel Distributors", city: "Jamshedpur", score: 945, price: 48200, matchReason: "Premium quality + fastest delivery track record", confidence: 93 },
      { name: "JSW Steel Outlet", city: "Bellary", score: 870, price: 47200, matchReason: "Lowest price + bulk discount available", confidence: 88 },
    ],
    matchScore: 96, urgency: "high", postedAgo: "2 hours ago",
  },
  {
    id: "am2", buyerNeed: "Safety Helmets ISI Mark - 2000 units", buyerLocation: "Bangalore, Karnataka",
    quantity: 2000, unit: "pcs", budget: 420000,
    matchedSuppliers: [
      { name: "SafeGuard Industries", city: "Chennai", score: 815, price: 195, matchReason: "ISI certified + bulk order specialist", confidence: 91 },
      { name: "Karam Safety", city: "Noida", score: 880, price: 210, matchReason: "Top brand + warranty program", confidence: 87 },
    ],
    matchScore: 91, urgency: "medium", postedAgo: "5 hours ago",
  },
  {
    id: "am3", buyerNeed: "PVC Copper Wire 2.5mm - 15km", buyerLocation: "Hyderabad, Telangana",
    quantity: 15000, unit: "meters", budget: 10200000,
    matchedSuppliers: [
      { name: "Havells Authorized", city: "Hyderabad", score: 910, price: 655, matchReason: "Local delivery + highest rating in category", confidence: 94 },
      { name: "Polycab Distributors", city: "Mumbai", score: 875, price: 640, matchReason: "Competitive pricing + fast dispatch", confidence: 89 },
      { name: "RR Kabel Direct", city: "Silvassa", score: 830, price: 620, matchReason: "Manufacturer-direct pricing", confidence: 85 },
    ],
    matchScore: 94, urgency: "high", postedAgo: "1 hour ago",
  },
  {
    id: "am4", buyerNeed: "Corrugated Boxes 3-ply Custom Print - 50,000 units", buyerLocation: "Delhi NCR",
    quantity: 50000, unit: "pcs", budget: 750000,
    matchedSuppliers: [
      { name: "PackRight Solutions", city: "Noida", score: 780, price: 14, matchReason: "Custom printing capability + nearest location", confidence: 90 },
      { name: "CorruPack Industries", city: "Faridabad", score: 810, price: 13.5, matchReason: "Lowest cost + high volume capacity", confidence: 86 },
    ],
    matchScore: 88, urgency: "low", postedAgo: "12 hours ago",
  },
];

export const MARKET_SIGNALS: MarketSignal[] = [
  {
    id: "ms1", type: "demand_surge", title: "Construction Material Demand Surge — Q3",
    description: "Smart Cities Mission Phase 3 approved for 25 new cities. Expected 18-25% increase in steel, cement, and safety equipment demand.",
    impact: "high", category: "Building & Construction",
    timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(), actionable: true,
  },
  {
    id: "ms2", type: "price_drop", title: "Copper Prices Expected to Dip 8-12%",
    description: "LME futures show bearish trend. Global copper surplus from Chilean and Congo mines reaching market in 6-8 weeks.",
    impact: "medium", category: "Electronics & Electrical",
    timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString(), actionable: true,
  },
  {
    id: "ms3", type: "new_regulation", title: "New Safety Compliance Mandate",
    description: "MoLE notification mandates ISI-certified safety equipment at all construction sites >500 sqm. Effective from next quarter.",
    impact: "high", category: "Safety & Protection",
    timestamp: new Date(Date.now() - 1000 * 60 * 300).toISOString(), actionable: true,
  },
  {
    id: "ms4", type: "supply_shortage", title: "HDPE Supply Tightening",
    description: "Reliance Jamnagar refinery shutdown for maintenance. HDPE supply may reduce 15% for 3 weeks.",
    impact: "medium", category: "Chemicals & Solvents",
    timestamp: new Date(Date.now() - 1000 * 60 * 600).toISOString(), actionable: false,
  },
  {
    id: "ms5", type: "seasonal", title: "Festive Season Packaging Rush",
    description: "E-commerce platforms ramping up for Diwali. Corrugated packaging demand historically spikes 35% in Sep-Nov.",
    impact: "medium", category: "Packaging & Printing",
    timestamp: new Date(Date.now() - 1000 * 60 * 900).toISOString(), actionable: true,
  },
];

export const DEMAND_HEATMAP_DATA = [
  { region: "Maharashtra", demand: 95, growth: 18, topProduct: "TMT Steel Bars" },
  { region: "Gujarat", demand: 88, growth: 15, topProduct: "HDPE Granules" },
  { region: "Tamil Nadu", demand: 82, growth: 12, topProduct: "Copper Wire" },
  { region: "Karnataka", demand: 79, growth: 22, topProduct: "Safety Helmets" },
  { region: "Delhi NCR", demand: 91, growth: 20, topProduct: "Corrugated Boxes" },
  { region: "Telangana", demand: 74, growth: 16, topProduct: "PVC Wire" },
  { region: "UP", demand: 70, growth: 10, topProduct: "Hydraulic Parts" },
  { region: "Rajasthan", demand: 65, growth: 8, topProduct: "Chemicals" },
  { region: "Punjab", demand: 60, growth: 6, topProduct: "Agricultural Parts" },
  { region: "West Bengal", demand: 58, growth: 11, topProduct: "Industrial Machinery" },
];
