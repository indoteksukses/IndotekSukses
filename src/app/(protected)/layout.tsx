import { AppShell } from "@/components/app-shell";
import { getAppContext } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const context = await getAppContext();
  return <AppShell {...context}>{children}</AppShell>;
}
