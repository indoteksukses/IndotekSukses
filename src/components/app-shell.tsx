"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import {
  BarChart3, Boxes, Building2, ChevronDown, ClipboardCheck, FileBarChart,
  History, LayoutDashboard, LoaderCircle, LogOut, Menu, PackagePlus, ReceiptText, Settings,
  ShoppingCart, Store, Truck, Users, WalletCards, X, RotateCcw,
} from "lucide-react";
import type { Store as StoreType, SystemSettings, UserProfile } from "@/lib/types";
import { ProfileMenu } from "@/components/profile-menu";
import { UserAvatar } from "@/components/user-avatar";

const groups = [
  {
    label: "UTAMA",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["owner","admin","manager","cashier","warehouse"] },
      { href: "/pos", label: "Kasir", icon: ShoppingCart, roles: ["owner","admin","manager","cashier"] },
      { href: "/sales", label: "Transaksi", icon: ReceiptText, roles: ["owner","admin","manager","cashier"] },
      { href: "/shifts", label: "Shift Kasir", icon: WalletCards, roles: ["owner","admin","manager","cashier"] },
    ],
  },
  {
    label: "PRODUK & STOK",
    items: [
      { href: "/products", label: "Master Produk", icon: Boxes, roles: ["owner","admin","manager","cashier","warehouse"] },
      { href: "/inventory", label: "Stok Semua Toko", icon: Store, roles: ["owner","admin","manager","cashier","warehouse"] },
      { href: "/stock-movements", label: "Stok Masuk / Keluar", icon: PackagePlus, roles: ["owner","admin","manager","warehouse"] },
      { href: "/transfers", label: "Transfer Antartoko", icon: Truck, roles: ["owner","admin","manager","warehouse"] },
      { href: "/stock-opname", label: "Stok Opname", icon: ClipboardCheck, roles: ["owner","admin","manager","warehouse"] },
      { href: "/returns", label: "Retur", icon: RotateCcw, roles: ["owner","admin","manager","cashier"] },
    ],
  },
  {
    label: "MANAJEMEN",
    items: [
      { href: "/stores", label: "Toko & Cabang", icon: Building2, roles: ["owner","admin"] },
      { href: "/purchases", label: "Pembelian", icon: ShoppingCart, roles: ["owner","admin","manager","warehouse"] },
      { href: "/suppliers", label: "Supplier", icon: Building2, roles: ["owner","admin","manager","warehouse"] },
      { href: "/reports", label: "Laporan", icon: FileBarChart, roles: ["owner","admin","manager"] },
      { href: "/users", label: "Karyawan & Akses", icon: Users, roles: ["owner","admin"] },
      { href: "/audit", label: "Audit Aktivitas", icon: History, roles: ["owner","admin","manager"] },
      { href: "/settings", label: "Pengaturan", icon: Settings, roles: ["owner","admin"] },
    ],
  },
];

const roleLabels: Record<string, string> = {
  owner: "Owner", admin: "Admin", manager: "Kepala Toko", cashier: "Kasir", warehouse: "Gudang",
};

export function AppShell({ children, stores, profile, settings }: { children: ReactNode; stores: StoreType[]; profile: UserProfile; settings: SystemSettings }) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchKey = searchParams.toString();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [storeOpen, setStoreOpen] = useState(false);
  const [navigatingHref, setNavigatingHref] = useState<string | null>(null);
  const selectedStoreId = searchParams.get("store") ?? "";
  const selectedStore = stores.find((store) => store.id === selectedStoreId);

  useEffect(() => {
    setNavigatingHref(null);
    setMobileOpen(false);
  }, [pathname, searchKey]);

  const beginNavigation = (href: string) => {
    setNavigatingHref(href);
    window.setTimeout(() => setNavigatingHref((current) => current === href ? null : current), 1800);
  };

  const selectStore = (storeId: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (storeId) params.set("store", storeId); else params.delete("store");
    const query = params.toString();
    const destination = query ? `${pathname}?${query}` : pathname;
    beginNavigation(destination);
    router.push(destination);
    setStoreOpen(false);
  };

  return (
    <div className="app-shell">
      {navigatingHref ? <div className="route-loading-bar" aria-label="Membuka halaman"><span /></div> : null}
      <aside className={`sidebar ${mobileOpen ? "sidebar-open" : ""}`}>
        <div className="brand">
          {settings.logo_url ? <img className="brand-logo" src={settings.logo_url} alt={settings.company_name}/> : <div className="brand-mark">IS</div>}
          <div><strong>{settings.company_name}</strong><span>{settings.company_tagline}</span></div>
          <button className="icon-button sidebar-close" onClick={() => setMobileOpen(false)} aria-label="Tutup menu"><X size={20}/></button>
        </div>
        <nav className="sidebar-nav">
          {groups.map((group) => (
            <div className="nav-group" key={group.label}>
              <span className="nav-label">{group.label}</span>
              {group.items.filter((item) => item.roles.includes(profile.role)).map((item) => {
                const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                const Icon = item.icon;
                const href = selectedStoreId ? `${item.href}?store=${selectedStoreId}` : item.href;
                const loading = navigatingHref === href;
                return <Link
                  key={item.href}
                  href={href}
                  className={`nav-item ${active ? "active" : ""} ${loading ? "is-loading" : ""}`}
                  aria-busy={loading}
                  onClick={() => { beginNavigation(href); setMobileOpen(false); }}
                >
                  {loading ? <LoaderCircle className="loading-spinner nav-loading-spinner" size={19}/> : <Icon size={19}/>}<span>{item.label}</span>
                </Link>;
              })}
            </div>
          ))}
        </nav>
        <div className="sidebar-footer">
          <UserAvatar name={profile.full_name} avatarKey={profile.avatar_key}/>
          <div><strong>{profile.full_name}</strong><span>{roleLabels[profile.role] ?? profile.role}</span></div>
          <form action="/auth/signout" method="post"><button className="logout-button" title="Keluar"><LogOut size={17}/></button></form>
        </div>
      </aside>
      {mobileOpen ? <button className="sidebar-backdrop" aria-label="Tutup menu" onClick={() => setMobileOpen(false)} /> : null}

      <main className="main-area">
        <header className="topbar">
          <button className="icon-button mobile-menu" onClick={() => setMobileOpen(true)} aria-label="Buka menu"><Menu size={22}/></button>
          <div className="store-selector-wrap">
            <button className="store-selector" onClick={() => setStoreOpen((value) => !value)}>
              {navigatingHref?.startsWith(pathname) ? <LoaderCircle className="loading-spinner" size={18}/> : selectedStore?.image_url ? <img className="store-selector-image" src={selectedStore.image_url} alt=""/> : <Store size={18}/>}<span>{selectedStore?.name ?? "Semua Toko"}</span><ChevronDown size={16}/>
            </button>
            {storeOpen ? <div className="store-menu">
              <button className={!selectedStoreId ? "selected" : ""} onClick={() => selectStore("")}>Semua Toko</button>
              {stores.map((store) => <button className={selectedStoreId === store.id ? "selected" : ""} key={store.id} onClick={() => selectStore(store.id)}>{store.image_url ? <img className="store-menu-image" src={store.image_url} alt=""/> : null}<span><strong>{store.name}</strong><small>{store.code}</small></span></button>)}
              {profile.role === "owner" || profile.role === "admin" ? <Link href="/stores" className="store-manage-link" onClick={() => beginNavigation("/stores")}>+ Kelola cabang</Link> : null}
            </div> : null}
          </div>
          <div className="topbar-right">
            <div className="system-status"><span/> Sistem aktif</div>
            <Link className="icon-button" href="/reports" title="Ringkasan laporan" onClick={() => beginNavigation("/reports")}>{navigatingHref === "/reports" ? <LoaderCircle className="loading-spinner" size={19}/> : <BarChart3 size={19}/>}</Link>
            <ProfileMenu profile={profile} stores={stores}/>
          </div>
        </header>
        <div className="content">{children}</div>
      </main>
    </div>
  );
}
