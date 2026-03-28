import { CatalogProduct, RFQ } from "./types";
import { MOCK_CATALOG } from "./mock-data";

export interface MatchedSupplier {
  supplierId: string;
  supplierName: string;
  supplierCity: string;
  supplierState: string;
  supplierScore: number;
  matchScore: number; // 0-100 composite
  pricePerUnit: number;
  unit: string;
  leadTimeDays: number;
  inStock: boolean;
  categoryMatch: boolean;
  reasons: string[];
  breakdown: {
    trustWeight: number;
    priceWeight: number;
    deliveryWeight: number;
    availabilityBonus: number;
    categoryBonus: number;
  };
}

interface MatchConfig {
  trustWeight: number;
  priceWeight: number;
  deliveryWeight: number;
  availabilityBonus: number;
  categoryBonus: number;
}

const DEFAULT_CONFIG: MatchConfig = {
  trustWeight: 0.35,
  priceWeight: 0.30,
  deliveryWeight: 0.20,
  availabilityBonus: 0.08,
  categoryBonus: 0.07,
};

/**
 * AI-powered supplier matching algorithm.
 * Ranks suppliers by a weighted composite of trust score, price competitiveness,
 * delivery speed, stock availability, and category relevance.
 */
export function matchSuppliers(rfq: Pick<RFQ, "category" | "quantity" | "unit" | "budget" | "deliveryDate">, config = DEFAULT_CONFIG): MatchedSupplier[] {
  // Deduplicate suppliers (catalog may list multiple products per supplier)
  const supplierMap = new Map<string, CatalogProduct[]>();
  for (const p of MOCK_CATALOG) {
    const existing = supplierMap.get(p.supplierId) || [];
    existing.push(p);
    supplierMap.set(p.supplierId, existing);
  }

  const daysUntilDeadline = rfq.deliveryDate
    ? Math.max(1, Math.ceil((new Date(rfq.deliveryDate).getTime() - Date.now()) / 86400000))
    : 30;

  const allPrices = MOCK_CATALOG.map((p) => p.pricePerUnit);
  const minPrice = Math.min(...allPrices);
  const maxPrice = Math.max(...allPrices);

  const results: MatchedSupplier[] = [];

  for (const [supplierId, products] of supplierMap) {
    // Pick the best product match: prefer category match, then lowest price
    const categoryProducts = products.filter((p) => p.category === rfq.category);
    const bestProduct = categoryProducts.length > 0
      ? categoryProducts.reduce((a, b) => a.pricePerUnit < b.pricePerUnit ? a : b)
      : products.reduce((a, b) => a.pricePerUnit < b.pricePerUnit ? a : b);

    const categoryMatch = bestProduct.category === rfq.category;

    // --- Trust score (0-100) ---
    const trustNorm = Math.min(bestProduct.supplierScore / 1000, 1) * 100;

    // --- Price competitiveness (0-100, lower price = higher score) ---
    const priceNorm = maxPrice === minPrice
      ? 50
      : ((maxPrice - bestProduct.pricePerUnit) / (maxPrice - minPrice)) * 100;

    // Budget alignment bonus
    let budgetBonus = 0;
    if (rfq.budget > 0) {
      const estimatedTotal = bestProduct.pricePerUnit * rfq.quantity;
      if (estimatedTotal <= rfq.budget) budgetBonus = 10;
      else if (estimatedTotal <= rfq.budget * 1.1) budgetBonus = 5;
    }

    // --- Delivery score (0-100, faster = higher) ---
    const deliveryNorm = bestProduct.leadTimeDays <= daysUntilDeadline
      ? Math.max(0, 100 - (bestProduct.leadTimeDays / daysUntilDeadline) * 100 + 20)
      : Math.max(0, 30 - (bestProduct.leadTimeDays - daysUntilDeadline) * 5);

    // --- Availability (0 or bonus) ---
    const availScore = bestProduct.inStock ? 100 : 0;

    // --- Category relevance (0 or bonus) ---
    const catScore = categoryMatch ? 100 : 0;

    // Composite
    const composite = Math.min(100, Math.round(
      trustNorm * config.trustWeight +
      (priceNorm + budgetBonus) * config.priceWeight +
      deliveryNorm * config.deliveryWeight +
      availScore * config.availabilityBonus +
      catScore * config.categoryBonus
    ));

    // Build human-readable reasons
    const reasons: string[] = [];
    if (trustNorm >= 80) reasons.push("High trust score");
    else if (trustNorm >= 60) reasons.push("Good trust score");
    if (priceNorm >= 70) reasons.push("Competitive pricing");
    if (budgetBonus > 0) reasons.push("Within budget");
    if (bestProduct.leadTimeDays <= daysUntilDeadline) reasons.push("Can meet deadline");
    if (bestProduct.inStock) reasons.push("In stock");
    if (categoryMatch) reasons.push("Exact category match");

    results.push({
      supplierId,
      supplierName: bestProduct.supplierName,
      supplierCity: bestProduct.supplierCity,
      supplierState: bestProduct.supplierState,
      supplierScore: bestProduct.supplierScore,
      matchScore: composite,
      pricePerUnit: bestProduct.pricePerUnit,
      unit: bestProduct.unit,
      leadTimeDays: bestProduct.leadTimeDays,
      inStock: bestProduct.inStock,
      categoryMatch,
      reasons,
      breakdown: {
        trustWeight: Math.round(trustNorm * config.trustWeight),
        priceWeight: Math.round((priceNorm + budgetBonus) * config.priceWeight),
        deliveryWeight: Math.round(deliveryNorm * config.deliveryWeight),
        availabilityBonus: Math.round(availScore * config.availabilityBonus),
        categoryBonus: Math.round(catScore * config.categoryBonus),
      },
    });
  }

  return results.sort((a, b) => b.matchScore - a.matchScore);
}
