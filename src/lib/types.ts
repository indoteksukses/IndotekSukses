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

export type ProductVisualShape = "bolt" | "nut" | "screw" | "wrench" | "drill" | "grinder" | "saw" | "hammer" | "pliers" | "bearing" | "tape" | "generic" | "custom";

export type ProductVisualElement = {
  type: "path" | "rect" | "circle" | "ellipse" | "polygon" | "line";
  x?: number; y?: number; x1?: number; y1?: number; x2?: number; y2?: number;
  width?: number; height?: number; rx?: number; cx?: number; cy?: number; r?: number;
  points?: string; d?: string; fill?: string; stroke?: string; strokeWidth?: number;
  opacity?: number; rotate?: number;
};

export type ProductVisualDefinition = {
  shape: ProductVisualShape;
  primary?: string;
  secondary?: string;
  accent?: string;
  background?: string;
  elements?: ProductVisualElement[];
};

export type ProductVisual = {
  id: string;
  name: string;
  code: ProductVisualDefinition;
  is_builtin: boolean;
  is_active: boolean;
};

export type ProductVariant = {
  id: string;
  product_id: string;
  name: string;
  sku?: string | null;
  barcode?: string | null;
  cost_price: number;
  selling_price: number;
  is_active: boolean;
  sort_order: number;
  stocks: Record<string, StockLevel>;
  total_stock: number;
  selected_stock?: number;
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
  image_url?: string | null;
  visual_id?: string | null;
  visual?: ProductVisual | null;
  is_active: boolean;
  sales_scope?: "all" | "selected";
  sales_store_ids?: string[];
  stocks: Record<string, StockLevel>;
  total_stock: number;
  selected_stock?: number;
  variants?: ProductVariant[];
};

export type CartItem = {
  key: string;
  product_id: string;
  variant_id?: string | null;
  variant_name?: string | null;
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
  username?: string | null;
  phone?: string | null;
  role: UserRole;
  primary_store_id?: string | null;
  is_active: boolean;
  avatar_key?: string;
  deleted_at?: string | null;
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
  variant_id?: string | null;
  variant_name?: string | null;
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
  logo_url?: string;
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
  variant_id?: string | null;
  variant_name?: string | null;
  variant_sku?: string | null;
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
