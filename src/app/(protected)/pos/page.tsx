import { PosTerminal } from "@/components/pos-terminal";
import { getStoreCatalog } from "@/lib/data";
export const metadata={title:"Kasir"};
export default async function PosPage(){const products=await getStoreCatalog();return <div className="pos-page"><div className="pos-title"><div><h1>Kasir — Toko 1</h1><p>Shift Rina · Dibuka 08.00 WIB · Kas awal Rp500.000</p></div><button className="button secondary">Tahan transaksi</button></div><PosTerminal products={products}/></div>}
