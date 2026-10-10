"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useId, useRef, useState, useTransition, type MouseEvent as ReactMouseEvent, type ReactNode } from "react";
import {
  BarChart3, Boxes, Building2, ChevronDown, ClipboardCheck, FileBarChart,
  History, LayoutDashboard, LoaderCircle, LogOut, Menu, PackagePlus, ReceiptText, Settings,
  ShoppingCart, Store, Truck, Users, WalletCards, X, RotateCcw,
} from "lucide-react";
import type { Store as StoreType, SystemSettings, UserProfile } from "@/lib/types";
import { ProfileMenu } from "@/components/profile-menu";
import { UserAvatar } from "@/components/user-avatar";
import { ThemeToggle } from "@/components/theme-toggle";

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

function isModifiedNavigation(event: ReactMouseEvent<HTMLAnchorElement>) {
  return event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey;
}

export function AppShell({ children, stores, profile, settings }: { children: ReactNode; stores: StoreType[]; profile: UserProfile; settings: SystemSettings }) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchKey = searchParams.toString();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [storeOpen, setStoreOpen] = useState(false);
  const [navigatingHref, setNavigatingHref] = useState<string | null>(null);
  const [storeNavigating, startStoreTransition] = useTransition();
  const storeSelectorRef = useRef<HTMLDivElement>(null);
  const storeButtonRef = useRef<HTMLButtonElement>(null);
  const storeMenuId = useId();
  const requestedStoreId = searchParams.get("store") ?? "";
  const restrictedToOneStore = !["owner", "admin"].includes(profile.role) && stores.length === 1;
  const selectedStoreId = stores.some((store) => store.id === requestedStoreId)
    ? requestedStoreId
    : restrictedToOneStore ? stores[0]?.id ?? "" : "";
  const selectedStore = stores.find((store) => store.id === selectedStoreId);
  const currentHref = searchKey ? `${pathname}?${searchKey}` : pathname;

  useEffect(() => {
    setNavigatingHref(null);
    setMobileOpen(false);
    setStoreOpen(false);
  }, [pathname, searchKey]);

  useEffect(() => {
    if (!storeOpen) return;

    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!storeSelectorRef.current?.contains(event.target as Node)) setStoreOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      setStoreOpen(false);
      storeButtonRef.current?.focus();
    };

    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [storeOpen]);

  const beginNavigation = (href: string) => {
    if (href === currentHref) return;
    setNavigatingHref(href);
  };

  const selectStore = (storeId: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (storeId) params.set("store", storeId); else params.delete("store");
    const query = params.toString();
    const destination = query ? `${pathname}?${query}` : pathname;
    if (destination === currentHref) { setStoreOpen(false); return; }
    beginNavigation(destination);
    startStoreTransition(() => router.replace(destination));
    setStoreOpen(false);
  };

  return (
    <div className="app-shell">
      {navigatingHref ? <div className="route-loading-bar" aria-label="Membuka halaman"><span /></div> : null}
      <aside className={`sidebar ${mobileOpen ? "sidebar-open" : ""}`}>
        <div className="brand">
          {settings.logo_url ? <img className="brand-logo" src={settings.logo_url} alt={settings.company_name} decoding="async"/> : <div className="brand-mark">IS</div>}
          <div><strong>{settings.company_name}</strong><span>{settings.company_tagline}</span></div>
          <button type="button" className="icon-button sidebar-close" onClick={() => setMobileOpen(false)} aria-label="Tutup menu"><X size={20}/></button>
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
                  prefetch={false}
                  className={`nav-item ${active ? "active" : ""} ${loading ? "is-loading" : ""}`}
                  aria-busy={loading}
                  aria-current={active ? "page" : undefined}
                  onMouseEnter={() => router.prefetch(href)}
                  onFocus={() => router.prefetch(href)}
                  onClick={(event) => { if (isModifiedNavigation(event)) return; beginNavigation(href); setMobileOpen(false); }}
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
          <form action="/auth/signout" method="post"><button type="submit" className="logout-button" title="Keluar" aria-label="Keluar dari akun"><LogOut size={17}/></button></form>
        </div>
      </aside>
      {mobileOpen ? <button className="sidebar-backdrop" aria-label="Tutup menu" onClick={() => setMobileOpen(false)} /> : null}

      <main className="main-area">
        <header className="topbar">
          <button type="button" className="icon-button mobile-menu" onClick={() => { setStoreOpen(false); setMobileOpen(true); }} aria-label="Buka menu"><Menu size={22}/></button>
          <div className="store-selector-wrap" ref={storeSelectorRef}>
            <button ref={storeButtonRef} className="store-selector" type="button" aria-expanded={storeOpen} aria-haspopup="menu" aria-controls={storeOpen ? storeMenuId : undefined} aria-label={`Pilih toko. Saat ini ${selectedStore?.name ?? "semua toko"}`} onClick={() => setStoreOpen((value) => !value)}>
              {storeNavigating || navigatingHref?.startsWith(pathname) ? <LoaderCircle className="loading-spinner" size={18}/> : selectedStore?.image_url ? <img className="store-selector-image" src={selectedStore.image_url} alt="" loading="lazy" decoding="async"/> : <Store size={18}/>}<span>{selectedStore?.name ?? "Semua Toko"}</span><ChevronDown size={16}/>
            </button>
            {storeOpen ? <div className="store-menu" id={storeMenuId} role="menu" aria-label="Daftar toko">
              {!restrictedToOneStore ? <button type="button" role="menuitem" className={!selectedStoreId ? "selected" : ""} onClick={() => selectStore("")}>Semua Toko yang Diakses</button> : null}
              {stores.map((store) => <button type="button" role="menuitem" className={selectedStoreId === store.id ? "selected" : ""} key={store.id} onClick={() => selectStore(store.id)}>{store.image_url ? <img className="store-menu-image" src={store.image_url} alt="" loading="lazy" decoding="async"/> : null}<span><strong>{store.name}</strong><small>{store.code}</small></span></button>)}
              {profile.role === "owner" || profile.role === "admin" ? <Link href="/stores" prefetch={false} role="menuitem" className="store-manage-link" onMouseEnter={() => router.prefetch("/stores")} onFocus={() => router.prefetch("/stores")} onClick={(event) => { if (isModifiedNavigation(event)) return; setStoreOpen(false); beginNavigation("/stores"); }}>+ Kelola cabang</Link> : null}
            </div> : null}
          </div>
          <div className="topbar-right">
            <div className="system-status"><span/> Sistem aktif</div>
            <ThemeToggle />
            <Link className="icon-button" href={selectedStoreId ? `/reports?store=${selectedStoreId}` : "/reports"} prefetch={false} title="Ringkasan laporan" onMouseEnter={() => router.prefetch(selectedStoreId ? `/reports?store=${selectedStoreId}` : "/reports")} onFocus={() => router.prefetch(selectedStoreId ? `/reports?store=${selectedStoreId}` : "/reports")} onClick={(event) => { if (isModifiedNavigation(event)) return; beginNavigation(selectedStoreId ? `/reports?store=${selectedStoreId}` : "/reports"); }}>{navigatingHref?.startsWith("/reports") ? <LoaderCircle className="loading-spinner" size={19}/> : <BarChart3 size={19}/>}</Link>
            <ProfileMenu profile={profile} stores={stores}/>
          </div>
        </header>
        <div className="content">{children}</div>
      </main>
    </div>
  );
}
