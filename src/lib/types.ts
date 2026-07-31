export type UserRole = "owner" | "admin" | "manager" | "cashier" | "warehouse";

export type Store = {
  id: string;
  code: string;
  name: string;
  address?: string | null;
};

export type Product = {
  id: string;
  sku: string;
  barcode?: string | null;
  name: string;
  category?: string | null;
  unit: string;
  cost_price: number;
  selling_price: number;
  minimum_stock: number;
  is_active: boolean;
  stock_store_1?: number;
  stock_store_2?: number;
};

export type CartItem = {
  product_id: string;
  sku: string;
  name: string;
  price: number;
  quantity: number;
  stock: number;
};
