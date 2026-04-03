// Generate realistic price history for a product
export function generatePriceHistory(basePrice: number, months: number = 12) {
  const data: { month: string; price: number; volume: number }[] = [];
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const now = new Date();

  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const variation = (Math.sin(i * 0.5) * 0.08 + (Math.random() - 0.5) * 0.06);
    const price = Math.round(basePrice * (1 + variation) * 100) / 100;
    const volume = Math.round(500 + Math.random() * 2000);
    data.push({
      month: `${monthNames[d.getMonth()]} ${d.getFullYear().toString().slice(2)}`,
      price,
      volume,
    });
  }
  return data;
}
