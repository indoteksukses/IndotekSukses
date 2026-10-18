import type { CriticalItem } from "@/components/critical-stock-modal";
import type { Store, UserProfile } from "@/lib/types";

export function CriticalStockDocument({
  filteredItems,
  activeStores,
  metrics,
  companyName,
  companyTagline,
  companyAddress,
  companyPhone,
  companyLogo,
  nowFormatted,
  selectedStoreObj,
  statusFilter,
  profile,
  orientation,
  showSignatures,
  showBarcode,
}: {
  filteredItems: CriticalItem[];
  activeStores: Store[];
  metrics: {
    totalCount: number;
    outCount: number;
    lowCount: number;
    totalDeficit: number;
  };
  companyName: string;
  companyTagline: string;
  companyAddress: string;
  companyPhone?: string;
  companyLogo?: string;
  nowFormatted: string;
  selectedStoreObj: Store | null;
  statusFilter: "all" | "out" | "low";
  profile?: UserProfile | null;
  orientation: "landscape" | "portrait";
  showSignatures: boolean;
  showBarcode: boolean;
}) {
  return (
    <article className={`critical-stock-document layout-${orientation}`}>
      {/* Header / Letterhead */}
      <header className="critical-doc-header">
        <div className="critical-doc-brand">
          {companyLogo ? (
            <img src={companyLogo} alt={companyName} className="critical-doc-logo-img" decoding="async" />
          ) : (
            <div className="critical-doc-logo-placeholder">IS</div>
          )}
          <div className="critical-doc-brand-text">
            <h1 className="critical-doc-company">{companyName}</h1>
            <p className="critical-doc-tagline">{companyTagline}</p>
            <p className="critical-doc-contact">
              {companyAddress} {companyPhone ? `· Telp: ${companyPhone}` : ""}
            </p>
          </div>
        </div>

        <div className="critical-doc-meta">
          <div className="critical-doc-title-pill">LAPORAN STOK KRITIS</div>
          <div className="critical-doc-subtitle">Daftar Produk Menipis & Habis</div>
          <div className="critical-doc-meta-table">
            <div>
              <span>Tanggal Cetak</span>
              <strong>: {nowFormatted}</strong>
            </div>
            <div>
              <span>Cakupan Cabang</span>
              <strong>
                : {selectedStoreObj ? `${selectedStoreObj.name} (${selectedStoreObj.code})` : "Semua Cabang Jaringan"}
              </strong>
            </div>
            <div>
              <span>Filter Status</span>
              <strong>
                : {statusFilter === "out" ? "Hanya Habis" : statusFilter === "low" ? "Hanya Menipis" : "Menipis & Habis"}
              </strong>
            </div>
            <div>
              <span>Dicetak Oleh</span>
              <strong>
                : {profile?.full_name || "Petugas"} ({profile?.role ? profile.role.toUpperCase() : "STAFF"})
              </strong>
            </div>
          </div>
        </div>
      </header>

      {/* Document KPI Summary Bar */}
      <div className="critical-doc-summary-strip">
        <div className="summary-item">
          <span className="summary-label">Total Item Kritis</span>
          <span className="summary-val">{metrics.totalCount} SKU</span>
        </div>
        <div className="summary-item item-danger">
          <span className="summary-label">Stok Habis</span>
          <span className="summary-val">{metrics.outCount} SKU</span>
        </div>
        <div className="summary-item item-warning">
          <span className="summary-label">Stok Menipis</span>
          <span className="summary-val">{metrics.lowCount} SKU</span>
        </div>
        <div className="summary-item item-primary">
          <span className="summary-label">Estimasi Kebutuhan Restok</span>
          <span className="summary-val">+{metrics.totalDeficit.toLocaleString("id-ID")} Unit</span>
        </div>
      </div>

      {/* Critical Stock Table */}
      <table className="critical-doc-table">
        <thead>
          <tr>
            <th style={{ width: "28px", textAlign: "center" }}>No</th>
            <th>Produk & Varian</th>
            <th style={{ width: showBarcode ? "110px" : "90px" }}>SKU {showBarcode ? "/ Barcode" : ""}</th>
            <th style={{ width: "95px" }}>Kategori / Merek</th>
            <th style={{ width: "55px", textAlign: "right" }}>Min.</th>
            {activeStores.map((store) => (
              <th key={store.id} style={{ width: "65px", textAlign: "right" }}>
                <div className="doc-th-store">
                  <span>{store.code}</span>
                  <small>{store.name.replace("Toko ", "")}</small>
                </div>
              </th>
            ))}
            <th style={{ width: "65px", textAlign: "right" }}>Total</th>
            <th style={{ width: "75px", textAlign: "center" }}>Status</th>
            <th style={{ width: "65px", textAlign: "right" }}>Defisit</th>
          </tr>
        </thead>
        <tbody>
          {filteredItems.map((item, idx) => {
            const isOut = item.condition === "out";
            return (
              <tr key={item.key} className={isOut ? "row-out" : "row-low"}>
                <td style={{ textAlign: "center", color: "#64748b" }}>{idx + 1}</td>
                <td>
                  <div className="doc-item-title">
                    <strong>{item.productName}</strong>
                    {item.variantName ? <span className="doc-variant-name">Varian: {item.variantName}</span> : null}
                  </div>
                </td>
                <td>
                  <div className="doc-code-block">
                    <code className="doc-sku">{item.sku}</code>
                    {showBarcode && item.barcode ? <small className="doc-barcode">{item.barcode}</small> : null}
                  </div>
                </td>
                <td>
                  <div className="doc-meta-block">
                    <span className="doc-cat">{item.category}</span>
                    <span className="doc-brand">{item.brand}</span>
                  </div>
                </td>
                <td style={{ textAlign: "right", fontWeight: 600 }}>
                  {item.minimumStock} <small className="doc-unit">{item.unit}</small>
                </td>

                {activeStores.map((store) => {
                  const sAvail = item.storeStocks[store.id]?.available ?? 0;
                  const sCond = item.storeConditions[store.id] ?? "out";
                  return (
                    <td key={store.id} style={{ textAlign: "right" }}>
                      <span className={`store-qty-tag cond-${sCond}`}>{sAvail}</span>
                    </td>
                  );
                })}

                <td style={{ textAlign: "right", fontWeight: 700 }}>
                  <span className={item.totalAvailable === 0 ? "qty-out" : "qty-val"}>
                    {item.totalAvailable} <small className="doc-unit">{item.unit}</small>
                  </span>
                </td>

                <td style={{ textAlign: "center" }}>
                  <span className={`doc-status-badge ${isOut ? "status-out" : "status-low"}`}>
                    {isOut ? "HABIS" : "MENIPIS"}
                  </span>
                </td>

                <td
                  style={{
                    textAlign: "right",
                    fontWeight: 700,
                    color: item.deficit > 0 ? "#b91c1c" : "#0f172a",
                  }}
                >
                  {item.deficit > 0 ? `+${item.deficit} ${item.unit}` : "—"}
                </td>
              </tr>
            );
          })}

          {!filteredItems.length ? (
            <tr>
              <td colSpan={activeStores.length + 7} style={{ textAlign: "center", padding: "30px", color: "#64748b" }}>
                Tidak ada produk menipis atau habis yang sesuai dengan filter.
              </td>
            </tr>
          ) : null}
        </tbody>

        {filteredItems.length > 0 ? (
          <tfoot>
            <tr className="critical-doc-tfoot">
              <td colSpan={4} style={{ textAlign: "left", fontWeight: 700 }}>
                TOTAL: {filteredItems.length} ITEM KRITIS
              </td>
              <td>—</td>
              {activeStores.map((store) => {
                const colSum = filteredItems.reduce((acc, it) => acc + (it.storeStocks[store.id]?.available ?? 0), 0);
                return (
                  <td key={store.id} style={{ textAlign: "right", fontWeight: 700 }}>
                    {colSum}
                  </td>
                );
              })}
              <td style={{ textAlign: "right", fontWeight: 700 }}>
                {filteredItems.reduce((acc, it) => acc + it.totalAvailable, 0)}
              </td>
              <td style={{ textAlign: "center" }}>—</td>
              <td style={{ textAlign: "right", fontWeight: 800, color: "#b91c1c" }}>
                +{metrics.totalDeficit.toLocaleString("id-ID")}
              </td>
            </tr>
          </tfoot>
        ) : null}
      </table>

      {/* Sign-off / Signature section */}
      {showSignatures ? (
        <section className="critical-doc-signatures">
          <div className="signature-col">
            <span className="signature-title">Dibuat Oleh:</span>
            <div className="signature-space" />
            <strong className="signature-name">{profile?.full_name || "Petugas Inventaris"}</strong>
            <span className="signature-role">Staff / Gudang</span>
          </div>
          <div className="signature-col">
            <span className="signature-title">Diperiksa Oleh:</span>
            <div className="signature-space" />
            <strong className="signature-name">..................................................</strong>
            <span className="signature-role">Kepala Toko / Supervisor</span>
          </div>
          <div className="signature-col">
            <span className="signature-title">Disetujui Oleh:</span>
            <div className="signature-space" />
            <strong className="signature-name">..................................................</strong>
            <span className="signature-role">Pimpinan / Manager Cabang</span>
          </div>
        </section>
      ) : null}

      {/* Document Footer */}
      <footer className="critical-doc-footer">
        <div>
          Dicetak dari Sistem Manajemen Persediaan & Kasir <strong>{companyName}</strong> · Tanggal: {nowFormatted}
        </div>
        <div>Halaman Dokumen Stok Kritis</div>
      </footer>
    </article>
  );
}
