import { PosTerminal } from "@/components/pos-terminal";
import { getCurrentProfile, getShifts, getStoreCatalog, getStores } from "@/lib/data";

export const metadata = { title: "Kasir" };

export default async function PosPage({ searchParams }: { searchParams: Promise<{ store?: string }> }) {
  const params = await searchParams;
  const [stores, profile] = await Promise.all([getStores(), getCurrentProfile()]);
  const selectedStore = stores.find((store) => store.id === params.store) ?? stores.find((store) => store.id === profile.primary_store_id) ?? stores[0];
  if (!selectedStore) return <div className="panel empty-state"><strong>Belum ada toko aktif</strong><p>Tambahkan toko melalui menu Toko & Cabang sebelum menggunakan kasir.</p><a className="button primary" href="/stores">Tambah toko</a></div>;
  const [products, shifts] = await Promise.all([getStoreCatalog(selectedStore.id), getShifts(selectedStore.id)]);
  const openShift = shifts.find((shift: any) => shift.status === "open");
  if (!openShift) return <div className="pos-page"><div className="pos-title"><div><h1>Kasir — {selectedStore.name}</h1><p>{selectedStore.code} · Shift belum dibuka</p></div><div className="pos-store-links">{stores.map((store) => <a className={store.id === selectedStore.id ? "active" : ""} href={`/pos?store=${store.id}`} key={store.id}>{store.code}</a>)}</div></div><div className="panel empty-state"><strong>Buka shift sebelum transaksi</strong><p>Satu karyawan cukup membuka shift untuk toko ini. Setelah aktif, semua kasir yang memiliki akses ke toko dapat melakukan transaksi pada shift yang sama.</p><a className="button primary" href={`/shifts?store=${selectedStore.id}`}>Buka shift kasir</a></div></div>;
  return <div className="pos-page"><div className="pos-title"><div><h1>Kasir — {selectedStore.name}</h1><p>{selectedStore.code} · Shift aktif sejak {new Intl.DateTimeFormat("id-ID", { timeStyle: "short", timeZone: "Asia/Jakarta" }).format(new Date(openShift.opened_at))}</p></div><div className="pos-store-links">{stores.map((store) => <a className={store.id === selectedStore.id ? "active" : ""} href={`/pos?store=${store.id}`} key={store.id}>{store.code}</a>)}</div></div><PosTerminal products={products} store={selectedStore} shiftId={openShift.id}/></div>;
}
