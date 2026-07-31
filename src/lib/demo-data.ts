import type { Product, Store } from "@/lib/types";

export const demoStores: Store[] = [
  { id: "11111111-1111-1111-1111-111111111111", code: "IDS-01", name: "Indotek Sukses Toko 1", address: "Cabang Utama" },
  { id: "22222222-2222-2222-2222-222222222222", code: "IDS-02", name: "Indotek Sukses Toko 2", address: "Cabang Kedua" },
];

export const demoProducts: Product[] = [
  { id: "p1", sku: "MSE-LOG-001", barcode: "899100000001", name: "Mouse Wireless Logitech", category: "Aksesori Komputer", unit: "pcs", cost_price: 65000, selling_price: 85000, minimum_stock: 5, is_active: true, stock_store_1: 18, stock_store_2: 9 },
  { id: "p2", sku: "HDMI-002", barcode: "899100000002", name: "Kabel HDMI 2 Meter", category: "Kabel", unit: "pcs", cost_price: 32000, selling_price: 50000, minimum_stock: 8, is_active: true, stock_store_1: 31, stock_store_2: 12 },
  { id: "p3", sku: "KEY-USB-001", barcode: "899100000003", name: "Keyboard USB Mechanical Lite", category: "Aksesori Komputer", unit: "pcs", cost_price: 95000, selling_price: 135000, minimum_stock: 5, is_active: true, stock_store_1: 6, stock_store_2: 14 },
  { id: "p4", sku: "ADP-65W-001", barcode: "899100000004", name: "Adaptor Laptop Universal 65W", category: "Power", unit: "pcs", cost_price: 110000, selling_price: 155000, minimum_stock: 4, is_active: true, stock_store_1: 3, stock_store_2: 7 },
  { id: "p5", sku: "LAN-CAT6-5M", barcode: "899100000005", name: "Kabel LAN Cat6 5 Meter", category: "Jaringan", unit: "pcs", cost_price: 27000, selling_price: 45000, minimum_stock: 6, is_active: true, stock_store_1: 22, stock_store_2: 19 },
  { id: "p6", sku: "HUB-USB3-004", barcode: "899100000006", name: "USB Hub 3.0 4 Port", category: "Aksesori Komputer", unit: "pcs", cost_price: 75000, selling_price: 105000, minimum_stock: 5, is_active: true, stock_store_1: 10, stock_store_2: 4 },
];

export const demoMovements = [
  { id: "m1", time: "2026-07-31T09:20:00+07:00", store: "Toko 1", product: "Mouse Wireless Logitech", type: "Stok masuk", quantity: 10, user: "Andi Gudang" },
  { id: "m2", time: "2026-07-31T10:15:00+07:00", store: "Toko 1", product: "Kabel HDMI 2 Meter", type: "Penjualan", quantity: -2, user: "Rina Kasir" },
  { id: "m3", time: "2026-07-31T11:05:00+07:00", store: "Toko 2", product: "USB Hub 3.0 4 Port", type: "Barang rusak", quantity: -1, user: "Budi Gudang" },
];
