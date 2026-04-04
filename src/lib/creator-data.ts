// Creator / Marketer mock data

export interface CreatorStats {
  totalLeads: number;
  convertedLeads: number;
  totalCommission: number;
  pendingCommission: number;
  affiliateClicks: number;
  conversionRate: number;
  creatorTrustScore: number;
  rank: number;
  tier: "bronze" | "silver" | "gold" | "platinum" | "diamond";
}

export interface AffiliateLink {
  id: string;
  productId: string;
  productName: string;
  supplierName: string;
  shortUrl: string;
  clicks: number;
  conversions: number;
  commission: number;
  commissionRate: number;
  createdAt: string;
}

export interface CreatorContent {
  id: string;
  type: "review" | "comparison" | "guide" | "recommendation";
  title: string;
  views: number;
  leads: number;
  earnings: number;
  status: "draft" | "published" | "featured";
  createdAt: string;
}

export interface LeaderboardEntry {
  rank: number;
  name: string;
  avatar: string;
  leads: number;
  conversions: number;
  earnings: number;
  tier: CreatorStats["tier"];
  trustScore: number;
}

export const MOCK_CREATOR_STATS: CreatorStats = {
  totalLeads: 342,
  convertedLeads: 89,
  totalCommission: 127500,
  pendingCommission: 23400,
  affiliateClicks: 4560,
  conversionRate: 26.0,
  creatorTrustScore: 780,
  rank: 12,
  tier: "gold",
};

export const MOCK_AFFILIATE_LINKS: AffiliateLink[] = [
  { id: "aff-1", productId: "prod-1", productName: "SS304 Hex Bolts M8", supplierName: "Tata Steel Distributors", shortUrl: "vyapar.os/r/ab12cd", clicks: 890, conversions: 34, commission: 17000, commissionRate: 3, createdAt: "2026-02-15" },
  { id: "aff-2", productId: "prod-2", productName: "HDPE Granules Blow Grade", supplierName: "Reliance Polymers", shortUrl: "vyapar.os/r/ef34gh", clicks: 1240, conversions: 22, commission: 44000, commissionRate: 4, createdAt: "2026-01-20" },
  { id: "aff-3", productId: "prod-3", productName: "PVC Copper Wire 2.5mm", supplierName: "Havells Cable Division", shortUrl: "vyapar.os/r/ij56kl", clicks: 670, conversions: 18, commission: 28800, commissionRate: 3.5, createdAt: "2026-03-01" },
  { id: "aff-4", productId: "prod-4", productName: "Safety Helmets ISI Mark", supplierName: "Karam Safety", shortUrl: "vyapar.os/r/mn78op", clicks: 450, conversions: 15, commission: 11250, commissionRate: 2.5, createdAt: "2026-03-10" },
];

export const MOCK_CREATOR_CONTENT: CreatorContent[] = [
  { id: "cc-1", type: "comparison", title: "Top 5 Steel Suppliers in Maharashtra: Price vs Quality Analysis", views: 2340, leads: 67, earnings: 33500, status: "featured", createdAt: "2026-02-10" },
  { id: "cc-2", type: "guide", title: "How to Choose the Right HDPE Grade for Packaging", views: 1890, leads: 45, earnings: 22500, status: "published", createdAt: "2026-02-25" },
  { id: "cc-3", type: "review", title: "Havells vs Polycab: Industrial Cable Comparison 2026", views: 3120, leads: 89, earnings: 44500, status: "featured", createdAt: "2026-03-05" },
  { id: "cc-4", type: "recommendation", title: "Best Safety Equipment Suppliers for Construction Sites", views: 980, leads: 23, earnings: 11500, status: "published", createdAt: "2026-03-15" },
  { id: "cc-5", type: "guide", title: "B2B Procurement Guide: Reduce Costs by 30%", views: 450, leads: 8, earnings: 0, status: "draft", createdAt: "2026-03-28" },
];

export const MOCK_LEADERBOARD: LeaderboardEntry[] = [
  { rank: 1, name: "Arjun Mehta", avatar: "AM", leads: 1240, conversions: 456, earnings: 892000, tier: "diamond", trustScore: 950 },
  { rank: 2, name: "Sneha Reddy", avatar: "SR", leads: 980, conversions: 378, earnings: 756000, tier: "diamond", trustScore: 920 },
  { rank: 3, name: "Rakesh Kumar", avatar: "RK", leads: 870, conversions: 312, earnings: 624000, tier: "platinum", trustScore: 890 },
  { rank: 4, name: "Priya Nair", avatar: "PN", leads: 720, conversions: 267, earnings: 534000, tier: "platinum", trustScore: 860 },
  { rank: 5, name: "Amit Shah", avatar: "AS", leads: 650, conversions: 234, earnings: 468000, tier: "gold", trustScore: 830 },
  { rank: 6, name: "Kavita Sharma", avatar: "KS", leads: 580, conversions: 198, earnings: 396000, tier: "gold", trustScore: 810 },
  { rank: 7, name: "Vikash Jain", avatar: "VJ", leads: 520, conversions: 178, earnings: 356000, tier: "gold", trustScore: 790 },
  { rank: 8, name: "Deepa Gupta", avatar: "DG", leads: 470, conversions: 156, earnings: 312000, tier: "silver", trustScore: 760 },
  { rank: 9, name: "Rohit Patel", avatar: "RP", leads: 410, conversions: 134, earnings: 268000, tier: "silver", trustScore: 740 },
  { rank: 10, name: "Meera Iyer", avatar: "MI", leads: 380, conversions: 112, earnings: 224000, tier: "silver", trustScore: 720 },
];

export const TIER_COLORS: Record<CreatorStats["tier"], { bg: string; text: string; label: string }> = {
  bronze: { bg: "bg-orange-100", text: "text-orange-700", label: "Bronze" },
  silver: { bg: "bg-muted", text: "text-muted-foreground", label: "Silver" },
  gold: { bg: "bg-warning/10", text: "text-warning", label: "Gold" },
  platinum: { bg: "bg-primary/10", text: "text-primary", label: "Platinum" },
  diamond: { bg: "bg-success/10", text: "text-success", label: "Diamond" },
};

export const COMMISSION_CHART_DATA = [
  { month: "Oct", earnings: 8500 },
  { month: "Nov", earnings: 12300 },
  { month: "Dec", earnings: 15800 },
  { month: "Jan", earnings: 19200 },
  { month: "Feb", earnings: 28400 },
  { month: "Mar", earnings: 43300 },
];

export const LEAD_FUNNEL_DATA = [
  { stage: "Clicks", count: 4560 },
  { stage: "Views", count: 2340 },
  { stage: "Inquiries", count: 890 },
  { stage: "Leads", count: 342 },
  { stage: "Conversions", count: 89 },
];
