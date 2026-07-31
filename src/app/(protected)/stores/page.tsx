import { PageHeader } from "@/components/ui";
import { StoreManager } from "@/components/forms/store-manager";
import { getStores } from "@/lib/data";

export const metadata = { title: "Toko & Cabang" };

export default async function StoresPage() {
  const stores = await getStores(true);
  const active = stores.filter((store) => store.is_active !== false).length;
  return <>
    <PageHeader title="Toko & Cabang" description="Tambah dan beri nama cabang sebanyak kebutuhan bisnis. Setiap cabang memiliki stok, kasir, shift, dan laporan sendiri." />
    <div className="mini-stats"><div><span>Total cabang</span><strong>{stores.length}</strong></div><div><span>Cabang aktif</span><strong>{active}</strong></div><div><span>Cabang nonaktif</span><strong>{stores.length - active}</strong></div><div><span>Kapasitas sistem</span><strong>Dinamis</strong></div></div>
    <StoreManager stores={stores}/>
  </>;
}
