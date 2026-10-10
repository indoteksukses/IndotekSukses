import { Building2 } from "lucide-react";
import { PageHeader, StatusBadge } from "@/components/ui";
import { DeleteSupplierButton, SupplierManager } from "@/components/forms/supplier-manager";
import { getCurrentProfile, getSuppliers } from "@/lib/data";

export const metadata={title:"Supplier"};
export default async function SuppliersPage(){
  const [suppliers,profile]=await Promise.all([getSuppliers(),getCurrentProfile()]);
  const canManage=profile.role==="owner"||profile.role==="admin";
  return <><PageHeader title="Supplier" description="Kelola pemasok, kontak, rekening, dan riwayat pembelian." actions={canManage?<SupplierManager/>:undefined}/><div className="mini-stats"><div><span>Total supplier</span><strong>{suppliers.length}</strong></div><div><span>Supplier aktif</span><strong>{suppliers.filter((s:any)=>s.is_active!==false).length}</strong></div><div><span>Memiliki telepon</span><strong>{suppliers.filter((s:any)=>s.phone).length}</strong></div><div><span>Memiliki email</span><strong>{suppliers.filter((s:any)=>s.email).length}</strong></div></div><div className="panel table-panel mobile-card-table"><table><thead><tr><th>Supplier</th><th>Kontak</th><th>Telepon</th><th>Email</th><th>Status</th>{canManage?<th>Aksi</th>:null}</tr></thead><tbody>{suppliers.map((supplier:any)=><tr key={supplier.id}><td data-label="Supplier"><div className="product-cell"><div className="product-thumb"><Building2 size={20}/></div><div><strong>{supplier.name}</strong><span>{supplier.address||"Alamat belum diisi"}</span></div></div></td><td data-label="Kontak">{supplier.contact_name||"—"}</td><td data-label="Telepon">{supplier.phone||"—"}</td><td data-label="Email">{supplier.email||"—"}</td><td data-label="Status"><StatusBadge tone={supplier.is_active!==false?"success":"neutral"}>{supplier.is_active!==false?"Aktif":"Diarsipkan"}</StatusBadge></td>{canManage?<td data-label="Aksi"><div className="table-actions-inline"><SupplierManager supplier={supplier}/><DeleteSupplierButton supplier={supplier}/></div></td>:null}</tr>)}</tbody></table></div></>;
}
