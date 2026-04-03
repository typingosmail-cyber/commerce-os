const WISHLIST_KEY = "vyapar_wishlist";

export function getWishlist(): string[] {
  const data = localStorage.getItem(WISHLIST_KEY);
  return data ? JSON.parse(data) : [];
}

export function toggleWishlist(productId: string): string[] {
  const list = getWishlist();
  const idx = list.indexOf(productId);
  if (idx >= 0) {
    list.splice(idx, 1);
  } else {
    list.push(productId);
  }
  localStorage.setItem(WISHLIST_KEY, JSON.stringify(list));
  window.dispatchEvent(new CustomEvent("wishlist-change"));
  return list;
}

export function isInWishlist(productId: string): boolean {
  return getWishlist().includes(productId);
}

const COMPARE_KEY = "vyapar_compare";

export function getCompareList(): string[] {
  const data = localStorage.getItem(COMPARE_KEY);
  return data ? JSON.parse(data) : [];
}

export function toggleCompare(productId: string): string[] {
  const list = getCompareList();
  const idx = list.indexOf(productId);
  if (idx >= 0) {
    list.splice(idx, 1);
  } else {
    if (list.length >= 4) return list; // max 4
    list.push(productId);
  }
  localStorage.setItem(COMPARE_KEY, JSON.stringify(list));
  window.dispatchEvent(new CustomEvent("compare-change"));
  return list;
}

export function isInCompare(productId: string): boolean {
  return getCompareList().includes(productId);
}

export function clearCompare(): void {
  localStorage.removeItem(COMPARE_KEY);
  window.dispatchEvent(new CustomEvent("compare-change"));
}
