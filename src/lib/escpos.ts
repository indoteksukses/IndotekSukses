import type { SaleDetail, SystemSettings } from "./types";
import { formatCurrency, formatDateTime } from "./format";

/**
 * ESC/POS commands generator for thermal receipt printers (58mm & 80mm)
 * Supports standard POS printers (Epson, Xprinter, Panda, Goojprt, Iware, Sunmi, etc.)
 */

// Basic ESC/POS command constants
const ESC = 0x1b;
const GS = 0x1d;
const LF = 0x0a;

export class EscPosBuilder {
  private buffer: number[] = [];

  constructor() {
    this.init();
  }

  // Initialize printer
  init(): this {
    this.buffer.push(ESC, 0x40); // ESC @
    return this;
  }

  // Text alignment: 0=left, 1=center, 2=right
  align(alignment: "left" | "center" | "right"): this {
    const val = alignment === "center" ? 0x01 : alignment === "right" ? 0x02 : 0x00;
    this.buffer.push(ESC, 0x61, val);
    return this;
  }

  // Bold text
  bold(enabled = true): this {
    this.buffer.push(ESC, 0x45, enabled ? 0x01 : 0x00);
    return this;
  }

  // Underline
  underline(enabled = true): this {
    this.buffer.push(ESC, 0x2d, enabled ? 0x01 : 0x00);
    return this;
  }

  // Font size: normal, double-height, double-width, double-both
  size(mode: "normal" | "double-h" | "double-w" | "double"): this {
    let val = 0x00;
    if (mode === "double-h") val = 0x01;
    else if (mode === "double-w") val = 0x10;
    else if (mode === "double") val = 0x11;
    this.buffer.push(GS, 0x21, val);
    return this;
  }

  // Line feed
  feed(lines = 1): this {
    for (let i = 0; i < lines; i++) {
      this.buffer.push(LF);
    }
    return this;
  }

  // Cut paper (partial or full)
  cut(partial = false): this {
    this.feed(3);
    this.buffer.push(GS, 0x56, partial ? 0x01 : 0x00);
    return this;
  }

  // Add raw string (ASCII encoded)
  text(str: string): this {
    // Replace Indonesian special characters or accents if needed
    for (let i = 0; i < str.length; i++) {
      const code = str.charCodeAt(i);
      if (code < 128) {
        this.buffer.push(code);
      } else {
        // Fallback for non-ASCII
        this.buffer.push(0x3f); // '?'
      }
    }
    return this;
  }

  // Print text followed by line feed
  textLine(str = ""): this {
    if (str) this.text(str);
    this.buffer.push(LF);
    return this;
  }

  // Print dashed separator line
  separator(char = "-", width = 32): this {
    this.textLine(char.repeat(width));
    return this;
  }

  // Print two columns (Left aligned text, Right aligned text)
  twoColumn(left: string, right: string, width = 32): this {
    const spaceAvailable = width - right.length;
    if (spaceAvailable <= 0) {
      this.textLine(`${left} ${right}`);
      return this;
    }
    if (left.length <= spaceAvailable) {
      const padding = " ".repeat(spaceAvailable - left.length);
      this.textLine(left + padding + right);
    } else {
      // Left text is longer than space available, wrap it
      const firstLine = left.slice(0, spaceAvailable - 1);
      const remainder = left.slice(spaceAvailable - 1);
      this.textLine(firstLine + " " + right);
      this.textLine(remainder);
    }
    return this;
  }

  // Get binary buffer as Uint8Array
  getBytes(): Uint8Array {
    return new Uint8Array(this.buffer);
  }
}

const paymentMethodLabels: Record<string, string> = {
  cash: "Tunai",
  qris: "QRIS",
  bank_transfer: "Transfer Bank",
  debit_card: "Kartu Debit",
  credit_card: "Kartu Kredit",
  mixed: "Campuran",
  customer_credit: "Piutang",
};

/**
 * Generate full ESC/POS bytes for a Sale Invoice
 * @param sale SaleDetail object
 * @param settings SystemSettings object
 * @param paperWidth 58 for 58mm (~32 chars) or 80 for 80mm (~48 chars)
 */
export function generateSaleReceiptEscPos(
  sale: SaleDetail,
  settings?: SystemSettings | null,
  paperWidth: 58 | 80 = 58
): Uint8Array {
  const charsPerLine = paperWidth === 80 ? 48 : 32;
  const builder = new EscPosBuilder();

  // Header Toko
  builder.align("center");
  builder.bold(true);
  builder.size(paperWidth === 80 ? "double" : "double-h");
  builder.textLine(sale.store_name || settings?.company_name || "INDOTEK SUKSES");

  builder.bold(false);
  builder.size("normal");
  if (sale.store_address || settings?.address) {
    builder.textLine(sale.store_address || settings?.address || "");
  }
  if (sale.store_phone || settings?.phone) {
    builder.textLine(`Telp: ${sale.store_phone || settings?.phone}`);
  }

  // Garis pembatas header
  builder.separator("=", charsPerLine);

  // Info Transaksi
  builder.align("left");
  builder.twoColumn("No. Invoice:", sale.invoice_number, charsPerLine);
  builder.twoColumn("Tanggal    :", formatDateTime(sale.completed_at), charsPerLine);
  builder.twoColumn("Kasir      :", sale.cashier_name || "-", charsPerLine);
  builder.twoColumn("Pelanggan  :", sale.customer_name || "Pelanggan umum", charsPerLine);

  builder.separator("-", charsPerLine);

  // Daftar Item
  builder.align("left");
  for (const item of sale.items) {
    // Baris 1: Nama Produk & Varian
    const fullName = item.variant_name ? `${item.name} (${item.variant_name})` : item.name;
    builder.bold(true);
    builder.textLine(fullName);
    builder.bold(false);

    // Baris 2: Qty x Harga Satuan .............. Subtotal
    const qtyPrice = `  ${item.quantity} x ${formatCurrency(item.unit_price)}`;
    const subtotalFormatted = formatCurrency(item.subtotal);
    builder.twoColumn(qtyPrice, subtotalFormatted, charsPerLine);
  }

  builder.separator("-", charsPerLine);

  // Ringkasan Pembayaran
  builder.align("left");
  builder.twoColumn("Subtotal", formatCurrency(sale.subtotal), charsPerLine);

  if (sale.discount > 0) {
    builder.twoColumn("Diskon", `-${formatCurrency(sale.discount)}`, charsPerLine);
  }

  if (sale.tax > 0) {
    builder.twoColumn("Pajak", formatCurrency(sale.tax), charsPerLine);
  }

  // Grand Total (Bold & Highlight)
  builder.bold(true);
  builder.size(paperWidth === 80 ? "double-h" : "normal");
  builder.twoColumn("TOTAL", formatCurrency(sale.grand_total), charsPerLine);
  builder.size("normal");
  builder.bold(false);

  builder.separator("-", charsPerLine);

  // Detail Metode Pembayaran
  if (sale.payments && sale.payments.length > 0) {
    for (const pay of sale.payments) {
      const methodName = paymentMethodLabels[pay.method] || pay.method;
      const ref = pay.reference_number ? ` (${pay.reference_number})` : "";
      builder.twoColumn(`Bayar (${methodName}${ref})`, formatCurrency(pay.amount), charsPerLine);
    }
  }

  // Catatan kembalian jika tunai
  if (sale.notes) {
    builder.textLine(sale.notes);
  }

  builder.separator("=", charsPerLine);

  // Footer Struk
  builder.align("center");
  const footerNote = settings?.receipt_footer || "Terima kasih telah berbelanja.";
  builder.textLine(footerNote);
  builder.textLine("Barang yang sudah dibeli tidak");
  builder.textLine("dapat ditukar/dikembalikan.");
  builder.feed(1);
  builder.textLine("--- Indotek Sukses POS ---");

  // Potong kertas
  builder.cut(true);

  return builder.getBytes();
}

/**
 * Generate test receipt ESC/POS bytes
 */
export function generateTestReceiptEscPos(
  settings?: SystemSettings | null,
  paperWidth: 58 | 80 = 58
): Uint8Array {
  const charsPerLine = paperWidth === 80 ? 48 : 32;
  const builder = new EscPosBuilder();

  builder.align("center");
  builder.bold(true);
  builder.size("double-h");
  builder.textLine(settings?.company_name || "INDOTEK SUKSES");
  builder.size("normal");
  builder.bold(false);
  builder.textLine("TES KONEKSI PRINTER THERMAL");
  builder.separator("=", charsPerLine);

  builder.align("left");
  builder.twoColumn("Lebar Kertas", `${paperWidth} mm`, charsPerLine);
  builder.twoColumn("Waktu Tes", new Date().toLocaleTimeString("id-ID"), charsPerLine);
  builder.twoColumn("Status", "BERHASIL TERHUBUNG OK!", charsPerLine);
  builder.separator("-", charsPerLine);

  builder.align("center");
  builder.textLine("Printer thermal siap digunakan");
  builder.textLine("untuk cetak invoice transaksi.");
  builder.feed(1);
  builder.textLine("================================");
  builder.cut(true);

  return builder.getBytes();
}
