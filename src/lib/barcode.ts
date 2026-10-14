/**
 * Pure TypeScript Barcode Engine for Indotek Sukses POS
 * - Code 128 Auto (Sets B and C) encoder
 * - EAN-13 & Alphanumeric barcode generators
 * - Vector PDF builder (zero external dependencies)
 * - Canvas PNG renderer
 */

const CODE128_PATTERNS = [
  "212222", "222122", "222221", "121223", "121322", "131222", "122213", "122312", "132212", "221213", // 0-9
  "221312", "231212", "112232", "122132", "122231", "113222", "123122", "123221", "223211", "221132", // 10-19
  "221231", "213212", "223112", "312131", "311222", "321122", "321221", "312212", "322112", "322211", // 20-29
  "212123", "212321", "232121", "111323", "131123", "131321", "112313", "132113", "132311", "211313", // 30-39
  "231113", "231311", "112133", "112331", "132131", "113123", "113321", "133121", "313121", "211331", // 40-49
  "231131", "213113", "213311", "213131", "311123", "311321", "331121", "312113", "312311", "332111", // 50-59
  "314111", "221411", "431111", "111224", "111422", "121124", "121421", "141122", "141221", "112214", // 60-69
  "112412", "122114", "122411", "142112", "142211", "241211", "221114", "413111", "241112", "134111", // 70-79
  "111242", "121142", "121241", "114212", "124112", "124211", "411212", "421112", "421211", "212141", // 80-89
  "214121", "412121", "111143", "111341", "131141", "114113", "114311", "411113", "411311", "113141", // 90-99
  "114131", "311141", "411131", "211412", "211214", "211232", "2331112" // 100-106
];

export type BarcodeBinary = {
  width: number;
  binary: string;
  bars: Array<{ x: number; width: number }>;
};

/**
 * Encodes text into Code 128 binary string and bar rectangles.
 * Supports numbers, letters, spaces, and punctuation.
 */
export function encodeCode128(rawText: string): BarcodeBinary {
  const clean = (rawText || "").trim();
  if (!clean) {
    return { width: 0, binary: "", bars: [] };
  }

  const isAllDigits = /^\d+$/.test(clean);
  const useSetC = isAllDigits && clean.length >= 4 && clean.length % 2 === 0;

  const codes: number[] = [];
  let sum = 0;

  if (useSetC) {
    codes.push(105); // Start C
    sum = 105;
    for (let i = 0; i < clean.length; i += 2) {
      const val = parseInt(clean.slice(i, i + 2), 10);
      codes.push(val);
      sum += val * (codes.length - 1);
    }
  } else {
    codes.push(104); // Start B
    sum = 104;
    for (let i = 0; i < clean.length; i++) {
      const charCode = clean.charCodeAt(i);
      const val = charCode >= 32 && charCode <= 126 ? charCode - 32 : 0;
      codes.push(val);
      sum += val * (i + 1);
    }
  }

  const checksum = sum % 103;
  codes.push(checksum);
  codes.push(106); // Stop

  let binary = "";
  for (const code of codes) {
    const pattern = CODE128_PATTERNS[code] || CODE128_PATTERNS[0];
    let isBar = true;
    for (const char of pattern) {
      const width = parseInt(char, 10);
      binary += (isBar ? "1" : "0").repeat(width);
      isBar = !isBar;
    }
  }

  // 10-module quiet zones
  const quiet = "0".repeat(10);
  const fullBinary = quiet + binary + quiet;

  // Extract bar intervals for fast SVG and Canvas rendering
  const bars: Array<{ x: number; width: number }> = [];
  let i = 0;
  while (i < fullBinary.length) {
    if (fullBinary[i] === "1") {
      let run = 1;
      while (i + run < fullBinary.length && fullBinary[i + run] === "1") {
        run++;
      }
      bars.push({ x: i, width: run });
      i += run;
    } else {
      i++;
    }
  }

  return { width: fullBinary.length, binary: fullBinary, bars };
}

/**
 * Generates a valid unique 13-digit EAN-13 retail barcode
 * Starts with prefix '20' (standard internal store GS1 prefix)
 */
export function generateEan13Barcode(prefix = "20"): string {
  const timestamp = Date.now().toString().slice(-8);
  const rand = Math.floor(Math.random() * 90 + 10).toString();
  const raw12 = `${prefix}${timestamp}${rand}`;

  let odd = 0;
  let even = 0;
  for (let i = 0; i < 12; i++) {
    const d = parseInt(raw12[i], 10);
    if (i % 2 === 0) odd += d;
    else even += d;
  }
  const checksum = (10 - ((odd + even * 3) % 10)) % 10;
  return `${raw12}${checksum}`;
}

export type BarcodeLabelItem = {
  id: string;
  productName: string;
  variantName?: string | null;
  brand?: string | null;
  sku?: string | null;
  barcode: string;
  sellingPrice?: number | null;
  unit?: string | null;
  storeName?: string;
  copies?: number;
};

export type BarcodePrintOptions = {
  paper: "thermal_40x30" | "thermal_50x30" | "a4_sheet";
  showStoreName: boolean;
  storeName: string;
  showProductName: boolean;
  showPrice: boolean;
  showSku: boolean;
  showBarcodeText: boolean;
};

export const DEFAULT_PRINT_OPTIONS: BarcodePrintOptions = {
  paper: "thermal_40x30",
  showStoreName: true,
  storeName: "INDOTEK SUKSES JAYA",
  showProductName: true,
  showPrice: true,
  showSku: true,
  showBarcodeText: true,
};

function escapePdfText(str: string): string {
  return str.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

/**
 * Builds a vector PDF document for printing barcode labels.
 * Returns a Blob that can be downloaded as a .pdf file.
 */
export function generateBarcodePdfBlob(
  items: BarcodeLabelItem[],
  options: BarcodePrintOptions
): Blob {
  // Expand items based on copies
  const expanded: BarcodeLabelItem[] = [];
  for (const item of items) {
    const qty = Math.max(1, item.copies || 1);
    for (let i = 0; i < qty; i++) {
      expanded.push(item);
    }
  }

  if (expanded.length === 0) {
    expanded.push({
      id: "empty",
      productName: "Contoh Produk",
      barcode: "2026101400010",
      sellingPrice: 10000,
    });
  }

  const mmToPt = 2.83465;

  let pageWidthPt: number;
  let pageHeightPt: number;
  let labelWidthPt: number;
  let labelHeightPt: number;
  let cols: number;
  let rows: number;
  let marginLeftPt: number;
  let marginTopPt: number;
  let gapXPt: number;
  let gapYPt: number;

  if (options.paper === "thermal_40x30") {
    pageWidthPt = 40 * mmToPt;
    pageHeightPt = 30 * mmToPt;
    labelWidthPt = 38 * mmToPt;
    labelHeightPt = 28 * mmToPt;
    cols = 1;
    rows = 1;
    marginLeftPt = 1 * mmToPt;
    marginTopPt = 1 * mmToPt;
    gapXPt = 0;
    gapYPt = 0;
  } else if (options.paper === "thermal_50x30") {
    pageWidthPt = 50 * mmToPt;
    pageHeightPt = 30 * mmToPt;
    labelWidthPt = 48 * mmToPt;
    labelHeightPt = 28 * mmToPt;
    cols = 1;
    rows = 1;
    marginLeftPt = 1 * mmToPt;
    marginTopPt = 1 * mmToPt;
    gapXPt = 0;
    gapYPt = 0;
  } else {
    // A4 sheet: 210 x 297 mm, 3 cols x 10 rows (30 labels/page)
    pageWidthPt = 210 * mmToPt;
    pageHeightPt = 297 * mmToPt;
    cols = 3;
    rows = 10;
    labelWidthPt = 64 * mmToPt;
    labelHeightPt = 27 * mmToPt;
    marginLeftPt = 6 * mmToPt;
    marginTopPt = 12 * mmToPt;
    gapXPt = 3 * mmToPt;
    gapYPt = 0.5 * mmToPt;
  }

  const labelsPerPage = cols * rows;
  const pageCount = Math.max(1, Math.ceil(expanded.length / labelsPerPage));

  const objects: string[] = ["", ""]; // placeholder for obj 1 (catalog) & 2 (pages)

  // Object 3: Font Helvetica Regular
  objects.push(`<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>`);
  const fontRegId = 3;

  // Object 4: Font Helvetica-Bold
  objects.push(`<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>`);
  const fontBoldId = 4;

  let currentObjId = 5;
  const pageObjIds: number[] = [];

  for (let p = 0; p < pageCount; p++) {
    const pageItems = expanded.slice(p * labelsPerPage, (p + 1) * labelsPerPage);
    let stream = "q\n";

    pageItems.forEach((item, idx) => {
      const col = idx % cols;
      const row = Math.floor(idx / cols);

      const left = marginLeftPt + col * (labelWidthPt + gapXPt);
      const top = pageHeightPt - (marginTopPt + row * (labelHeightPt + gapYPt));
      const bottom = top - labelHeightPt;

      if (options.paper === "a4_sheet") {
        stream += `0.85 0.85 0.85 RG 0.4 w [2 2] 0 d\n`;
        stream += `${left.toFixed(2)} ${bottom.toFixed(2)} ${labelWidthPt.toFixed(2)} ${labelHeightPt.toFixed(2)} re S\n`;
        stream += `[] 0 d 0 0 0 RG 0 0 0 rg\n`;
      }

      const padX = 1.5 * mmToPt;
      const contentWidth = labelWidthPt - padX * 2;
      const contentLeft = left + padX;

      let currentY = top - 2.8 * mmToPt;

      // 1. Store Name / Header
      if (options.showStoreName && options.storeName.trim()) {
        stream += `BT /F2 6.5 Tf 0.35 0.35 0.35 rg\n`;
        stream += `${contentLeft.toFixed(2)} ${currentY.toFixed(2)} Td (${escapePdfText(options.storeName.trim().slice(0, 32))}) Tj ET\n`;
        currentY -= 2.6 * mmToPt;
      }

      // 2. Product Name (+ Variant)
      if (options.showProductName) {
        stream += `BT /F2 7.5 Tf 0 0 0 rg\n`;
        const titleStr = `${item.productName}${item.variantName ? ` - ${item.variantName}` : ""}`.slice(0, 34);
        stream += `${contentLeft.toFixed(2)} ${currentY.toFixed(2)} Td (${escapePdfText(titleStr)}) Tj ET\n`;
        currentY -= 2.6 * mmToPt;
      }

      // 3. Barcode Vector Bars
      const barcodeData = encodeCode128(item.barcode);
      const barcodeHeightPt = 8.5 * mmToPt;
      const barcodeY = currentY - barcodeHeightPt;

      if (barcodeData.width > 0) {
        const moduleWidth = contentWidth / barcodeData.width;
        stream += `0 0 0 rg\n`;
        for (const bar of barcodeData.bars) {
          const barX = contentLeft + bar.x * moduleWidth;
          const barW = bar.width * moduleWidth;
          stream += `${barX.toFixed(2)} ${barcodeY.toFixed(2)} ${barW.toFixed(2)} ${barcodeHeightPt.toFixed(2)} re f\n`;
        }
      }

      currentY = barcodeY - 2.4 * mmToPt;

      // 4. Barcode Code Text & SKU
      if (options.showBarcodeText) {
        stream += `BT /F1 6.5 Tf 0 0 0 rg\n`;
        stream += `${contentLeft.toFixed(2)} ${currentY.toFixed(2)} Td (${escapePdfText(item.barcode)}) Tj ET\n`;
      }

      // 5. Price (Right aligned)
      if (options.showPrice && item.sellingPrice !== undefined && item.sellingPrice !== null) {
        stream += `BT /F2 7.5 Tf 0 0 0 rg\n`;
        const formattedPrice = `Rp ${Number(item.sellingPrice).toLocaleString("id-ID")}`;
        const estimatedWidth = formattedPrice.length * 4.2;
        const priceLeft = left + labelWidthPt - padX - estimatedWidth;
        stream += `${Math.max(contentLeft + 35, priceLeft).toFixed(2)} ${currentY.toFixed(2)} Td (${escapePdfText(formattedPrice)}) Tj ET\n`;
      }
    });

    stream += "Q\n";

    const streamObjId = currentObjId++;
    const streamBytes = new TextEncoder().encode(stream);
    objects.push(`<< /Length ${streamBytes.length} >>\nstream\n${stream}\nendstream`);

    const pageObjId = currentObjId++;
    pageObjIds.push(pageObjId);
    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidthPt.toFixed(2)} ${pageHeightPt.toFixed(2)}] ` +
      `/Resources << /Font << /F1 ${fontRegId} 0 R /F2 ${fontBoldId} 0 R >> >> ` +
      `/Contents ${streamObjId} 0 R >>`
    );
  }

  objects[0] = `<< /Type /Catalog /Pages 2 0 R >>`;
  objects[1] = `<< /Type /Pages /Kids [${pageObjIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageCount} >>`;

  let pdfString = "%PDF-1.4\n%\xE2\xE3\xCF\xD3\n";
  const offsets: number[] = [];

  for (let i = 0; i < objects.length; i++) {
    offsets.push(new TextEncoder().encode(pdfString).length);
    pdfString += `${i + 1} 0 obj\n${objects[i]}\nendobj\n`;
  }

  const xrefOffset = new TextEncoder().encode(pdfString).length;
  pdfString += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets) {
    pdfString += `${offset.toString().padStart(10, "0")} 00000 n \n`;
  }
  pdfString += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

  const uint8 = new TextEncoder().encode(pdfString);
  return new Blob([uint8], { type: "application/pdf" });
}

/**
 * Downloads a Blob directly with given filename
 */
export function downloadFileBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 300);
}

/**
 * Renders a single high-resolution label onto a canvas (e.g. for PNG export)
 */
export function renderLabelToCanvas(
  item: BarcodeLabelItem,
  options: BarcodePrintOptions,
  scale = 3
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  // 40mm x 30mm at 96 DPI * scale
  // 1mm ~ 3.7795 px
  const mmPx = 3.7795 * scale;
  const is50 = options.paper === "thermal_50x30";
  const widthMm = is50 ? 50 : 40;
  const heightMm = 30;

  canvas.width = Math.round(widthMm * mmPx);
  canvas.height = Math.round(heightMm * mmPx);

  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  // Crisp white background
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const padX = 2 * mmPx;
  const padTop = 2.5 * mmPx;
  const contentWidth = canvas.width - padX * 2;

  let y = padTop;

  // 1. Store Header
  if (options.showStoreName && options.storeName.trim()) {
    ctx.font = `600 ${Math.round(2.6 * mmPx)}px system-ui, -apple-system, sans-serif`;
    ctx.fillStyle = "#4b5563";
    ctx.fillText(options.storeName.trim().slice(0, 35), padX, y);
    y += 3.2 * mmPx;
  }

  // 2. Product Name
  if (options.showProductName) {
    ctx.font = `bold ${Math.round(3.0 * mmPx)}px system-ui, -apple-system, sans-serif`;
    ctx.fillStyle = "#111827";
    const nameStr = `${item.productName}${item.variantName ? ` - ${item.variantName}` : ""}`.slice(0, 36);
    ctx.fillText(nameStr, padX, y);
    y += 3.4 * mmPx;
  }

  // 3. Barcode
  const barcodeData = encodeCode128(item.barcode);
  const barcodeHeight = 10 * mmPx;

  if (barcodeData.width > 0) {
    const moduleWidth = contentWidth / barcodeData.width;
    ctx.fillStyle = "#000000";
    for (const bar of barcodeData.bars) {
      const barX = padX + bar.x * moduleWidth;
      const barW = bar.width * moduleWidth;
      ctx.fillRect(barX, y, barW, barcodeHeight);
    }
  }

  y += barcodeHeight + 2.8 * mmPx;

  // 4. Barcode Text (Left) & Price (Right)
  if (options.showBarcodeText) {
    ctx.font = `600 ${Math.round(2.8 * mmPx)}px "Courier New", monospace`;
    ctx.fillStyle = "#111827";
    ctx.fillText(item.barcode, padX, y);
  }

  if (options.showPrice && item.sellingPrice !== undefined && item.sellingPrice !== null) {
    ctx.font = `bold ${Math.round(3.2 * mmPx)}px system-ui, -apple-system, sans-serif`;
    ctx.fillStyle = "#000000";
    const priceText = `Rp ${Number(item.sellingPrice).toLocaleString("id-ID")}`;
    const textMetrics = ctx.measureText(priceText);
    ctx.fillText(priceText, canvas.width - padX - textMetrics.width, y);
  }

  return canvas;
}

/**
 * Downloads PNG image of the barcode label
 */
export function downloadBarcodePng(
  item: BarcodeLabelItem,
  options: BarcodePrintOptions,
  filename?: string
) {
  const canvas = renderLabelToCanvas(item, options, 4); // 4x supersampling for razor-sharp 300+ DPI print
  canvas.toBlob((blob) => {
    if (blob) {
      const name = filename || `barcode-${item.productName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.png`;
      downloadFileBlob(blob, name);
    }
  }, "image/png");
}

/**
 * Generates standalone printable HTML document content
 */
export function generatePrintableHtml(
  items: BarcodeLabelItem[],
  options: BarcodePrintOptions
): string {
  const expanded: BarcodeLabelItem[] = [];
  for (const item of items) {
    const qty = Math.max(1, item.copies || 1);
    for (let i = 0; i < qty; i++) {
      expanded.push(item);
    }
  }

  const isThermal = options.paper === "thermal_40x30" || options.paper === "thermal_50x30";
  const labelWidth = options.paper === "thermal_50x30" ? "50mm" : options.paper === "thermal_40x30" ? "40mm" : "64mm";
  const labelHeight = options.paper === "a4_sheet" ? "27mm" : "30mm";

  const labelsHtml = expanded.map((item) => {
    const barcodeData = encodeCode128(item.barcode);
    const rects = barcodeData.bars.map((bar) => `<rect x="${bar.x}" y="0" width="${bar.width}" height="40" fill="#000" />`).join("");

    return `
      <div class="barcode-sticker">
        ${options.showStoreName && options.storeName ? `<div class="store-name">${options.storeName}</div>` : ""}
        ${options.showProductName ? `<div class="product-title">${item.productName}${item.variantName ? ` - ${item.variantName}` : ""}</div>` : ""}
        <div class="barcode-graphic">
          <svg viewBox="0 0 ${barcodeData.width || 100} 40" preserveAspectRatio="none" class="barcode-svg">
            ${rects}
          </svg>
        </div>
        <div class="sticker-footer">
          ${options.showBarcodeText ? `<span class="barcode-code">${item.barcode}</span>` : ""}
          ${options.showPrice && item.sellingPrice ? `<span class="product-price">Rp ${Number(item.sellingPrice).toLocaleString("id-ID")}</span>` : ""}
        </div>
      </div>
    `;
  }).join("");

  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8">
  <title>Cetak Barcode - ${options.storeName}</title>
  <style>
    @page {
      size: ${isThermal ? (options.paper === "thermal_50x30" ? "50mm 30mm" : "40mm 30mm") : "A4 portrait"};
      margin: ${isThermal ? "0" : "10mm 6mm"};
    }
    * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background: #fff;
      color: #000;
    }
    .sheet-container {
      ${isThermal ? `display: flex; flex-direction: column; align-items: center;` : `display: grid; grid-template-columns: repeat(3, 1fr); gap: 2mm 3mm;`}
    }
    .barcode-sticker {
      width: ${labelWidth};
      height: ${labelHeight};
      padding: 1.5mm 2mm;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      overflow: hidden;
      page-break-inside: avoid;
      break-inside: avoid;
      ${isThermal ? `page-break-after: always; break-after: page;` : `border: 0.5px dashed #ccc; border-radius: 2px;`}
    }
    .store-name {
      font-size: 7pt;
      font-weight: 600;
      color: #555;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      line-height: 1.1;
    }
    .product-title {
      font-size: 8pt;
      font-weight: 700;
      color: #000;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      line-height: 1.2;
    }
    .barcode-graphic {
      width: 100%;
      height: 11mm;
      display: flex;
      align-items: center;
      margin: 0.5mm 0;
    }
    .barcode-svg {
      width: 100%;
      height: 100%;
      display: block;
    }
    .sticker-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 7.5pt;
      line-height: 1.1;
    }
    .barcode-code {
      font-family: "Courier New", monospace;
      font-weight: 600;
      letter-spacing: 0.5px;
    }
    .product-price {
      font-weight: 800;
      font-size: 8.5pt;
    }
  </style>
</head>
<body>
  <div class="sheet-container">
    ${labelsHtml}
  </div>
  <script>
    window.onload = function() {
      setTimeout(function() { window.print(); }, 250);
    };
  </script>
</body>
</html>`;
}
