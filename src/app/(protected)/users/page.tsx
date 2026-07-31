import { PageHeader, StatusBadge } from "@/components/ui";
import { EditUserButton, UserManager } from "@/components/forms/user-manager";
import { getCurrentProfile, getStores, getUsers } from "@/lib/data";
import { UserAvatar } from "@/components/user-avatar";

export const metadata = { title: "Karyawan & Akses" };
const labels: Record<string,string> = { owner: "Owner", admin: "Admin", manager: "Kepala Toko", cashier: "Kasir", warehouse: "Gudang" };

export default async function UsersPage() {
  const [users, stores, current] = await Promise.all([getUsers(), getStores(), getCurrentProfile()]);
  return <><PageHeader title="Karyawan & Hak Akses" description="Setiap karyawan menggunakan akun sendiri dan hanya dapat mengakses cabang yang diberikan." actions={<UserManager stores={stores} users={users} canCreateAdmin={current.role === "owner"}/>}/>
    <div className="mini-stats"><div><span>Total pengguna</span><strong>{users.length}</strong></div><div><span>Admin</span><strong>{users.filter((user) => ["owner","admin"].includes(user.role)).length}</strong></div><div><span>Kasir</span><strong>{users.filter((user) => user.role === "cashier").length}</strong></div><div><span>Akun aktif</span><strong>{users.filter((user) => user.is_active).length}</strong></div></div>
    <div className="panel table-panel mobile-card-table"><table><thead><tr><th>Karyawan</th><th>Role</th><th>Toko utama</th><th>Akses cabang</th><th>Status</th><th/></tr></thead><tbody>{users.map((user) => { const primary = stores.find((store) => store.id === user.primary_store_id); return <tr key={user.id}><td data-label="Karyawan"><div className="product-cell"><UserAvatar name={user.full_name} avatarKey={user.avatar_key} size="sm"/><div><strong>{user.full_name}</strong><span>{user.email || user.phone || "—"}</span></div></div></td><td data-label="Role">{labels[user.role]}</td><td data-label="Toko utama">{primary?.name || "Semua / belum dipilih"}</td><td data-label="Akses cabang">{user.role === "owner" || user.role === "admin" ? "Semua cabang" : `${user.store_ids?.length ?? 0} cabang`}</td><td data-label="Status"><StatusBadge tone={user.is_active ? "success" : "neutral"}>{user.is_active ? "Aktif" : "Nonaktif"}</StatusBadge></td><td data-label="Aksi"><EditUserButton stores={stores} user={user} canAssignAdmin={current.role === "owner"}/></td></tr>; })}</tbody></table></div>
  </>;
}
