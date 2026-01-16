export type Product = {
  id: number;
  name: string;
  balance: number;
  type: 'checking' | 'savings' | 'investment';
  enabled?: boolean;
  iban?: string;
  holders?: number;
  interestRate?: number;
  performance?: string;
  /** Balance history for sparkline chart */
  balanceHistory?: number[];
  /** User custom name (nickname) */
  customName?: string;
};

export const defaultProducts: Product[] = [
  { id: 1, name: 'Betaalrekening', balance: 1200.0, type: 'checking', enabled: true, iban: 'NL91 ABNA 0417 1643 00', holders: 2, balanceHistory: [980, 1150, 1050, 1320, 1180, 1200] },
  { id: 2, name: 'Internetsparen', balance: 7000.0, type: 'savings', enabled: true, iban: 'NL91 ABNA 0417 1643 01', holders: 1, interestRate: 2.1, balanceHistory: [6200, 6400, 6550, 6700, 6850, 7000] },
  { id: 3, name: 'Beleggingsrekening', balance: 12847.53, type: 'investment', enabled: true, iban: 'NL91 ABNA 0417 1643 02', holders: 1, performance: '+8.3%', balanceHistory: [11500, 12100, 11800, 12400, 12600, 12847] }
];

const STORAGE_KEY = 'mock_products_v1';
const CUSTOM_NAMES_KEY = 'product_custom_names_v1';

function loadProductsFromStorage(): Product[] | null {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Product[];
  } catch {
    return null;
  }
}

function saveProductsToStorage(products: Product[]): void {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
  } catch {
    // Silently ignore storage errors
  }
}

/** Load custom product names from localStorage */
function loadCustomNames(): Record<number, string> {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return {};
  try {
    const raw = localStorage.getItem(CUSTOM_NAMES_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<number, string>;
  } catch {
    return {};
  }
}

/** Save custom product name to localStorage */
export function saveCustomProductName(productId: number, customName: string | null): void {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return;
  try {
    const names = loadCustomNames();
    if (customName && customName.trim()) {
      names[productId] = customName.trim();
    } else {
      delete names[productId];
    }
    localStorage.setItem(CUSTOM_NAMES_KEY, JSON.stringify(names));
    refreshProductsStore();
  } catch {
    // Silently ignore storage errors
  }
}

/** Get custom name for a product */
export function getCustomProductName(productId: number): string | null {
  const names = loadCustomNames();
  return names[productId] ?? null;
}

/** Get display name for a product (custom name or original) */
export function getProductDisplayName(product: Product): string {
  const customName = getCustomProductName(product.id);
  return customName ?? product.name;
}

export function getProducts(): Product[] {
  return loadProductsFromStorage() ?? defaultProducts;
}

// Svelte store to allow components to react to product changes immediately
import { writable } from 'svelte/store';

export const productsStore = writable<Product[]>(getProducts());

export function refreshProductsStore(): void {
  productsStore.set(getProducts());
}

export function toggleProductEnabledAndRefresh(id: number, enabled: boolean): void {
  const products = getProducts();
  const idx = products.findIndex((p) => p.id === id);
  if (idx >= 0) {
    products[idx].enabled = enabled;
    saveProductsToStorage(products);
    refreshProductsStore();
  }
}

export function resetProducts(): void {
  saveProductsToStorage([...defaultProducts]);
  refreshProductsStore();
}
