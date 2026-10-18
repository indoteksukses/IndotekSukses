import { notFound } from "next/navigation";
import { getSaleDetail, getSystemSettings } from "@/lib/data";
import { ReceiptClientView } from "@/components/receipt-client-view";
import type { ReceiptFormat } from "@/components/receipt-actions";

export default async function ReceiptPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ print?: string; format?: string }>;
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const [sale, settings] = await Promise.all([getSaleDetail(id), getSystemSettings()]);

  if (!sale) notFound();

  const validFormats: ReceiptFormat[] = ["thermal58", "thermal80", "standard"];
  const initialFormat = validFormats.includes(query.format as ReceiptFormat)
    ? (query.format as ReceiptFormat)
    : undefined;

  return (
    <ReceiptClientView
      sale={sale}
      settings={settings}
      initialFormat={initialFormat}
      autoPrint={query.print === "1"}
    />
  );
}
