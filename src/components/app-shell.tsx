"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import {
  BarChart3, Boxes, Building2, ChevronDown, ClipboardCheck, FileBarChart,
  History, LayoutDashboard, Menu, PackagePlus, ReceiptText, Settings,
  ShoppingCart, Store, Truck, Users, WalletCards, X, RotateCcw,
} from "lucide-react";

const groups = [
  {
    label: "UTAMA",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/pos", label: "Kasir", icon: ShoppingCart },
      { href: "/sales", label: "Transaksi", icon: ReceiptText },
      { href: "/shifts", label: "Shift Kasir", icon: WalletCards },
    ],
  },
  {
    label: "PRODUK & STOK",
    items: [
      { href: "/products", label: "Master Produk", icon: Boxes },
      { href: "/inventory", label: "Stok Semua Toko", icon: Store },
      { href: "/stock-movements", label: "Stok Masuk / Keluar", icon: PackagePlus },
      { href: "/transfers", label: "Transfer Antartoko", icon: Truck },
      { href: "/stock-opname", label: "Stok Opname", icon: ClipboardCheck },
      { href: "/returns", label: "Retur", icon: RotateCcw },
    ],
  },
  {
    label: "MANAJEMEN",
    items: [
      { href: "/purchases", label: "Pembelian", icon: ShoppingCart },
      { href: "/suppliers", label: "Supplier", icon: Building2 },
      { href: "/reports", label: "Laporan", icon: FileBarChart },
      { href: "/users", label: "Karyawan & Akses", icon: Users },
      { href: "/audit", label: "Audit Aktivitas", icon: History },
      { href: "/settings", label: "Pengaturan", icon: Settings },
    ],
  },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [storeOpen, setStoreOpen] = useState(false);
  const [store, setStore] = useState("Semua Toko");

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileOpen ? "sidebar-open" : ""}`}>
        <div className="brand">
          <div className="brand-mark">IS</div>
          <div><strong>Indotek Sukses</strong><span>Inventory & POS</span></div>
          <button className="icon-button sidebar-close" onClick={() => setMobileOpen(false)} aria-label="Tutup menu"><X size={20}/></button>
        </div>
        <nav className="sidebar-nav">
          {groups.map((group) => (
            <div className="nav-group" key={group.label}>
              <span className="nav-label">{group.label}</span>
              {group.items.map((item) => {
                const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                const Icon = item.icon;
                return <Link key={item.href} href={item.href} className={`nav-item ${active ? "active" : ""}`} onClick={() => setMobileOpen(false)}><Icon size={19}/><span>{item.label}</span></Link>;
              })}
            </div>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="user-avatar">AD</div>
          <div><strong>Admin Indotek</strong><span>Owner</span></div>
          <Link href="/login" className="logout-link">Keluar</Link>
        </div>
      </aside>
      {mobileOpen ? <button className="sidebar-backdrop" aria-label="Tutup menu" onClick={() => setMobileOpen(false)} /> : null}

      <main className="main-area">
        <header className="topbar">
          <button className="icon-button mobile-menu" onClick={() => setMobileOpen(true)} aria-label="Buka menu"><Menu size={22}/></button>
          <div className="store-selector-wrap">
            <button className="store-selector" onClick={() => setStoreOpen((v) => !v)}><Store size={18}/><span>{store}</span><ChevronDown size={16}/></button>
            {storeOpen ? <div className="store-menu">
              {["Semua Toko", "Indotek Sukses Toko 1", "Indotek Sukses Toko 2"].map((name) => <button key={name} onClick={() => { setStore(name); setStoreOpen(false); }}>{name}</button>)}
            </div> : null}
          </div>
          <div className="topbar-right">
            <div className="system-status"><span/> Sistem aktif</div>
            <button className="icon-button" title="Ringkasan laporan"><BarChart3 size={19}/></button>
            <div className="top-avatar">AD</div>
          </div>
        </header>
        <div className="content">{children}</div>
      </main>
    </div>
  );
}
