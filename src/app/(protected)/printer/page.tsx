import { PageHeader } from "@/components/ui";
import { ThermalPrinterSettings } from "@/components/thermal-printer-settings";
import { getSystemSettings } from "@/lib/data";

export const metadata = {
  title: "Printer Thermal & Struk",
  description: "Pengaturan printer kasir thermal Bluetooth dan USB, ukuran kertas 58mm dan 80mm.",
};

export default async function PrinterPage() {
  const settings = await getSystemSettings();

  return (
    <div className="printer-settings-page">
      <PageHeader
        title="Printer Thermal & Struk"
        description="Pilih ukuran kertas struk (58mm / 80mm), hubungkan printer via Bluetooth atau USB/Serial, dan lakukan tes cetak."
      />
      <div className="printer-page-container">
        <ThermalPrinterSettings settings={settings} />
      </div>
    </div>
  );
}
