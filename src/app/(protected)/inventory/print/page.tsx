import Link from "next/link";
import { ArrowLeft, Printer } from "lucide-react";
import { getCurrentProfile, getNetworkInventoryStores, getProductsWithNetworkStocks, getSystemSettings } from "@/lib/data";
import { formatDateTime } from "@/lib/format";
import { CriticalStockDocument } from "@/components/critical-stock-document";
import { extractCriticalItems } from "@/components/critical-stock-modal";
import { PrintTriggerButton } from "./print-trigger-button";

export const metadata = { title: "Cetak Laporan Stok Kritis" };

export default async function InventoryPrintPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: "all" | "out" | "low";
    store?: string;
    cat?: string;
    brand?: string;
    orientation?: "landscape" | "portrait";
  }>;
}) {
  const params = await searchParams;
  const statusFilter = params.status === "out" ? "out" : params.status === "low" ? "low" : "all";
  const storeScopeId = params.store || "all";
  const categoryFilter = params.cat || "";
  const brandFilter = params.brand || "";
  const orientation = params.orientation === "portrait" ? "portrait" : "landscape";

  const [stores, products, profile, settings] = await Promise.all([
    getNetworkInventoryStores(),
    getProductsWithNetworkStocks(),
    getCurrentProfile(),
    getSystemSettings(),
  ]);

  const allItems = extractCriticalItems(products, stores, storeScopeId);

  const filteredItems = allItems.filter((item) => {
    if (statusFilter !== "all" && item.condition !== statusFilter) return false;
    if (categoryFilter && item.category !== categoryFilter) return false;
    if (brandFilter && item.brand !== brandFilter) return false;
    return true;
  }).sort((a, b) => {
    if (a.condition !== b.condition) {
      return a.condition === "out" ? -1 : 1;
    }
    return b.deficit - a.deficit || a.fullName.localeCompare(b.fullName, "id-ID");
  });

  let outCount = 0;
  let lowCount = 0;
  let totalDeficit = 0;
  for (const item of filteredItems) {
    if (item.condition === "out") outCount++;
    if (item.condition === "low") lowCount++;
    totalDeficit += item.deficit;
  }
  const metrics = {
    totalCount: filteredItems.length,
    outCount,
    lowCount,
    totalDeficit,
  };

  const selectedStoreObj = storeScopeId === "all" ? null : (stores.find((s) => s.id === storeScopeId) ?? null);
  const activeStores = storeScopeId === "all" ? stores : (selectedStoreObj ? [selectedStoreObj] : stores);

  const companyName = settings?.company_name || "CV Indotek Sukses Maju";
  const companyTagline = settings?.company_tagline || "Distributor Perkakas, Alat Teknik & Perlengkapan Industri";
  const companyAddress = settings?.address || "Jl. Raya Industri No. 88, Sidoarjo, Jawa Timur";
  const companyPhone = settings?.phone || "0812-3456-7890";
  const companyLogo = settings?.logo_url;
  const nowFormatted = formatDateTime(new Date());

  return (
    <div className="inventory-standalone-print-page">
      {/* Screen Toolbar (hidden in print) */}
      <div className="inventory-print-toolbar no-print">
        <div className="inventory-print-toolbar-left">
          <Link className="button secondary" href="/inventory">
            <ArrowLeft size={16} /> Kembali ke Stok
          </Link>
          <span className="inventory-print-title">
            Laporan Stok Kritis ({filteredItems.length} item ditemukan)
          </span>
        </div>

        <div className="inventory-print-toolbar-right">
          <div className="inventory-print-filter-links">
            <Link
              href={`/inventory/print?status=all&store=${storeScopeId}&orientation=${orientation}`}
              className={`button-pill ${statusFilter === "all" ? "active" : ""}`}
            >
              Semua Kritis
            </Link>
            <Link
              href={`/inventory/print?status=out&store=${storeScopeId}&orientation=${orientation}`}
              className={`button-pill ${statusFilter === "out" ? "active" : ""}`}
            >
              Hanya Habis
            </Link>
            <Link
              href={`/inventory/print?status=low&store=${storeScopeId}&orientation=${orientation}`}
              className={`button-pill ${statusFilter === "low" ? "active" : ""}`}
            >
              Hanya Menipis
            </Link>
          </div>

          <PrintTriggerButton orientation={orientation} />
        </div>
      </div>

      {/* Printable Document Container */}
      <div className="inventory-print-content-wrapper">
        <CriticalStockDocument
          filteredItems={filteredItems}
          activeStores={activeStores}
          metrics={metrics}
          companyName={companyName}
          companyTagline={companyTagline}
          companyAddress={companyAddress}
          companyPhone={companyPhone}
          companyLogo={companyLogo}
          nowFormatted={nowFormatted}
          selectedStoreObj={selectedStoreObj}
          statusFilter={statusFilter}
          profile={profile}
          orientation={orientation}
          showSignatures={true}
          showBarcode={true}
        />
      </div>
    </div>
  );
}
