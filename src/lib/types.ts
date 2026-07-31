export type UserRole = "owner" | "admin" | "manager" | "cashier" | "warehouse";

export type Store = {
  id: string;
  code: string;
  name: string;
  address?: string | null;
  phone?: string | null;
  manager_name?: string | null;
  image_url?: string | null;
  is_active?: boolean;
};

export type StockLevel = {
  store_id: string;
  store_code: string;
  store_name: string;
  quantity_on_hand: number;
  quantity_reserved: number;
  quantity_available: number;
  stock_status: "safe" | "low" | "out";
};

export type Product = {
  id: string;
  sku: string;
  barcode?: string | null;
  name: string;
  category?: string | null;
  category_id?: string | null;
  brand?: string | null;
  unit: string;
  cost_price: number;
  selling_price: number;
  minimum_stock: number;
  is_active: boolean;
  stocks: Record<string, StockLevel>;
  total_stock: number;
  selected_stock?: number;
};

export type CartItem = {
  product_id: string;
  sku: string;
  name: string;
  price: number;
  quantity: number;
  stock: number;
};

export type UserProfile = {
  id: string;
  full_name: string;
  email?: string | null;
  phone?: string | null;
  role: UserRole;
  primary_store_id?: string | null;
  is_active: boolean;
  avatar_key?: string;
  store_ids?: string[];
};

export type Movement = {
  id: string;
  time: string;
  store: string;
  product: string;
  type: string;
  quantity: number;
  user: string;
  reason?: string | null;
  movement_type?: string;
  product_id?: string;
  store_id?: string;
  stock_before?: number;
  stock_after?: number;
  reversed_at?: string | null;
  correction_reason?: string | null;
};

export type SaleSummary = {
  id: string;
  invoice_number: string;
  store_name: string;
  cashier_name: string;
  grand_total: number;
  status: string;
  completed_at: string;
  customer_name?: string | null;
};

export type SystemSettings = {
  company_name: string;
  company_tagline: string;
  phone?: string;
  address?: string;
  receipt_footer?: string;
};

export type FinancialReport = {
  gross_sales: number;
  refunds: number;
  net_sales: number;
  cogs: number;
  gross_profit: number;
  transactions: number;
  net_units: number;
  inventory_value: number;
};


export type SaleItemDetail = {
  id: string;
  product_id: string;
  name: string;
  sku: string;
  quantity: number;
  unit_price: number;
  discount: number;
  subtotal: number;
};

export type PaymentDetail = {
  id: string;
  method: string;
  amount: number;
  reference_number?: string | null;
};

export type SaleDetail = SaleSummary & {
  store_code?: string | null;
  store_address?: string | null;
  store_phone?: string | null;
  store_image_url?: string | null;
  subtotal: number;
  discount: number;
  tax: number;
  notes?: string | null;
  items: SaleItemDetail[];
  payments: PaymentDetail[];
};
