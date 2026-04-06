// Supplier Analytics — revenue projections, trust trends, benchmarking

export interface MonthlyRevenue {
  month: string;
  revenue: number;
  orders: number;
  projected: number;
  target: number;
}

export interface TrustTrend {
  month: string;
  overall: number;
  delivery: number;
  quality: number;
  responseTime: number;
  compliance: number;
}

export interface BenchmarkMetric {
  metric: string;
  you: number;
  industryAvg: number;
  topPerformer: number;
  unit: string;
  higherIsBetter: boolean;
}

export interface CustomerSegment {
  name: string;
  percentage: number;
  revenue: number;
  growth: number;
}

export interface ProductPerformance {
  name: string;
  unitsSold: number;
  revenue: number;
  margin: number;
  returnRate: number;
  rating: number;
}

export interface SupplierKPI {
  label: string;
  value: string | number;
  change: number;
  trend: "up" | "down" | "flat";
}

// Mock data generators
const MONTHS = ["Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul"];

export function generateRevenueData(): MonthlyRevenue[] {
  const base = 180000;
  return MONTHS.map((month, i) => {
    const growth = 1 + i * 0.06 + (Math.random() * 0.08 - 0.04);
    const rev = Math.round(base * growth);
    return {
      month,
      revenue: i < 10 ? rev : 0,
      orders: i < 10 ? Math.round(rev / 4500) : 0,
      projected: i >= 8 ? Math.round(base * (1 + i * 0.065)) : 0,
      target: Math.round(base * (1 + i * 0.055)),
    };
  });
}

export function generateTrustTrends(): TrustTrend[] {
  return MONTHS.slice(0, 10).map((month, i) => ({
    month,
    overall: Math.min(950, 680 + i * 28 + Math.round(Math.random() * 15)),
    delivery: Math.min(980, 700 + i * 25 + Math.round(Math.random() * 20)),
    quality: Math.min(960, 720 + i * 22 + Math.round(Math.random() * 10)),
    responseTime: Math.min(940, 650 + i * 30 + Math.round(Math.random() * 18)),
    compliance: Math.min(990, 750 + i * 20 + Math.round(Math.random() * 12)),
  }));
}

export const BENCHMARK_DATA: BenchmarkMetric[] = [
  { metric: "On-Time Delivery", you: 94, industryAvg: 82, topPerformer: 98, unit: "%", higherIsBetter: true },
  { metric: "Response Time", you: 2.1, industryAvg: 4.8, topPerformer: 0.5, unit: "hrs", higherIsBetter: false },
  { metric: "Quality Score", you: 92, industryAvg: 78, topPerformer: 99, unit: "/100", higherIsBetter: true },
  { metric: "Return Rate", you: 1.8, industryAvg: 4.2, topPerformer: 0.3, unit: "%", higherIsBetter: false },
  { metric: "Repeat Buyers", you: 67, industryAvg: 45, topPerformer: 88, unit: "%", higherIsBetter: true },
  { metric: "Avg. Order Value", you: 45200, industryAvg: 32000, topPerformer: 78000, unit: "₹", higherIsBetter: true },
  { metric: "Dispute Rate", you: 0.8, industryAvg: 3.5, topPerformer: 0.1, unit: "%", higherIsBetter: false },
  { metric: "Lead Conversion", you: 28, industryAvg: 15, topPerformer: 42, unit: "%", higherIsBetter: true },
];

export const CUSTOMER_SEGMENTS: CustomerSegment[] = [
  { name: "Enterprise", percentage: 35, revenue: 1420000, growth: 18 },
  { name: "Mid-Market", percentage: 28, revenue: 1136000, growth: 24 },
  { name: "SMB", percentage: 22, revenue: 893000, growth: 31 },
  { name: "Startups", percentage: 15, revenue: 609000, growth: 45 },
];

export const PRODUCT_PERFORMANCE: ProductPerformance[] = [
  { name: "Cold Rolled Steel Coils", unitsSold: 1240, revenue: 1860000, margin: 18.5, returnRate: 0.4, rating: 4.8 },
  { name: "Galvanized Iron Sheets", unitsSold: 890, revenue: 1068000, margin: 22.1, returnRate: 1.2, rating: 4.5 },
  { name: "MS Angle Bars", unitsSold: 2100, revenue: 840000, margin: 15.3, returnRate: 0.8, rating: 4.6 },
  { name: "TMT Rebars Fe500D", unitsSold: 650, revenue: 715000, margin: 12.8, returnRate: 0.2, rating: 4.9 },
  { name: "Stainless Steel Pipes", unitsSold: 430, revenue: 602000, margin: 25.4, returnRate: 1.5, rating: 4.3 },
];

export const SUPPLIER_KPIS: SupplierKPI[] = [
  { label: "Monthly Revenue", value: "₹4.06L", change: 12.4, trend: "up" },
  { label: "Trust Score", value: 872, change: 28, trend: "up" },
  { label: "Active Orders", value: 34, change: 5, trend: "up" },
  { label: "Response Rate", value: "96%", change: -1.2, trend: "down" },
  { label: "Repeat Buyers", value: "67%", change: 8, trend: "up" },
  { label: "Avg. Lead Time", value: "3.2d", change: -0.5, trend: "up" },
];

export function getPercentile(you: number, avg: number, top: number, higherIsBetter: boolean): number {
  if (higherIsBetter) {
    if (you >= top) return 99;
    if (you <= avg) return Math.round((you / avg) * 50);
    return Math.round(50 + ((you - avg) / (top - avg)) * 49);
  }
  if (you <= top) return 99;
  if (you >= avg) return Math.round(((avg - you + avg) / avg) * 50);
  return Math.round(50 + ((avg - you) / (avg - top)) * 49);
}
