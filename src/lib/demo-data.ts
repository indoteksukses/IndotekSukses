import type { Movement, Product, StockLevel, Store, SystemSettings, UserProfile } from "@/lib/types";

export const demoStores: Store[] = [
  { id: "11111111-1111-1111-1111-111111111111", code: "IDS-01", name: "Indotek Sukses Pusat", address: "Cabang Utama", phone: "0812-0000-0001", is_active: true },
  { id: "22222222-2222-2222-2222-222222222222", code: "IDS-02", name: "Indotek Sukses Timur", address: "Cabang Timur", phone: "0812-0000-0002", is_active: true },
  { id: "33333333-3333-3333-3333-333333333333", code: "IDS-03", name: "Indotek Sukses Barat", address: "Cabang Barat", phone: "0812-0000-0003", is_active: true },
];

const stock = (values: number[]): Record<string, StockLevel> => Object.fromEntries(demoStores.map((store, index) => [store.id, {
  store_id: store.id,
  store_code: store.code,
  store_name: store.name,
  quantity_on_hand: values[index] ?? 0,
  quantity_reserved: 0,
  quantity_available: values[index] ?? 0,
  stock_status: ((values[index] ?? 0) === 0 ? "out" : (values[index] ?? 0) <= 5 ? "low" : "safe") as StockLevel["stock_status"],
}]));

export const demoProducts: Product[] = [
  { id: "p1", sku: "MSE-LOG-001", barcode: "899100000001", name: "Mouse Wireless Logitech", category: "Aksesori Komputer", unit: "pcs", cost_price: 65000, selling_price: 85000, minimum_stock: 5, is_active: true, stocks: stock([18, 9, 6]), total_stock: 33 },
  { id: "p2", sku: "HDMI-002", barcode: "899100000002", name: "Kabel HDMI 2 Meter", category: "Kabel", unit: "pcs", cost_price: 32000, selling_price: 50000, minimum_stock: 8, is_active: true, stocks: stock([31, 12, 4]), total_stock: 47 },
  { id: "p3", sku: "KEY-USB-001", barcode: "899100000003", name: "Keyboard USB Mechanical Lite", category: "Aksesori Komputer", unit: "pcs", cost_price: 95000, selling_price: 135000, minimum_stock: 5, is_active: true, stocks: stock([6, 14, 10]), total_stock: 30 },
  { id: "p4", sku: "ADP-65W-001", barcode: "899100000004", name: "Adaptor Laptop Universal 65W", category: "Power", unit: "pcs", cost_price: 110000, selling_price: 155000, minimum_stock: 4, is_active: true, stocks: stock([3, 7, 0]), total_stock: 10 },
  { id: "p5", sku: "LAN-CAT6-5M", barcode: "899100000005", name: "Kabel LAN Cat6 5 Meter", category: "Jaringan", unit: "pcs", cost_price: 27000, selling_price: 45000, minimum_stock: 6, is_active: true, stocks: stock([22, 19, 11]), total_stock: 52 },
  { id: "p6", sku: "HUB-USB3-004", barcode: "899100000006", name: "USB Hub 3.0 4 Port", category: "Aksesori Komputer", unit: "pcs", cost_price: 75000, selling_price: 105000, minimum_stock: 5, is_active: true, stocks: stock([10, 4, 8]), total_stock: 22 },
];

export const demoMovements: Movement[] = [
  { id: "m1", time: "2026-07-31T09:20:00+07:00", store: demoStores[0].name, product: "Mouse Wireless Logitech", type: "Stok masuk", quantity: 10, user: "Andi Gudang" },
  { id: "m2", time: "2026-07-31T10:15:00+07:00", store: demoStores[1].name, product: "Kabel HDMI 2 Meter", type: "Penjualan", quantity: -2, user: "Rina Kasir" },
  { id: "m3", time: "2026-07-31T11:05:00+07:00", store: demoStores[2].name, product: "USB Hub 3.0 4 Port", type: "Barang rusak", quantity: -1, user: "Budi Gudang" },
];

export const demoProfile: UserProfile = {
  id: "demo-owner",
  full_name: "Owner Indotek Sukses",
  email: "admin@indoteksukses.id",
  role: "owner",
  primary_store_id: demoStores[0].id,
  is_active: true,
  store_ids: demoStores.map((store) => store.id),
};

export const demoSettings: SystemSettings = {
  company_name: "Indotek Sukses",
  company_tagline: "Inventory & Point of Sale",
  phone: "",
  address: "",
  receipt_footer: "Terima kasih telah berbelanja di Indotek Sukses.",
};
