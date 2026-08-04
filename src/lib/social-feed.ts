// Social layer for the B2B network: posts, reactions, comments, follows.
// Frontend prototype — mock seed data persisted to localStorage.

export type PostKind =
  | "deal_closed"
  | "price_drop"
  | "rfq_open"
  | "capacity"
  | "certification"
  | "insight"
  | "showcase";

export interface FeedComment {
  id: string;
  authorId: string;
  authorName: string;
  text: string;
  createdAt: string;
  aiAssisted?: boolean;
}

export interface FeedPost {
  id: string;
  authorId: string;
  authorName: string;
  authorRole: "supplier" | "buyer" | "creator" | "agent";
  authorTagline: string;
  city: string;
  trustScore: number;
  kind: PostKind;
  text: string;
  metric?: { label: string; value: string }[];
  tags: string[];
  createdAt: string;
  likes: number;
  reposts: number;
  aiAssisted?: boolean;
  agentInsight?: string;
  comments: FeedComment[];
}

export interface CompanyNode {
  id: string;
  name: string;
  tagline: string;
  role: "supplier" | "buyer" | "creator";
  city: string;
  state: string;
  industry: string;
  trustScore: number;
  followers: number;
  verified: boolean;
  gstin: string;
  since: string;
  capabilities: string[];
  endorsements: { skill: string; count: number }[];
  stats: { label: string; value: string }[];
}

const POSTS_KEY = "vyapar_social_posts_v1";
const LIKES_KEY = "vyapar_social_likes_v1";
const FOLLOW_KEY = "vyapar_social_follows_v1";

export const ME = { id: "me", name: "Your Business", role: "buyer" as const };

export const COMPANIES: CompanyNode[] = [
  {
    id: "co-shakti",
    name: "Shakti Fasteners Pvt Ltd",
    tagline: "SS304/316 bolts, nuts & custom fasteners — IATF 16949 line",
    role: "supplier",
    city: "Pune",
    state: "Maharashtra",
    industry: "Fasteners & Hardware",
    trustScore: 892,
    followers: 4210,
    verified: true,
    gstin: "27AABCS4412K1ZQ",
    since: "2011",
    capabilities: ["Cold forging", "Hot dip galvanising", "Custom threading", "Batch traceability"],
    endorsements: [
      { skill: "On-time delivery", count: 148 },
      { skill: "Spec accuracy", count: 121 },
      { skill: "Bulk pricing", count: 96 },
    ],
    stats: [
      { label: "Orders fulfilled", value: "3,412" },
      { label: "Avg response", value: "18 min" },
      { label: "Repeat buyers", value: "74%" },
    ],
  },
  {
    id: "co-veer",
    name: "Veer Steel Traders",
    tagline: "MS/SS raw material — coils, plates, bright bars from Mumbai yard",
    role: "supplier",
    city: "Mumbai",
    state: "Maharashtra",
    industry: "Raw Materials",
    trustScore: 814,
    followers: 2870,
    verified: true,
    gstin: "27AAECV7781M1ZR",
    since: "2008",
    capabilities: ["Same-day dispatch", "Mill test certificates", "Cut-to-length"],
    endorsements: [
      { skill: "Price transparency", count: 88 },
      { skill: "Documentation", count: 64 },
    ],
    stats: [
      { label: "Tonnes/month", value: "1,850" },
      { label: "Avg response", value: "31 min" },
      { label: "Disputes", value: "0.4%" },
    ],
  },
  {
    id: "co-nashik",
    name: "Nashik Precision Works",
    tagline: "CNC machined components & assemblies for auto tier-2",
    role: "supplier",
    city: "Nashik",
    state: "Maharashtra",
    industry: "Industrial Machinery",
    trustScore: 761,
    followers: 1640,
    verified: true,
    gstin: "27AACCN9021P1ZT",
    since: "2015",
    capabilities: ["5-axis CNC", "PPAP documentation", "Small-batch prototyping"],
    endorsements: [
      { skill: "Tolerance control", count: 73 },
      { skill: "Prototyping speed", count: 51 },
    ],
    stats: [
      { label: "Parts/month", value: "62,000" },
      { label: "PPM rejects", value: "420" },
      { label: "Avg response", value: "42 min" },
    ],
  },
  {
    id: "co-agri",
    name: "Deccan AgriEquip",
    tagline: "Buyer — procures fasteners, bearings & sheet metal at scale",
    role: "buyer",
    city: "Pune",
    state: "Maharashtra",
    industry: "Manufacturing",
    trustScore: 688,
    followers: 930,
    verified: true,
    gstin: "27AAGCD3390L1ZX",
    since: "2013",
    capabilities: ["Annual rate contracts", "Escrow-backed payments", "60-day cycles"],
    endorsements: [
      { skill: "Payment reliability", count: 57 },
      { skill: "Clear RFQs", count: 44 },
    ],
    stats: [
      { label: "Annual spend", value: "₹18.4 Cr" },
      { label: "Suppliers", value: "37" },
      { label: "On-time payment", value: "97%" },
    ],
  },
  {
    id: "co-creator",
    name: "Rahul Deshmukh · Trade Creator",
    tagline: "Breaking down industrial sourcing for 40k MSME owners",
    role: "creator",
    city: "Mumbai",
    state: "Maharashtra",
    industry: "Media",
    trustScore: 712,
    followers: 40200,
    verified: true,
    gstin: "27AAIPD1122H1ZK",
    since: "2019",
    capabilities: ["Category explainers", "Supplier interviews", "Demand campaigns"],
    endorsements: [{ skill: "Demand generation", count: 132 }],
    stats: [
      { label: "Leads generated", value: "5,900" },
      { label: "Avg reach/post", value: "22k" },
      { label: "Conversion", value: "3.8%" },
    ],
  },
];

const now = Date.now();
const ago = (h: number) => new Date(now - h * 3600_000).toISOString();

const SEED_POSTS: FeedPost[] = [
  {
    id: "p1",
    authorId: "co-shakti",
    authorName: "Shakti Fasteners Pvt Ltd",
    authorRole: "supplier",
    authorTagline: "SS304/316 bolts & custom fasteners · Pune",
    city: "Pune",
    trustScore: 892,
    kind: "deal_closed",
    text:
      "Closed a 3-year rate contract for 1.2 lakh SS316 hex bolts with a Chakan auto tier-1. Escrow-backed, 21-day cycles, zero rejects across the pilot batch. Capacity is booked to 78% — planning a second cold-forging line by Q3.",
    metric: [
      { label: "Order value", value: "₹1.42 Cr" },
      { label: "Reject rate", value: "0.0%" },
      { label: "Cycle", value: "21 days" },
    ],
    tags: ["Fasteners", "SS316", "Rate contract"],
    createdAt: ago(2),
    likes: 214,
    reposts: 31,
    agentInsight:
      "SS316 bolt demand in Chakan is up 14% QoQ. Buyers locking rate contracts now are hedging a projected ₹6/kg nickel surcharge.",
    comments: [
      {
        id: "c1",
        authorId: "co-agri",
        authorName: "Deccan AgriEquip",
        text: "Congrats. Do you hold buffer stock for M8x40 in 316? We run monthly pulls of ~8,000 pcs.",
        createdAt: ago(1),
      },
    ],
  },
  {
    id: "p2",
    authorId: "co-veer",
    authorName: "Veer Steel Traders",
    authorRole: "supplier",
    authorTagline: "MS/SS coils, plates, bright bars · Mumbai",
    city: "Mumbai",
    trustScore: 814,
    kind: "price_drop",
    text:
      "SS304 2B sheet landed cost is down ₹4.20/kg this week on softer nickel + easier import parity. Passing the full drop to contract buyers until the 20th. Yard has 340 T ready for same-day dispatch to Pune/Nashik.",
    metric: [
      { label: "New price", value: "₹238/kg" },
      { label: "Change", value: "-1.7%" },
      { label: "Ready stock", value: "340 T" },
    ],
    tags: ["Raw Materials", "SS304", "Price drop"],
    createdAt: ago(6),
    likes: 402,
    reposts: 87,
    agentInsight:
      "Third consecutive weekly decline. The agent's price model puts a further ₹2-3/kg downside at 61% probability before month-end — staggered buying beats a single large lot.",
    comments: [],
  },
  {
    id: "p3",
    authorId: "co-agri",
    authorName: "Deccan AgriEquip",
    authorRole: "buyer",
    authorTagline: "Procurement · Pune",
    city: "Pune",
    trustScore: 688,
    kind: "rfq_open",
    text:
      "Open RFQ: 24,000 pcs zinc-plated M10x50 hex bolts, IS 1367 Class 8.8, delivery to Ranjangaon by 28th. Escrow release on inspection. Verified suppliers with batch traceability preferred — quotes close Friday.",
    metric: [
      { label: "Quantity", value: "24,000 pcs" },
      { label: "Budget", value: "₹9.6 L" },
      { label: "Closes in", value: "3 days" },
    ],
    tags: ["RFQ", "Fasteners", "Class 8.8"],
    createdAt: ago(9),
    likes: 96,
    reposts: 12,
    agentInsight:
      "Agent matched 7 suppliers within budget; 4 hold trust score >750 and can meet the 28th date with current capacity.",
    comments: [
      {
        id: "c2",
        authorId: "co-shakti",
        authorName: "Shakti Fasteners Pvt Ltd",
        text: "Quoting today. We can hold ₹39.80/pc at that volume with full traceability sheets.",
        createdAt: ago(8),
      },
    ],
  },
  {
    id: "p4",
    authorId: "co-nashik",
    authorName: "Nashik Precision Works",
    authorRole: "supplier",
    authorTagline: "CNC machined components · Nashik",
    city: "Nashik",
    trustScore: 761,
    kind: "capacity",
    text:
      "Freed up 1,100 machine-hours on the 5-axis cell after a program wrapped early. Offering it at a 12% discount for August with 6-day prototype turnaround. Ideal for tier-2 auto and hydraulics housings.",
    metric: [
      { label: "Free hours", value: "1,100" },
      { label: "Discount", value: "12%" },
      { label: "Turnaround", value: "6 days" },
    ],
    tags: ["CNC", "Capacity", "Prototyping"],
    createdAt: ago(14),
    likes: 138,
    reposts: 22,
    comments: [],
  },
  {
    id: "p5",
    authorId: "co-creator",
    authorName: "Rahul Deshmukh · Trade Creator",
    authorRole: "creator",
    authorTagline: "Industrial sourcing explainers · 40k followers",
    city: "Mumbai",
    trustScore: 712,
    kind: "insight",
    text:
      "Most MSMEs lose 4-7% of margin not on price, but on payment terms they never negotiate. If your supplier funds 45 days at 1.5%/month, that's a hidden 2.2% cost baked into the quote. Ask for a cash-discount split instead.",
    tags: ["Working capital", "Negotiation"],
    createdAt: ago(20),
    likes: 1840,
    reposts: 310,
    agentInsight:
      "Buyers on the network who switched to 2/10 net-45 terms cut effective landed cost by an average of 1.9%.",
    comments: [],
  },
  {
    id: "p6",
    authorId: "co-shakti",
    authorName: "Shakti Fasteners Pvt Ltd",
    authorRole: "supplier",
    authorTagline: "SS304/316 bolts & custom fasteners · Pune",
    city: "Pune",
    trustScore: 892,
    kind: "certification",
    text:
      "IATF 16949 surveillance audit cleared with zero major NCs. Trust score moved 874 → 892 and our escrow premium drops to 0.6%. Documents are live on our profile for buyer verification.",
    metric: [
      { label: "Trust score", value: "892 (+18)" },
      { label: "Escrow premium", value: "0.6%" },
    ],
    tags: ["Compliance", "IATF 16949"],
    createdAt: ago(30),
    likes: 267,
    reposts: 41,
    comments: [],
  },
];

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function getPosts(): FeedPost[] {
  const stored = read<FeedPost[] | null>(POSTS_KEY, null);
  if (stored && stored.length) return stored;
  localStorage.setItem(POSTS_KEY, JSON.stringify(SEED_POSTS));
  return SEED_POSTS;
}

export function savePosts(posts: FeedPost[]) {
  localStorage.setItem(POSTS_KEY, JSON.stringify(posts));
}

export function getLikes(): string[] {
  return read<string[]>(LIKES_KEY, []);
}

export function toggleLike(postId: string): string[] {
  const likes = getLikes();
  const next = likes.includes(postId) ? likes.filter((l) => l !== postId) : [...likes, postId];
  localStorage.setItem(LIKES_KEY, JSON.stringify(next));
  return next;
}

export function getFollows(): string[] {
  return read<string[]>(FOLLOW_KEY, ["co-shakti"]);
}

export function toggleFollow(companyId: string): string[] {
  const f = getFollows();
  const next = f.includes(companyId) ? f.filter((c) => c !== companyId) : [...f, companyId];
  localStorage.setItem(FOLLOW_KEY, JSON.stringify(next));
  return next;
}

export function getCompany(id: string): CompanyNode | undefined {
  return COMPANIES.find((c) => c.id === id);
}

export function postsByAuthor(id: string): FeedPost[] {
  return getPosts().filter((p) => p.authorId === id);
}

export const KIND_META: Record<PostKind, { label: string; tone: string }> = {
  deal_closed: { label: "Deal closed", tone: "bg-success/10 text-success border-success/30" },
  price_drop: { label: "Price move", tone: "bg-warning/10 text-warning border-warning/30" },
  rfq_open: { label: "Open RFQ", tone: "bg-primary/10 text-primary border-primary/30" },
  capacity: { label: "Capacity", tone: "bg-secondary/15 text-secondary border-secondary/30" },
  certification: { label: "Compliance", tone: "bg-success/10 text-success border-success/30" },
  insight: { label: "Insight", tone: "bg-muted text-foreground border-border" },
  showcase: { label: "Showcase", tone: "bg-muted text-foreground border-border" },
};

export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

export function initials(name: string): string {
  return name
    .replace(/[^\w\s]/g, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}
