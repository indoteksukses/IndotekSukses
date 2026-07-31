import { PageHeader, StatusBadge } from "@/components/ui";
import { ShiftManager } from "@/components/forms/shift-manager";
import { getCurrentProfile, getShifts, getStores } from "@/lib/data";
import { formatCurrency, formatDateTime } from "@/lib/format";

export const metadata = { title: "Shift Kasir" };
export default async function ShiftsPage({ searchParams }: { searchParams: Promise<{ store?: string }> }) {
  const params = await searchParams;
  const [allShifts, stores, profile] = await Promise.all([getShifts(), getStores(), getCurrentProfile()]);
  const shifts = params.store ? allShifts.filter((shift: any) => shift.store_id === params.store) : allShifts;
  return <><PageHeader title="Shift Kasir Toko" description="Satu shift aktif per toko, dapat digunakan bersama oleh beberapa karyawan yang memiliki akses ke cabang tersebut." actions={<ShiftManager stores={stores} shifts={allShifts} defaultStoreId={params.store ?? profile.primary_store_id ?? undefined} profileId={profile.id} role={profile.role}/>}/>
    <div className="mini-stats"><div><span>Toko dengan shift aktif</span><strong>{shifts.filter((shift: any) => shift.status === "open").length}</strong></div><div><span>Riwayat ditutup</span><strong>{shifts.filter((shift: any) => shift.status === "closed").length}</strong></div><div><span>Total selisih</span><strong>{formatCurrency(shifts.reduce((sum: number, shift: any) => sum + Number(shift.cash_difference ?? 0), 0))}</strong></div><div><span>Jumlah cabang</span><strong>{stores.length}</strong></div></div>
    <div className="panel table-panel mobile-card-table"><table><thead><tr><th>Pembuka shift</th><th>Toko</th><th>Dibuka</th><th>Kas awal</th><th>Kas seharusnya</th><th>Kas fisik</th><th>Selisih</th><th>Status</th></tr></thead><tbody>{shifts.map((shift: any) => <tr key={shift.id}><td data-label="Pembuka"><strong>{shift.cashier_name}</strong></td><td data-label="Toko">{shift.store_name}</td><td data-label="Dibuka">{formatDateTime(shift.opened_at)}</td><td data-label="Kas awal">{formatCurrency(Number(shift.opening_cash))}</td><td data-label="Seharusnya">{shift.expected_cash == null ? "—" : formatCurrency(Number(shift.expected_cash))}</td><td data-label="Kas fisik">{shift.actual_cash == null ? "—" : formatCurrency(Number(shift.actual_cash))}</td><td data-label="Selisih" className={Number(shift.cash_difference) < 0 ? "negative" : Number(shift.cash_difference) > 0 ? "positive" : ""}>{shift.cash_difference == null ? "—" : formatCurrency(Number(shift.cash_difference))}</td><td data-label="Status"><StatusBadge tone={shift.status === "open" ? "info" : "success"}>{shift.status === "open" ? "Aktif bersama" : "Ditutup"}</StatusBadge></td></tr>)}</tbody></table></div>
  </>;
}
