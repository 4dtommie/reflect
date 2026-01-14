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
};

export const defaultProducts: Product[] = [
  { id: 1, name: 'Betaalrekening', balance: 1200.0, type: 'checking', enabled: true, iban: 'NL91 ABNA 0417 1643 00', holders: 2 },
  { id: 2, name: 'Internetsparen', balance: 7000.0, type: 'savings', enabled: true, iban: 'NL91 ABNA 0417 1643 01', holders: 1, interestRate: 2.1 },
  { id: 3, name: 'Beleggingsrekening', balance: 12847.53, type: 'investment', enabled: true, iban: 'NL91 ABNA 0417 1643 02', holders: 1, performance: '+8.3%' }
];

const STORAGE_KEY = 'mock_products_v1';

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
