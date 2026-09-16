// Page Registry: 120+ painkiller pages, config-driven
// Each entry maps a URL slug to a template + content blueprint.

export type TemplateKind =
  | "workflow"      // step-by-step painkiller flow with progress + KPI
  | "directory"     // searchable list (suppliers, products, regions)
  | "tool"          // interactive calculator / estimator
  | "guide"         // educational deep-dive with TOC
  | "dashboard"     // KPI grid + charts + alerts
  | "landing";      // solution hero + features + proof

export type PageCategory =
  | "Trust & Fraud"
  | "Trade OS"
  | "Buyer Painkillers"
  | "Supplier Painkillers"
  | "Logistics & Tracking"
  | "Finance & Credit"
  | "Compliance & Tax"
  | "Analytics & Intelligence"
  | "Tools & Calculators"
  | "Guides & Playbooks"
  | "Industry Solutions"
  | "Regional Hubs";

export interface PageKPI { label: string; value: string; delta?: string; tone?: "good" | "warn" | "bad" }
export interface PageSection { title: string; body: string; bullets?: string[] }
export interface PageStep { title: string; description: string; status?: "done" | "active" | "pending" }
export interface DirectoryRow { name: string; meta: string; score: number; tag: string }
export interface ToolField { key: string; label: string; type: "number" | "select"; default: number | string; options?: string[]; suffix?: string }

export interface PageDef {
  slug: string;
  title: string;
  tagline: string;
  category: PageCategory;
  template: TemplateKind;
  pain: string;
  cure: string;
  kpis?: PageKPI[];
  steps?: PageStep[];
  sections?: PageSection[];
  rows?: DirectoryRow[];
  fields?: ToolField[];
  formula?: string;
  ctaPrimary?: { label: string; to: string };
  ctaSecondary?: { label: string; to: string };
  chartData?: { label: string; value: number }[];
  tags?: string[];
}

// ---- helpers to generate scale ----
const indianCities = ["Pune","Mumbai","Ahmedabad","Surat","Rajkot","Delhi","Ludhiana","Coimbatore","Chennai","Hyderabad","Bengaluru","Kolkata","Indore","Nagpur","Faridabad","Vadodara","Jaipur","Kanpur","Jamshedpur","Visakhapatnam"];
const industries = ["Fasteners","Bearings","Steel","Pipes & Fittings","Lubricants","Power Tools","Electrical Cables","Safety Equipment","Industrial Chemicals","Packaging","CNC Machining","Sheet Metal","Hydraulics","Pneumatics","Welding Consumables","Abrasives","Adhesives","PCB Assemblies","Plastic Granules","Textile Machinery"];
const makeKPIs = (a: string, b: string, c: string, d: string): PageKPI[] => [
  { label: "Active cases", value: a, delta: "+12%", tone: "good" },
  { label: "SLA met", value: b, delta: "+3.4%", tone: "good" },
  { label: "Avg cycle", value: c, delta: "-18%", tone: "good" },
  { label: "Risk caught", value: d, delta: "+27%", tone: "good" },
];
const makeChart = (n = 8, base = 60, jitter = 30) =>
  Array.from({ length: n }, (_, i) => ({ label: `W${i + 1}`, value: Math.round(base + Math.sin(i / 2) * jitter + i * 4) }));
const makeRows = (n: number, tag: string): DirectoryRow[] =>
  Array.from({ length: n }, (_, i) => ({
    name: `${industries[i % industries.length]} Hub #${i + 1}`,
    meta: `${indianCities[i % indianCities.length]} · ${50 + (i * 13) % 400} suppliers`,
    score: 720 + ((i * 37) % 260),
    tag,
  }));

// ---- core curated pages (rich) ----
const curated: PageDef[] = [
  // Trust & Fraud (15)
  {
    slug: "trust-engine", title: "Trust Engine 360°", tagline: "Real-time supplier trust scoring with 17 signals",
    category: "Trust & Fraud", template: "dashboard",
    pain: "Procurement teams burn 4–6 weeks vetting suppliers and still get burned by document fraud.",
    cure: "A live 0–1000 trust score fusing GST, MCA, court records, transaction history, dispute rate, and behaviour signals — updated every hour.",
    kpis: makeKPIs("18,420", "99.2%", "11 min", "₹14.2 Cr"),
    chartData: makeChart(12, 700, 80),
    sections: [
      { title: "How the score moves", body: "Each signal contributes a weighted delta. Negative news, late shipments, and GST cancellations drop the score within minutes.", bullets: ["GST compliance — 22%","On-time delivery — 18%","Dispute rate — 15%","Document authenticity — 14%","Capacity vs commits — 12%","Reviews & NPS — 11%","Court & sanctions — 8%"] },
    ],
    ctaPrimary: { label: "Open Fraud Console", to: "/admin/fraud" },
  },
  {
    slug: "fraud-radar", title: "Fraud Radar", tagline: "Pre-PO fraud detection with 94% catch rate",
    category: "Trust & Fraud", template: "workflow",
    pain: "Fake GSTINs, recycled invoices and shell companies slip past manual checks.",
    cure: "8 anomaly detectors run on every quote, invoice and KYC pack — flagged before PO is issued.",
    steps: [
      { title: "Ingest", description: "Pull KYC, quote, invoice, bank docs", status: "done" },
      { title: "Signal extraction", description: "OCR, NER, EXIF, perceptual hash", status: "done" },
      { title: "Anomaly scoring", description: "Isolation forest + rule engine", status: "active" },
      { title: "Human review", description: "Reviewer console for grey cases", status: "pending" },
      { title: "Decision & alert", description: "Auto-hold or release with audit trail", status: "pending" },
    ],
    ctaPrimary: { label: "View Risk Timeline", to: "/admin/fraud" },
  },
  {
    slug: "kyc-vault", title: "KYC Vault", tagline: "One-click verified supplier identity packs",
    category: "Trust & Fraud", template: "landing",
    pain: "Every buyer re-collects the same 14 documents from the same supplier.",
    cure: "Suppliers upload once. Buyers receive a cryptographically signed identity pack with expiry tracking.",
    sections: [
      { title: "What's inside", body: "Every pack ships with structured fields and the underlying PDF, audit-logged.", bullets: ["GST certificate + filing history","PAN, CIN, Udyam","Bank verification + cancelled cheque","ISO/BIS/CE certificates","Factory photos with EXIF","Authorized signatory POI"] },
    ],
  },
  {
    slug: "sanctions-screening", title: "Sanctions & Watchlist Screening", tagline: "OFAC, UN, MCA, RBI defaulters in one scan",
    category: "Trust & Fraud", template: "tool",
    pain: "Single supplier could appear on 6 different watchlists — manual screening misses 30%.",
    cure: "Run a fuzzy-matched scan across 14 global and Indian lists in under 2 seconds.",
    fields: [
      { key: "name", label: "Legal name", type: "select", default: "Acme Fasteners Pvt Ltd", options: ["Acme Fasteners Pvt Ltd","Bharat Bearings","Shree Tools LLP"] },
      { key: "threshold", label: "Match threshold", type: "number", default: 85, suffix: "%" },
    ],
    formula: "match_score = max(jaro_winkler(name, list_name)) * weight[list]",
  },
  {
    slug: "document-forensics", title: "Document Forensics Lab", tagline: "EXIF, perceptual hash & OCR tamper detection",
    category: "Trust & Fraud", template: "guide",
    pain: "Photoshopped GST certificates and recycled invoices look real to humans.",
    cure: "Forensic pipeline flags edits, duplicates and font substitutions automatically.",
    sections: [
      { title: "Tamper signals we look for", body: "Each upload runs through 6 detectors.", bullets: ["EXIF mismatch with claimed date","Font/kerning inconsistencies via OCR","Perceptual hash matches across suppliers","JPEG quantization table anomalies","Invisible watermark presence","Reverse-image lookup on factory photos"] },
    ],
  },
  {
    slug: "risk-timeline", title: "Risk Timeline Audit", tagline: "Every signal, every change, every document",
    category: "Trust & Fraud", template: "dashboard",
    pain: "Auditors and insurers need to know exactly when and why a supplier's risk changed.",
    cure: "Immutable timeline links each risk event to source docs and transactions.",
    kpis: makeKPIs("2,140", "100%", "0 gaps", "8.4 yrs retention"),
    chartData: makeChart(10, 40, 20),
    ctaPrimary: { label: "Open Audit View", to: "/admin/fraud" },
  },
  {
    slug: "dispute-shield", title: "Dispute Shield", tagline: "Escrow-backed dispute resolution in 72 hours",
    category: "Trust & Fraud", template: "workflow",
    pain: "Disputes drag on for months in civil courts.",
    cure: "Funds held in escrow + neutral panel + photo/video evidence = 72-hour resolution SLA.",
    steps: [
      { title: "Raise", description: "Buyer or seller files with evidence", status: "done" },
      { title: "Auto-classify", description: "Quality, quantity, delivery, payment", status: "done" },
      { title: "Panel review", description: "3 neutral category experts", status: "active" },
      { title: "Award", description: "Funds released per ruling", status: "pending" },
    ],
  },
  {
    slug: "supplier-blacklist", title: "Industry Blacklist", tagline: "Crowdsourced and verified bad-actor registry",
    category: "Trust & Fraud", template: "directory",
    pain: "Bad suppliers get banned by one buyer and immediately scam the next.",
    cure: "Shared, evidence-backed blacklist — flagged only after dispute panel ruling.",
    rows: makeRows(12, "Blacklisted"),
  },
  {
    slug: "fraud-alerts", title: "Critical Fraud Alerts", tagline: "Email + in-app alerts for high & critical risk",
    category: "Trust & Fraud", template: "landing",
    pain: "Risk team finds out about fraud days after PO is paid.",
    cure: "Push, email and in-app notification within 60 seconds of risk crossing threshold.",
    ctaPrimary: { label: "Configure Alerts", to: "/admin/fraud" },
  },
  {
    slug: "reviewer-console", title: "Reviewer Console", tagline: "Human-in-the-loop for grey-area cases",
    category: "Trust & Fraud", template: "landing",
    pain: "Pure ML misses context; pure manual is too slow.",
    cure: "Reviewers see model confidence, evidence, prior cases — decide in 90 seconds avg.",
    ctaPrimary: { label: "Open Reviewer", to: "/admin/reviewer" },
  },
  {
    slug: "supplier-verification", title: "5-Layer Supplier Verification", tagline: "GST, MCA, bank, factory & reference checks",
    category: "Trust & Fraud", template: "workflow",
    pain: "Verification is a checklist nobody finishes.",
    cure: "Parallel automated checks complete in 11 minutes; badge auto-issued.",
    steps: [
      { title: "GST + PAN match", description: "Auto-validated against gov APIs", status: "done" },
      { title: "MCA director check", description: "Company status, signatories", status: "done" },
      { title: "Bank pennytest", description: "₹1 reverse to validate beneficiary", status: "active" },
      { title: "Factory video", description: "Live-recorded geotagged walkthrough", status: "pending" },
      { title: "Reference calls", description: "3 buyers, structured questionnaire", status: "pending" },
    ],
    ctaPrimary: { label: "Start Verification", to: "/supplier/verification" },
  },
  {
    slug: "trust-badges", title: "Trust Badges & Tiers", tagline: "Platinum, Gold, Silver, Bronze — earned not bought",
    category: "Trust & Fraud", template: "guide",
    pain: "'Verified' badges are meaningless if everyone has one.",
    cure: "Tier earned via transaction history, on-time %, dispute rate. Re-evaluated monthly.",
    sections: [
      { title: "Tier criteria", body: "Each tier unlocks better escrow rates, credit terms and lead priority.", bullets: ["Platinum — 0% escrow fee, Net 60 BNPL, 99%+ OTD","Gold — 0.3% escrow, Net 30, 97%+ OTD","Silver — 0.6% escrow, Net 15","Bronze — 1% escrow, prepaid only"] },
    ],
  },
  {
    slug: "behavioural-signals", title: "Behavioural Fraud Signals", tagline: "Typing cadence, login pattern, device fingerprint",
    category: "Trust & Fraud", template: "guide",
    pain: "Account takeovers look identical to genuine logins.",
    cure: "Passive biometrics + device fingerprint catch 92% of ATOs.",
    sections: [{ title: "Signals captured", body: "All anonymised.", bullets: ["Keystroke dynamics","Mouse jitter","Device fingerprint","IP risk score","Time-of-day pattern","Geo velocity"] }],
  },
  {
    slug: "fake-listing-detector", title: "Fake Listing Detector", tagline: "Catalog hygiene with stolen-image lookup",
    category: "Trust & Fraud", template: "tool",
    pain: "Scammers list stock photos at impossible prices to harvest leads.",
    cure: "Reverse image + price-anomaly + stock-claim model auto-removes 1,400+ listings/month.",
    fields: [
      { key: "category", label: "Category", type: "select", default: "Fasteners", options: industries },
      { key: "price", label: "Listed price (₹/unit)", type: "number", default: 4 },
    ],
    formula: "anomaly = abs(price - category_median) / category_iqr + stolen_image_penalty",
  },
  {
    slug: "compliance-monitor", title: "Continuous Compliance Monitor", tagline: "GST, EPF, ESI status checked daily",
    category: "Trust & Fraud", template: "dashboard",
    pain: "Supplier was compliant on day 1 — what about day 180?",
    cure: "Daily revalidation. Status change triggers automatic risk re-score.",
    kpis: makeKPIs("42,118", "98.7%", "6 hrs", "318"),
    chartData: makeChart(12, 95, 5),
  },

  // Trade OS (10)
  { slug: "trade-os-overview", title: "Trade OS", tagline: "Intent → 8 agents → contract → escrow → delivery", category: "Trade OS", template: "landing", pain: "Closing a B2B deal takes 14 emails, 3 calls and 8 documents.", cure: "Type your intent. 8 agents handle match, negotiate, contract, escrow, logistics, compliance, payout, learning.", ctaPrimary: { label: "Open Trade OS", to: "/trade-os" } },
  { slug: "agent-orchestrator", title: "Agent Orchestrator", tagline: "Live agent timeline with hand-offs", category: "Trade OS", template: "dashboard", pain: "AI agents feel like a black box.", cure: "Every agent action is timestamped, attributable and reversible.", kpis: makeKPIs("1,840", "94.1%", "26 min", "₹2.1 Cr"), chartData: makeChart(10, 50, 30) },
  { slug: "intent-parser", title: "Intent Parser", tagline: "Natural language → structured RFQ in 2 seconds", category: "Trade OS", template: "tool", pain: "Filling 18 RFQ fields kills momentum.", cure: "Paste a WhatsApp message — parser fills category, qty, specs, delivery, budget.", fields: [{ key: "intent", label: "Type your intent", type: "select", default: "Need 50,000 M8 SS bolts in Pune by next Friday under ₹6/pc", options: ["Need 50,000 M8 SS bolts in Pune by next Friday under ₹6/pc","2 tonne MS angle 50x50x5, Mumbai delivery, urgent"] }] },
  { slug: "negotiation-agent", title: "Negotiation Agent", tagline: "Multi-round price discovery, fully auditable", category: "Trade OS", template: "workflow", pain: "Manual negotiation is biased and slow.", cure: "Agent runs N rounds against shortlisted suppliers using your guardrails.", steps: [{ title: "Anchor", description: "Open with category benchmark", status: "done" },{ title: "Counter", description: "Suppliers respond w/ terms", status: "done" },{ title: "Best & final", description: "Single round, sealed bids", status: "active" },{ title: "Award", description: "Auto-rank by total cost of ownership", status: "pending" }] },
  { slug: "contract-builder", title: "AI Contract Builder", tagline: "Bilingual contracts, India-stamp ready", category: "Trade OS", template: "tool", pain: "Drafting purchase contracts costs ₹8k–25k per deal.", cure: "Choose template, agent fills, e-stamps via SHCIL, both parties e-sign.", fields: [{ key: "template", label: "Template", type: "select", default: "Goods supply", options: ["Goods supply","Job work","Distribution","NDA","MSA"] },{ key: "value", label: "Contract value (₹)", type: "number", default: 500000 }] },
  { slug: "escrow-agent", title: "Escrow Agent", tagline: "Milestone-based fund release", category: "Trade OS", template: "landing", pain: "Advance payment is the #1 fraud vector in B2B.", cure: "Funds parked in RBI-licensed escrow. Released on delivery + acceptance.", ctaPrimary: { label: "Open Escrow Center", to: "/escrow" } },
  { slug: "logistics-agent", title: "Logistics Agent", tagline: "Auto book best carrier with AI-predicted ETA", category: "Trade OS", template: "landing", pain: "Procurement teams aren't logistics teams.", cure: "Agent picks carrier, books, tracks and re-routes on delay.", ctaPrimary: { label: "Open Tracking", to: "/tracking" } },
  { slug: "compliance-agent", title: "Compliance Agent", tagline: "GST, e-way bill, e-invoice — generated automatically", category: "Trade OS", template: "guide", pain: "Compliance paperwork follows every shipment.", cure: "Agent generates and files all artefacts before dispatch.", sections: [{ title: "Auto-generated artefacts", body: "Each ships to buyer & seller inbox.", bullets: ["GST tax invoice (B2B)","E-invoice IRN + QR","E-way bill","Delivery challan","Lorry receipt"] }] },
  { slug: "payout-agent", title: "Payout Agent", tagline: "T+1 supplier payouts", category: "Trade OS", template: "landing", pain: "Suppliers wait 45–90 days for payment.", cure: "Acceptance triggers IMPS/RTGS payout within 24 hours.", ctaPrimary: { label: "Supplier Dashboard", to: "/supplier/dashboard" } },
  { slug: "learning-agent", title: "Learning Agent", tagline: "Every deal makes the next one cheaper", category: "Trade OS", template: "guide", pain: "Insights from each deal die in inboxes.", cure: "Agent extracts patterns and feeds back into matching, pricing and negotiation.", sections: [{ title: "What it learns", body: "Continuously.", bullets: ["Best supplier per category × geo","Realistic lead times","Counter-offer success rate","Quality reject patterns"] }] },

  // Buyer Painkillers (12)
  { slug: "rfq-studio", title: "RFQ Studio", tagline: "Tier-aware questions and negotiation terms", category: "Buyer Painkillers", template: "landing", pain: "Bad RFQs get bad quotes.", cure: "Auto-adds questions & terms based on shortlisted suppliers' tiers.", ctaPrimary: { label: "Create RFQ", to: "/buyer/dashboard" } },
  { slug: "supplier-matching", title: "AI Supplier Matching", tagline: "Trust × Price × Delivery, ranked", category: "Buyer Painkillers", template: "tool", pain: "Cheapest supplier ≠ best supplier.", cure: "Matched on weighted score with tunable sliders.", fields: [{ key: "trust", label: "Trust weight", type: "number", default: 40, suffix: "%" },{ key: "price", label: "Price weight", type: "number", default: 35, suffix: "%" },{ key: "delivery", label: "Delivery weight", type: "number", default: 25, suffix: "%" }], formula: "score = trust*w1 + price_inv*w2 + delivery_score*w3" },
  { slug: "bulk-price-calculator", title: "Bulk Price Calculator", tagline: "Volume break + freight + duty + GST", category: "Buyer Painkillers", template: "tool", pain: "Listed unit price hides true landed cost.", cure: "Live calculator factors slabs, freight, IGST/CGST, octroi.", fields: [{ key: "qty", label: "Quantity", type: "number", default: 10000 },{ key: "unit_price", label: "Unit price (₹)", type: "number", default: 5.5 },{ key: "freight_pct", label: "Freight %", type: "number", default: 4 },{ key: "gst", label: "GST %", type: "number", default: 18 }], formula: "landed = qty*unit_price*(1+freight%/100)*(1+gst/100)" },
  { slug: "reverse-auction", title: "Reverse Auction Room", tagline: "Suppliers bid down in real time", category: "Buyer Painkillers", template: "landing", pain: "Sealed quotes leave 4–11% savings on the table.", cure: "Live 30-min auction. Avg discovered savings: 9.2%.", ctaPrimary: { label: "Start auction", to: "/buyer/dashboard" } },
  { slug: "guaranteed-best-price", title: "Guaranteed Best Price", tagline: "We refund the difference, within 30 days", category: "Buyer Painkillers", template: "landing", pain: "FOMO on a lower price tomorrow.", cure: "Show us a matching verified quote in 30 days — we credit the delta.", ctaPrimary: { label: "Read terms", to: "/escrow" } },
  { slug: "buyer-credit", title: "Buyer Credit (BNPL)", tagline: "Net 30 / Net 60 with no collateral", category: "Buyer Painkillers", template: "landing", pain: "Working capital crunch kills good orders.", cure: "Underwritten in 4 hours using GST & bank statements.", ctaPrimary: { label: "Open Credit Center", to: "/buyer/credit" } },
  { slug: "compare-products", title: "Product Comparator", tagline: "Side-by-side specs, price, supplier trust", category: "Buyer Painkillers", template: "landing", pain: "Procurement decisions need a defensible audit trail.", cure: "Pin up to 4 products. Export comparison sheet.", ctaPrimary: { label: "Open Compare", to: "/compare" } },
  { slug: "wishlist-watcher", title: "Wishlist & Price Watcher", tagline: "Alert me when this drops 5%", category: "Buyer Painkillers", template: "landing", pain: "Procurement is opportunistic — prices move.", cure: "Track items; get alerted on price, stock or new supplier.", ctaPrimary: { label: "Open Wishlist", to: "/wishlist" } },
  { slug: "vendor-onboarding-buyer", title: "1-Click Vendor Onboarding", tagline: "Push verified supplier into your ERP", category: "Buyer Painkillers", template: "guide", pain: "Adding a new vendor in SAP takes 2 weeks.", cure: "Verified KYC + bank pack pushed via API to SAP/Oracle/Tally.", sections: [{ title: "Supported ERPs", body: "Plug & play connectors.", bullets: ["SAP S/4HANA","Oracle NetSuite","Tally Prime","Zoho Books","Microsoft Dynamics"] }] },
  { slug: "demand-aggregation", title: "Demand Aggregation", tagline: "Pool orders across departments for bigger discounts", category: "Buyer Painkillers", template: "tool", pain: "Sub-MOQ orders pay 18–30% more.", cure: "Aggregate across plants and quarters; we negotiate as one block.", fields: [{ key: "plants", label: "# Plants", type: "number", default: 4 },{ key: "monthly_qty", label: "Monthly qty (each)", type: "number", default: 1200 }], formula: "discount% = log10(total_qty) * 4" },
  { slug: "spend-analytics", title: "Spend Analytics", tagline: "Where every rupee of procurement goes", category: "Buyer Painkillers", template: "dashboard", pain: "Finance can't see procurement spend by category in real time.", cure: "Live dashboard with category, supplier, plant, GL code drill-down.", kpis: makeKPIs("₹84.1 Cr", "12.4%", "32 cat", "8 plants"), chartData: makeChart(12, 60, 25) },
  { slug: "approval-workflow", title: "Approval Workflow", tagline: "Multi-level, slab-based, mobile-first", category: "Buyer Painkillers", template: "workflow", pain: "POs sit in 4 inboxes for 9 days.", cure: "Configurable slabs, mobile approval, escalation timers.", steps: [{ title: "Requester", description: "Plant engineer raises PR", status: "done" },{ title: "Plant head", description: "Approves up to ₹2L", status: "done" },{ title: "Procurement", description: "Validates suppliers", status: "active" },{ title: "Finance", description: "Budget check", status: "pending" },{ title: "CFO", description: "Above ₹10L", status: "pending" }] },

  // Supplier Painkillers (12)
  { slug: "lead-feed", title: "Verified Lead Feed", tagline: "Only buyers we've KYC'd reach you", category: "Supplier Painkillers", template: "landing", pain: "90% of inbound leads are tyre-kickers.", cure: "Buyers verified, intent scored, budget validated before lead drops.", ctaPrimary: { label: "Open Dashboard", to: "/supplier/dashboard" } },
  { slug: "catalog-studio", title: "Catalog Studio", tagline: "AI-written descriptions + photo enhancer", category: "Supplier Painkillers", template: "landing", pain: "Suppliers can't write copy.", cure: "Upload specs sheet; AI writes title, description, search tags.", ctaPrimary: { label: "Add product", to: "/supplier/dashboard" } },
  { slug: "supplier-analytics", title: "Supplier Analytics", tagline: "Conversion funnel, win-rate, peer benchmark", category: "Supplier Painkillers", template: "landing", pain: "Suppliers fly blind on what's working.", cure: "Funnel from impression → lead → quote → win, with peer benchmark.", ctaPrimary: { label: "Open Analytics", to: "/supplier/analytics" } },
  { slug: "instant-payout", title: "T+1 Instant Payout", tagline: "Get paid 24 hours after delivery acceptance", category: "Supplier Painkillers", template: "landing", pain: "45–90 day payment cycles kill MSMEs.", cure: "Acceptance + GST invoice = IMPS/RTGS within 24 hours.", ctaPrimary: { label: "Configure payout", to: "/supplier/dashboard" } },
  { slug: "invoice-financing", title: "Invoice Financing", tagline: "Discount your receivables at 0.9%/month", category: "Supplier Painkillers", template: "tool", pain: "Money tied in receivables can't fund the next order.", cure: "Discount Lovable-marketplace invoices instantly.", fields: [{ key: "invoice", label: "Invoice value (₹)", type: "number", default: 500000 },{ key: "days", label: "Days to due", type: "number", default: 45 }], formula: "discount = invoice * 0.009 * (days/30)" },
  { slug: "tier-upgrade-coach", title: "Tier Upgrade Coach", tagline: "Exactly what to fix to reach Gold", category: "Supplier Painkillers", template: "guide", pain: "Suppliers don't know why they're Silver, not Gold.", cure: "Personalised gap report with one-action-per-week plan.", sections: [{ title: "Your gap to Gold", body: "Top 3 levers, ordered by impact.", bullets: ["Reduce avg quote turnaround from 14 → 6 hours","Lift OTD from 91% → 96%","Resolve 2 open disputes"] }] },
  { slug: "rfq-inbox", title: "Smart RFQ Inbox", tagline: "Auto-quote with your price book", category: "Supplier Painkillers", template: "landing", pain: "Quote desk drowns under 200 RFQs/day.", cure: "RFQs auto-matched to SKUs; one-tap quote.", ctaPrimary: { label: "Open inbox", to: "/messages" } },
  { slug: "factory-showcase", title: "Factory Showcase", tagline: "Video-first storefronts that close deals", category: "Supplier Painkillers", template: "landing", pain: "Buyers can't visit your plant.", cure: "Geotagged video walkthroughs embedded in storefront.", ctaPrimary: { label: "Upload video", to: "/supplier/dashboard" } },
  { slug: "supplier-onboarding", title: "11-Minute Onboarding", tagline: "GST → verified → live in 11 minutes", category: "Supplier Painkillers", template: "workflow", pain: "Marketplace onboarding takes 3 weeks.", cure: "Auto-validated GST + AI catalog import + auto-storefront.", steps: [{ title: "GST", description: "Auto-fetch profile", status: "done" },{ title: "Catalog", description: "CSV/Tally import", status: "done" },{ title: "Bank", description: "Pennytest", status: "active" },{ title: "Live", description: "Storefront published", status: "pending" }], ctaPrimary: { label: "Start", to: "/supplier/onboarding" } },
  { slug: "demand-radar", title: "Demand Radar", tagline: "See buyer intent before RFQ goes out", category: "Supplier Painkillers", template: "dashboard", pain: "Sales teams react instead of pursue.", cure: "Search & wishlist signals surface as 'warm intent' for matched suppliers.", kpis: makeKPIs("412", "24%", "1.8 day", "₹6.4 Cr"), chartData: makeChart(10, 30, 20) },
  { slug: "supplier-loans", title: "Supplier Working Capital Loans", tagline: "Pre-approved against marketplace GMV", category: "Supplier Painkillers", template: "landing", pain: "Bank loans need collateral suppliers don't have.", cure: "Pre-approved limit basis 12-month GMV. Disbursed in 24 hours.", ctaPrimary: { label: "Check limit", to: "/supplier/dashboard" } },
  { slug: "review-management", title: "Review & Reputation Manager", tagline: "Reply, dispute, and surface positive reviews", category: "Supplier Painkillers", template: "landing", pain: "One angry review ruins 50 happy ones.", cure: "Triage, response templates, and dispute path for unfair reviews.", ctaPrimary: { label: "Open reviews", to: "/supplier/dashboard" } },

  // Logistics & Tracking (8)
  { slug: "live-tracking", title: "Live Shipment Tracking", tagline: "AI-predicted ETA across 40+ carriers", category: "Logistics & Tracking", template: "landing", pain: "Buyers WhatsApp the supplier 5x a day for status.", cure: "Single tracker. AI ETA reflects real road & weather data.", ctaPrimary: { label: "Open tracking", to: "/tracking" } },
  { slug: "freight-marketplace", title: "Freight Marketplace", tagline: "FTL & LTL bidding in 6 minutes", category: "Logistics & Tracking", template: "directory", pain: "Calling 6 transporters wastes the morning.", cure: "Post load; verified transporters bid in 6 minutes.", rows: makeRows(15, "Transporter") },
  { slug: "warehouse-network", title: "Warehouse-as-a-Service", tagline: "Pay-per-pallet in 22 cities", category: "Logistics & Tracking", template: "directory", pain: "Renting warehouse for seasonal stock is wasteful.", cure: "Pallet-day pricing across 22-city network.", rows: makeRows(22, "Warehouse") },
  { slug: "last-mile", title: "Last-Mile B2B Delivery", tagline: "Hyperlocal pickup + drop within city", category: "Logistics & Tracking", template: "tool", pain: "Urgent same-city deliveries are painful to arrange.", cure: "On-demand 2-wheeler & tempo within 90 minutes.", fields: [{ key: "weight", label: "Weight (kg)", type: "number", default: 25 },{ key: "distance", label: "Distance (km)", type: "number", default: 12 }], formula: "fare = 60 + weight*2 + distance*9" },
  { slug: "cold-chain", title: "Cold-Chain Logistics", tagline: "Temperature-monitored shipments", category: "Logistics & Tracking", template: "landing", pain: "Chemicals & pharma reject 4% of shipments due to temp breach.", cure: "IoT sensors stream temp; alerts on breach.", ctaPrimary: { label: "Track shipment", to: "/tracking" } },
  { slug: "export-shipping", title: "Export Shipping Wizard", tagline: "CHA, freight, docs in one flow", category: "Logistics & Tracking", template: "workflow", pain: "Export shipping touches 9 parties and 14 documents.", cure: "Single wizard handles CHA, freight, ICEGATE, bank.", steps: [{ title: "Booking", description: "Choose port & line", status: "done" },{ title: "Stuffing", description: "Plant or CFS", status: "active" },{ title: "Docs", description: "BL, COO, packing list", status: "pending" },{ title: "Sail & remit", description: "Tracking + bank remit", status: "pending" }] },
  { slug: "delivery-sla", title: "Delivery SLA Engine", tagline: "Penalty-backed delivery promises", category: "Logistics & Tracking", template: "guide", pain: "Promised dates slip without consequence.", cure: "Supplier sets SLA; auto-deducts penalty from payout on miss.", sections: [{ title: "How penalties work", body: "Configurable per category.", bullets: ["0–24 hr late: 1% deduction","24–72 hr late: 3% deduction",">72 hr: 7% + buyer can cancel"] }] },
  { slug: "reverse-logistics", title: "Reverse Logistics", tagline: "Pickup, inspect, refund in 7 days", category: "Logistics & Tracking", template: "landing", pain: "Returning B2B goods is a nightmare.", cure: "Schedule pickup, neutral inspection, automated refund.", ctaPrimary: { label: "Start return", to: "/tracking" } },

  // Finance & Credit (10)
  { slug: "risk-audit-trail", title: "Risk Audit Trail", tagline: "Every risk-driven limit change, fully explained", category: "Finance & Credit", template: "landing", pain: "Limits get cut and nobody tells you why.", cure: "Each cut shows the rule, the threshold crossed and the records behind it.", ctaPrimary: { label: "Open audit trail", to: "/buyer/risk-audit" } },
  { slug: "risk-rule-studio", title: "Risk Rule Studio", tagline: "Tune thresholds and simulate the outcome first", category: "Finance & Credit", template: "landing", pain: "Policy changes go live blind and cut good buyers.", cure: "Move a threshold, watch a real buyer's limit and action update instantly, then publish.", ctaPrimary: { label: "Open rule studio", to: "/admin/risk-rules" } },
  { slug: "credit-line", title: "₹2 Cr Credit Line", tagline: "Pre-approved against your trading history", category: "Finance & Credit", template: "landing", pain: "Banks need 6 weeks and collateral.", cure: "Marketplace GMV underwrites you in 4 hours.", ctaPrimary: { label: "Check limit", to: "/buyer/credit" } },
  { slug: "auto-repayment", title: "Auto-Repayment Engine", tagline: "Repay from incoming receivables", category: "Finance & Credit", template: "landing", pain: "Manual EMI is one more thing to track.", cure: "Sweep configurable % of every incoming payment to credit line.", ctaPrimary: { label: "Configure", to: "/buyer/credit" } },
  { slug: "trade-insurance", title: "Trade Credit Insurance", tagline: "Insure your receivables for 0.4%", category: "Finance & Credit", template: "tool", pain: "One bad debt wipes out 50 good deals.", cure: "Insurer pays 90% of bad debt; we handle paperwork.", fields: [{ key: "limit", label: "Insured limit (₹)", type: "number", default: 5000000 }], formula: "premium_yr = limit * 0.004" },
  { slug: "fx-hedging", title: "FX Hedging for Exporters", tagline: "Forward cover in 3 clicks", category: "Finance & Credit", template: "tool", pain: "Exporters lose 2–6% to rupee volatility.", cure: "Bank-tied forward cover with 1-tap booking.", fields: [{ key: "amount", label: "USD", type: "number", default: 50000 },{ key: "tenor", label: "Tenor (days)", type: "number", default: 90 }], formula: "fwd_rate = spot + (tenor/365)*forward_premium" },
  { slug: "letter-of-credit", title: "Letter of Credit Issuance", tagline: "Issue an LC in 90 minutes", category: "Finance & Credit", template: "workflow", pain: "LC issuance is a 3-week paper chase.", cure: "Digital LC across 14 banks. Avg issuance: 90 min.", steps: [{ title: "Apply", description: "Fill structured form", status: "done" },{ title: "Bank review", description: "Auto-routed to your bank", status: "active" },{ title: "Issue", description: "MT700 sent", status: "pending" }] },
  { slug: "supply-chain-financing", title: "Supply-Chain Financing", tagline: "Anchor buyer unlocks supplier credit", category: "Finance & Credit", template: "guide", pain: "Tier-2/3 suppliers can't access credit.", cure: "Anchor buyer's rating unlocks discounting for the chain.", sections: [{ title: "How it works", body: "3-party arrangement.", bullets: ["Buyer approves invoice","Lender discounts at anchor's rate","Supplier paid in 24 hrs"] }] },
  { slug: "gst-input-financing", title: "GST Input Credit Financing", tagline: "Unlock cash from accumulated ITC", category: "Finance & Credit", template: "tool", pain: "ITC piles up while cash flow tightens.", cure: "Advance against verified ITC at 1.1%/month.", fields: [{ key: "itc", label: "ITC balance (₹)", type: "number", default: 1500000 }], formula: "advance = itc * 0.85" },
  { slug: "loan-marketplace", title: "Loan Marketplace", tagline: "Compare 14 lenders, apply once", category: "Finance & Credit", template: "directory", pain: "Each lender is a separate 40-page application.", cure: "Single form, 14 offers, e-sign acceptance.", rows: makeRows(14, "Lender") },
  { slug: "escrow-center", title: "Escrow Center", tagline: "Milestone-based, RBI-licensed", category: "Finance & Credit", template: "landing", pain: "Advance + trust = recipe for fraud.", cure: "Funds locked till delivery acceptance.", ctaPrimary: { label: "Open escrow", to: "/escrow" } },
  { slug: "payment-recon", title: "Payment Reconciliation", tagline: "Auto-match payouts to invoices", category: "Finance & Credit", template: "landing", pain: "Finance teams spend 30% of time matching payments.", cure: "Auto-match using UTR, narration ML, GST IRN.", ctaPrimary: { label: "Open recon", to: "/supplier/dashboard" } },

  // Compliance & Tax (8)
  { slug: "gst-filing", title: "GST Filing Autopilot", tagline: "GSTR-1, 3B, 9 — generated & filed", category: "Compliance & Tax", template: "landing", pain: "Monthly GST filing is fragmented across tools.", cure: "Marketplace transactions auto-generate filing-ready returns.", ctaPrimary: { label: "Open filing", to: "/supplier/dashboard" } },
  { slug: "e-invoicing", title: "E-Invoicing", tagline: "IRN + QR for every B2B invoice", category: "Compliance & Tax", template: "landing", pain: "E-invoicing breaks 1 in 12 invoices.", cure: "Auto-IRN with validation, retries and reconciliation.", ctaPrimary: { label: "Configure", to: "/supplier/dashboard" } },
  { slug: "e-way-bill", title: "E-Way Bill Generator", tagline: "Generate, extend, cancel — bulk friendly", category: "Compliance & Tax", template: "tool", pain: "EWB downtime ruins dispatch schedules.", cure: "Bulk generate; auto-retry on portal downtime.", fields: [{ key: "invoices", label: "# invoices today", type: "number", default: 40 }], formula: "auto_ewbs = invoices * 0.92" },
  { slug: "tds-tcs", title: "TDS / TCS Manager", tagline: "Section 194Q, 206C(1H) auto-classified", category: "Compliance & Tax", template: "guide", pain: "194Q vs 206C(1H) confusion leads to double tax.", cure: "Auto-classifies and generates Form 26Q, 27EQ.", sections: [{ title: "Rules engine", body: "Threshold tracking per PAN.", bullets: ["₹50L threshold tracker","Lower-deduction certificate support","Form 26Q quarterly export","TRACES-ready CSV"] }] },
  { slug: "msme-compliance", title: "MSME 45-Day Tracker", tagline: "Section 43B(h) compliance dashboard", category: "Compliance & Tax", template: "dashboard", pain: "43B(h) disallows expense if MSME unpaid >45 days.", cure: "Live tracker shows ageing & 31 Mar exposure.", kpis: makeKPIs("₹4.1 Cr", "94%", "12 days", "₹0 risk"), chartData: makeChart(12, 80, 10) },
  { slug: "factory-licenses", title: "Factory Licence Tracker", tagline: "Factories Act, Pollution, Fire — all expiry tracked", category: "Compliance & Tax", template: "directory", pain: "Licence expiry stops production.", cure: "Central tracker with renewal calendar and lawyer connect.", rows: makeRows(10, "Licence") },
  { slug: "labour-compliance", title: "Labour Compliance", tagline: "PF, ESI, PT — all states", category: "Compliance & Tax", template: "guide", pain: "Multi-state labour compliance has 50+ returns.", cure: "Single dashboard, auto-prepared returns, state-wise calendar.", sections: [{ title: "Returns automated", body: "Per state.", bullets: ["EPF ECR","ESI MC","PT monthly","Form V (annual)"] }] },
  { slug: "import-export-code", title: "IEC & DGFT Toolkit", tagline: "Modify, renew, RoDTEP, advance authorisation", category: "Compliance & Tax", template: "landing", pain: "DGFT portal is unfriendly.", cure: "Friendly UI for IEC, RoDTEP claims, advance authorisation.", ctaPrimary: { label: "Open toolkit", to: "/supplier/verification" } },

  // Analytics & Intelligence (8)
  { slug: "price-intelligence", title: "Price Intelligence", tagline: "Live category benchmarks", category: "Analytics & Intelligence", template: "dashboard", pain: "You overpay when you don't know the market.", cure: "Live median, p10, p90 by SKU & geography.", kpis: makeKPIs("12,400", "+4.2%", "8 cat", "Live"), chartData: makeChart(12, 90, 12) },
  { slug: "demand-forecast", title: "Demand Forecast", tagline: "AI prediction of next quarter demand", category: "Analytics & Intelligence", template: "dashboard", pain: "Procurement is reactive.", cure: "ML forecast per SKU with confidence interval.", kpis: makeKPIs("184 SKUs", "MAPE 8.2%", "Q+1", "94% conf"), chartData: makeChart(12, 50, 25) },
  { slug: "supplier-benchmark", title: "Supplier Benchmark", tagline: "How you compare to category peers", category: "Analytics & Intelligence", template: "landing", pain: "Suppliers don't know where they stand.", cure: "Percentile rank on price, lead time, OTD, NPS.", ctaPrimary: { label: "View benchmark", to: "/supplier/analytics" } },
  { slug: "competitor-watch", title: "Competitor Watch", tagline: "Track competing storefronts (anonymised)", category: "Analytics & Intelligence", template: "landing", pain: "Suppliers can't see what others charge.", cure: "Anonymised peer pricing for your top 50 SKUs.", ctaPrimary: { label: "Open intel", to: "/intelligence" } },
  { slug: "market-pulse", title: "Market Pulse", tagline: "Daily price & inventory signals", category: "Analytics & Intelligence", template: "guide", pain: "Macro signals are buried in reports.", cure: "Daily 60-second briefing on your categories.", sections: [{ title: "Signals tracked", body: "Every morning.", bullets: ["Steel HRC index","Copper LME","Diesel price","Port congestion","INR/USD"] }] },
  { slug: "category-explorer", title: "Category Explorer", tagline: "GMV, growth, top suppliers by category", category: "Analytics & Intelligence", template: "directory", pain: "Hard to know where to expand next.", cure: "Drill into 200+ categories with GMV & growth.", rows: makeRows(20, "Category") },
  { slug: "region-explorer", title: "Region Explorer", tagline: "Cluster intelligence for 20+ cities", category: "Analytics & Intelligence", template: "directory", pain: "Where are the buyers? Where are the suppliers?", cure: "Heatmap of demand & supply density.", rows: makeRows(20, "Region") },
  { slug: "esg-scorecard", title: "ESG Scorecard", tagline: "Supplier sustainability scoring", category: "Analytics & Intelligence", template: "dashboard", pain: "Big buyers need ESG data; suppliers can't produce it.", cure: "Automated ESG score from energy, waste, labour data.", kpis: makeKPIs("420 suppliers", "67/100 avg", "+8 YoY", "ISO 26000"), chartData: makeChart(12, 60, 10) },

  // Tools & Calculators (8)
  { slug: "moq-calculator", title: "MOQ vs Carrying Cost Calculator", tagline: "Find the right order quantity", category: "Tools & Calculators", template: "tool", pain: "Big MOQ = inventory pain; small MOQ = higher price.", cure: "EOQ formula with your warehousing & financing rates.", fields: [{ key: "demand", label: "Annual demand (units)", type: "number", default: 120000 },{ key: "order_cost", label: "Order cost (₹)", type: "number", default: 1200 },{ key: "carry_cost", label: "Carrying cost/unit/yr (₹)", type: "number", default: 8 }], formula: "EOQ = sqrt(2*D*S/H)" },
  { slug: "landed-cost", title: "Landed Cost Calculator", tagline: "Import all-in cost per unit", category: "Tools & Calculators", template: "tool", pain: "Hidden duties & port charges blow budgets.", cure: "BCD + IGST + cess + freight + clearance.", fields: [{ key: "fob", label: "FOB (USD)", type: "number", default: 10000 },{ key: "bcd", label: "BCD %", type: "number", default: 10 },{ key: "igst", label: "IGST %", type: "number", default: 18 }], formula: "landed = fob*fx*(1+bcd)*(1+igst) + freight + clearance" },
  { slug: "gst-calculator", title: "GST Calculator", tagline: "Inclusive / exclusive, all slabs", category: "Tools & Calculators", template: "tool", pain: "GST math errors create invoice disputes.", cure: "Validates slab, rounds correctly per CGST rules.", fields: [{ key: "amount", label: "Amount", type: "number", default: 10000 },{ key: "rate", label: "GST %", type: "number", default: 18 },{ key: "mode", label: "Mode", type: "select", default: "exclusive", options: ["exclusive","inclusive"] }] },
  { slug: "freight-estimator", title: "Freight Estimator", tagline: "FTL/LTL/courier across India", category: "Tools & Calculators", template: "tool", pain: "Carrier quotes vary 40% for same load.", cure: "Estimator backed by 8M historical shipments.", fields: [{ key: "from", label: "From", type: "select", default: "Pune", options: indianCities },{ key: "to", label: "To", type: "select", default: "Delhi", options: indianCities },{ key: "weight", label: "Weight (kg)", type: "number", default: 2000 }] },
  { slug: "duty-finder", title: "HS Code & Duty Finder", tagline: "Search 12,000 HS codes", category: "Tools & Calculators", template: "tool", pain: "Wrong HS code = customs hold.", cure: "Search + AI suggestion based on product description.", fields: [{ key: "desc", label: "Product description", type: "select", default: "Stainless steel bolt M8", options: ["Stainless steel bolt M8","HDPE granules","CNC turned brass part"] }] },
  { slug: "roi-calculator", title: "ROI Calculator", tagline: "Switch to Vyapar OS — see your savings", category: "Tools & Calculators", template: "tool", pain: "Hard to justify changing procurement tools.", cure: "Input current spend & margins; see modelled savings.", fields: [{ key: "spend", label: "Annual procurement (₹)", type: "number", default: 50000000 },{ key: "margin", label: "Gross margin %", type: "number", default: 22 }], formula: "savings = spend * 0.062 + working_capital * 0.011" },
  { slug: "credit-eligibility", title: "Credit Eligibility Check", tagline: "60-second pre-qualification", category: "Tools & Calculators", template: "tool", pain: "Loan rejections leave a credit score scar.", cure: "Soft check using GST + bank statement.", fields: [{ key: "turnover", label: "Annual turnover (₹)", type: "number", default: 25000000 },{ key: "age_yrs", label: "Years in business", type: "number", default: 5 }], formula: "limit = min(turnover*0.15, age_yrs * 1500000)" },
  { slug: "trust-score-simulator", title: "Trust Score Simulator", tagline: "What would push you to Gold?", category: "Tools & Calculators", template: "tool", pain: "Score formulas feel opaque.", cure: "Move sliders; see your projected score.", fields: [{ key: "otd", label: "On-time delivery %", type: "number", default: 92 },{ key: "dispute", label: "Dispute rate %", type: "number", default: 1.4 },{ key: "response", label: "Avg response (hrs)", type: "number", default: 6 }], formula: "score = otd*4 + (100-dispute*10) + (100-response)*1.5" },

  // Guides & Playbooks (8)
  { slug: "playbook-rfq", title: "Playbook: Writing RFQs That Get Replies", tagline: "Templates + checklist + dos & don'ts", category: "Guides & Playbooks", template: "guide", pain: "Bad RFQs get 1-line bro-emails back.", cure: "Field-by-field structure, validated against 240k RFQs.", sections: [{ title: "Anatomy of a great RFQ", body: "Five required, three killer.", bullets: ["Specs as table, not paragraph","Quantity + unit + tolerance","Delivery window with penalty","Payment terms upfront","Quality criteria + sample requirement"] }] },
  { slug: "playbook-negotiation", title: "Playbook: B2B Negotiation", tagline: "Anchoring, BATNA, packaging", category: "Guides & Playbooks", template: "guide", pain: "Procurement is taught spreadsheets, not negotiation.", cure: "10-chapter playbook with India-specific scripts.", sections: [{ title: "Anchoring", body: "Open with category p25, not p50.", bullets: ["Open low but justified","Package terms, not only price","Use silence","Never split-the-difference reflexively"] }] },
  { slug: "playbook-fraud", title: "Playbook: Spot a Fake Supplier in 5 Minutes", tagline: "Red flags every buyer should know", category: "Guides & Playbooks", template: "guide", pain: "Fraud patterns repeat — but buyers don't know them.", cure: "5-minute drill: GST, website age, photos, bank, references.", sections: [{ title: "5-minute drill", body: "If 2+ fail, walk away.", bullets: ["GST not active or <1 yr old","Website domain <6 months","Stock images on product page","Bank account name ≠ legal name","No verifiable customer references"] }] },
  { slug: "playbook-exports", title: "Playbook: First Export Order", tagline: "From inquiry to BL in 30 days", category: "Guides & Playbooks", template: "guide", pain: "First exports are scary and expensive.", cure: "End-to-end checklist with bank, CHA, freight, insurance.", sections: [{ title: "Order timeline", body: "30 days realistic.", bullets: ["Day 1–3: PO + LC","Day 4–18: production","Day 19–22: stuffing + docs","Day 23–25: customs","Day 26–30: sail + bank remit"] }] },
  { slug: "playbook-msme", title: "Playbook: MSME Schemes Worth Claiming", tagline: "Udyam, CGTMSE, ECLGS, PLI, RAMP", category: "Guides & Playbooks", template: "guide", pain: "₹17,000 Cr in MSME schemes go unclaimed yearly.", cure: "Eligibility checker per scheme + application help.", sections: [{ title: "Top schemes", body: "Ranked by ease of claim.", bullets: ["Udyam registration (free, instant)","CGTMSE collateral-free loans up to ₹5 Cr","PLI for specified sectors","RAMP digital adoption grant","ZED certification subsidy"] }] },
  { slug: "playbook-pricing", title: "Playbook: B2B Pricing Strategy", tagline: "Cost-plus vs value-based vs anchor", category: "Guides & Playbooks", template: "guide", pain: "Suppliers default to cost-plus and leave money on the table.", cure: "Mix of cost-plus floors + value-based ceilings.", sections: [{ title: "Three pricing models", body: "Use all three in parallel.", bullets: ["Cost-plus for commodities","Value-based for engineered solutions","Anchor + decoy for catalog products"] }] },
  { slug: "playbook-disputes", title: "Playbook: Resolving Disputes Fast", tagline: "Evidence, escalation, settlement", category: "Guides & Playbooks", template: "guide", pain: "Disputes destroy relationships and cash flow.", cure: "Resolve 80% within 7 days using evidence-first approach.", sections: [{ title: "Evidence kit", body: "Collect on day 1.", bullets: ["Photos + video with timestamp","WhatsApp / email trail","PO + invoice + GRN","Third-party inspection report"] }] },
  { slug: "playbook-erp", title: "Playbook: B2B Procurement & ERP Integration", tagline: "SAP, Oracle, Tally — done right", category: "Guides & Playbooks", template: "guide", pain: "ERP projects overrun by 2x.", cure: "Phased approach with quick wins first.", sections: [{ title: "Phasing", body: "Quick wins → core integrations.", bullets: ["Phase 1: vendor master sync","Phase 2: PO push","Phase 3: 3-way match","Phase 4: payment & 2-way visibility"] }] },

  // Industry Solutions (10)
  ...industries.slice(0, 10).map<PageDef>((ind) => ({
    slug: `industry-${ind.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    title: `${ind} — End-to-End Painkiller`,
    tagline: `Vyapar OS playbook for the ${ind} industry`,
    category: "Industry Solutions",
    template: "landing",
    pain: `${ind} buyers face fragmented suppliers, inconsistent quality and 60-day payment cycles.`,
    cure: `Verified ${ind} suppliers, escrow-backed payments, category-tuned RFQ templates.`,
    sections: [
      { title: "Why this category is broken", body: "Three structural issues we fix.", bullets: ["Long tail of sub-scale suppliers","Quality variance across geographies","Payment terms favouring big buyers"] },
      { title: "What we ship for you", body: "Out-of-the-box modules.", bullets: ["Curated supplier directory","Category-specific RFQ template","Quality spec library","Lead-time benchmarks"] },
    ],
    ctaPrimary: { label: "Browse suppliers", to: "/categories" },
  })),

  // Regional Hubs (10)
  ...indianCities.slice(0, 10).map<PageDef>((city) => ({
    slug: `region-${city.toLowerCase()}`,
    title: `${city} B2B Hub`,
    tagline: `Verified suppliers, buyers and logistics in ${city}`,
    category: "Regional Hubs",
    template: "directory",
    pain: `Finding reliable industrial suppliers in ${city} still happens via WhatsApp groups.`,
    cure: `${city}-specific directory with verified GSTIN, plant photos, lead times.`,
    rows: makeRows(15, city),
    ctaPrimary: { label: `Post RFQ for ${city}`, to: "/buyer/dashboard" },
  })),
];

// ---- auto-generated long tail ----
const longTail: PageDef[] = [];
// Category × city = lots of pages
for (const ind of industries.slice(0, 10)) {
  for (const city of indianCities.slice(0, 5)) {
    longTail.push({
      slug: `${ind.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-suppliers-${city.toLowerCase()}`,
      title: `${ind} Suppliers in ${city}`,
      tagline: `${30 + ((ind.length * city.length) % 80)} verified ${ind.toLowerCase()} suppliers in ${city}`,
      category: "Regional Hubs",
      template: "directory",
      pain: `${city} buyers waste hours hunting reliable ${ind.toLowerCase()} suppliers.`,
      cure: `Verified, GSTIN-validated ${ind.toLowerCase()} suppliers within ${city} — escrow ready.`,
      rows: makeRows(10, `${city} · ${ind}`),
    });
  }
}

export const pageRegistry: PageDef[] = [...curated, ...longTail];

export const pagesByCategory = pageRegistry.reduce<Record<string, PageDef[]>>((acc, p) => {
  (acc[p.category] ||= []).push(p);
  return acc;
}, {});

export const getPage = (slug: string) => pageRegistry.find((p) => p.slug === slug);
export const totalPages = pageRegistry.length;
