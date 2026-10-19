import type { AIMatchItem, Product, ProductVariant } from "@/lib/types";

/**
 * Hardware & Toko Bangunan / Teknik / Listrik Domain Thesaurus
 * Kamus sinonim, bahasa tukang, istilah umum, dan sebutan pasar di Indonesia.
 */
export const HARDWARE_THESAURUS: Record<string, string[]> = {
  // 1. Kebocoran & Atap
  nambal: ["tambal", "pelapis", "anti bocor", "aquaproof", "no drop", "nodrop", "sealant", "aspal", "flashing", "lakban", "waterproof", "kassa", "serat", "seng"],
  tambal: ["nambal", "pelapis", "anti bocor", "aquaproof", "no drop", "sealant", "aspal", "lakban", "waterproof"],
  bocor: ["anti bocor", "aquaproof", "no drop", "nodrop", "sealant", "silikon", "waterproof", "lem seng", "flintkote", "serat fiber", "lakban aluminium", "sealtape"],
  rembes: ["anti bocor", "waterproofing", "aquaproof", "no drop", "sealant", "semen putih", "damdex", "sika"],
  atap: ["seng", "asbes", "genteng", "spandek", "galvalum", "roofing", "talang", "karpet talang", "baut roofing"],
  seng: ["atap", "galvalum", "spandek", "plat", "baut roofing", "paku seng", "karpet talang"],
  talang: ["karpet talang", "talang pvc", "corong talang", "lem talang", "gantungan talang"],

  // 2. Pompa & Penampungan Air
  sanyo: ["pompa", "pompa air", "shimizu", "panasonic", "otomatis pompa", "jet pump", "semi jet"],
  pompa: ["sanyo", "shimizu", "panasonic", "pompa air", "otomatis", "tusen klep", "pelampung", "radar", "toren", "booster"],
  toren: ["tangki", "tandon", "pelampung", "radar", "otomatis toren", "valve", "watermur"],
  tandon: ["toren", "tangki air", "pelampung", "radar", "watermur"],
  otomatis: ["pressure switch", "radar", "pelampung toren", "saklar otomatis", "mcb"],

  // 3. Plumbing, Pipa & Fitting (Keni, Drat, Sambungan)
  paralon: ["pipa", "pvc", "wavin", "rucika", "fitting", "knee", "tee", "socket", "lem pvc"],
  pralon: ["pipa", "pvc", "wavin", "rucika", "fitting", "knee", "tee", "socket", "lem pvc"],
  pipa: ["paralon", "pralon", "pvc", "wavin", "rucika", "knee", "tee", "socket", "drat", "nepel", "vlok ring", "watermur"],
  drat: ["nepel", "vlok ring", "faucet", "socket drat", "knee drat", "kran", "sambungan drat"],
  nepel: ["drat", "double nepel", "sambungan", "vlok ring", "knee", "socket", "faucet"],
  knee: ["keni", "elbow", "sambungan L", "leter L", "belokan pipa", "fitting", "pvc"],
  keni: ["knee", "elbow", "sambungan L", "leter L", "belokan pipa", "fitting", "pvc"],
  tee: ["sambungan T", "leter T", "cabang 3 pipa", "fitting", "pvc"],
  vlok: ["vlok ring", "vlok sok", "reducer", "sambungan beda ukuran"],
  watermur: ["water mur", "union", "sambungan toren", "kopling pipa"],
  "seal tape": ["sealtape", "isolasi kran", "perlak", "onda", "isolasi pipa", "siltip"],
  sealtape: ["seal tape", "isolasi kran", "perlak", "onda", "isolasi pipa"],
  perlak: ["seal tape", "sealtape", "isolasi kran", "onda"],
  siltip: ["seal tape", "sealtape", "isolasi kran"],
  kran: ["keran", "faucet", "kran air", "kran angsa", "onda", "san-ei", "cuci piring", "wastafel", "shower", "ball valve", "stop kran", "fleksibel"],
  keran: ["kran", "faucet", "kran air", "kran angsa", "cuci piring", "onda", "stop kran", "fleksibel"],

  // 4. Alat Potong & Gerinda
  gerinda: ["grinder", "gurinda", "mesin gerinda", "batu gerinda", "batu potong", "mata gerinda", "batu wd", "flap disc"],
  gurinda: ["gerinda", "grinder", "mesin gerinda", "batu gerinda", "batu potong", "mata gerinda", "batu wd"],
  "batu wd": ["wd", "batu potong", "mata gerinda potong", "batu gerinda"],
  potong: ["gerinda", "gergaji", "tang potong", "cutter", "gunting", "mata potong", "diamond wheel"],
  gergaji: ["gergaji besi", "gergaji kayu", "hacksaw", "mata gergaji", "gergaji dahan"],
  cutter: ["pisau cutter", "refill cutter", "mata cutter", "alat potong"],

  // 5. Perkakas Tangan (Kunci, Obeng, Tang)
  "tang cucut": ["long nose pliers", "tang lancip", "tang cucut", "tekiro"],
  "tang buaya": ["locking pliers", "tang jepit", "tang buaya", "vise grip", "tekiro"],
  "tang potong": ["diagonal cutting pliers", "tang potong kabel", "potong kawat", "tekiro"],
  "tang kombinasi": ["combination pliers", "tang listrik", "tang", "tekiro"],
  tang: ["tang cucut", "tang buaya", "tang potong", "tang kombinasi", "tang rivet", "tang klem"],
  "kunci inggris": ["adjustable wrench", "kunci geser", "kunci inggris", "tekiro"],
  "kunci pas": ["spanner", "kunci ring", "kunci pas ring", "kunci kombinasi", "tekiro"],
  "kunci sok": ["socket wrench", "mata sok", "kunci shock", "ratchet", "handle sok"],
  "kunci l": ["hex key", "kunci allen", "kunci segi enam", "kunci l set"],
  obeng: ["screwdriver", "obeng kembang", "obeng plus", "obeng minus", "obeng ketok", "obeng bolak balik", "tespen"],
  tespen: ["test pen", "obeng tespen", "indikator listrik", "cek listrik"],
  wd: ["wd-40", "wd40", "anti karat", "penetran", "pelumas", "buka baut macet"],
  wd40: ["wd-40", "anti karat", "penetran", "pelumas", "buka baut macet"],
  karat: ["anti karat", "wd-40", "penetran", "sikat kawat", "cat anti karat", "primer zink"],
  palu: ["martil", "hammer", "palu konde", "palu kambing", "palu karet"],

  // 6. Baut, Sekrup, Paku & Fasteners
  baut: ["sekrup", "screw", "bolt", "mur", "nut", "dynabolt", "baut roofing", "baut kuning"],
  sekrup: ["screw", "baut", "tapping", "drywall", "gypsum", "fisher", "fischer"],
  roofing: ["baut roofing", "sekrup baja ringan", "self drilling screw", "baut seng", "karet roofing"],
  "baja ringan": ["roofing", "hollow", "reng", "canal c", "sekrup gypsum", "gunting baja ringan"],
  dynabolt: ["dinabolt", "anchor bolt", "baut beton", "fischer besi"],
  dinabolt: ["dynabolt", "anchor bolt", "baut beton", "fischer"],
  fisher: ["fischer", "angkur plastik", "sekrup dinding", "s6", "s8", "s10"],
  fischer: ["fisher", "angkur plastik", "sekrup dinding", "s6", "s8", "s10"],
  paku: ["paku kayu", "paku beton", "paku seng", "paku payung", "paku rivet", "paku triplek"],

  // 7. Kelistrikan (Colokan, Stop Kontak, Saklar, Kabel)
  colokan: ["steker", "stop kontak", "t-arde", "over steker", "broco", "uticon", "kabel roll", "saklar"],
  steker: ["colokan", "steker arde", "over steker", "steker gepeng", "broco", "uticon"],
  "stop kontak": ["colokan", "saklar", "broco", "panasonic", "uticon", "inbow", "outbow", "kabel roll"],
  saklar: ["switch", "engkel", "seri", "broco", "panasonic", "saklar gantung", "saklar engkel"],
  fitting: ["fitting lampu", "fitting gantung", "fitting plafon", "fitting kombinasi", "broco"],
  lampu: ["bohlam", "led", "philips", "hannochs", "downlight", "lampu sorot", "tube", "tl", "lampu tidur"],
  bohlam: ["lampu", "led", "philips", "hannochs", "bohlam kuning", "warm white"],
  kabel: ["kabel nym", "kabel nyy", "kabel nyaf", "kabel serabut", "kabel kawat", "eterna", "supreme", "extana"],
  solasi: ["isolasi", "isolasi listrik", "unibell", "nitto", "lakban hitam listrik"],
  isolasi: ["solasi", "isolasi listrik", "unibell", "nitto", "lakban"],

  // 8. Lem & Perekat
  alteco: ["lem cyano", "lem korea", "lem setan", "lem instant", "lem g", "dextone instant"],
  "lem setan": ["alteco", "lem korea", "lem g", "lem instant", "dextone"],
  "lem korea": ["alteco", "lem setan", "lem g", "lem instant", "dextone"],
  "lem g": ["alteco", "lem korea", "lem setan", "lem instant"],
  "lem bakar": ["lem tembak", "glue gun", "lem lilin", "refill glue gun"],
  "lem tembak": ["lem bakar", "glue gun", "lem lilin"],
  aibon: ["lem kuning", "lem aica aibon", "lem karpet", "lem hpl", "fox kuning"],
  silikon: ["sealant", "lem kaca", "dextone silicone", "lem akuarium", "silicone"],
  sealant: ["silikon", "lem kaca", "dextone", "pelapis bocor", "silicone sealant"],
  "lem pipa": ["isarplas", "ruglue", "lem pvc", "lem paralon"],

  // 9. Cat & Finishing
  cat: ["cat tembok", "cat kayu", "cat besi", "avian", "dulux", "catylac", "danapaint", "thinner", "kuas"],
  thinner: ["tiner", "nd", "thinner a", "pengencer cat", "avian"],
  tiner: ["thinner", "nd", "thinner a", "pengencer cat"],
  kuas: ["roll cat", "kuas cat", "kuas roll", "bak cat", "bulu roll"],
  dempul: ["plamir", "sanpolac", "isamu", "dempul kayu", "dempul besi"],
  semen: ["semen gresik", "semen tiga roda", "semen putih", "grouting", "semen nat", "mu"],

  // 10. Kunci Pintu & Pengaman
  gembok: ["padlock", "gembok leher panjang", "gembok kuningan", "tekiro", "solid", "gembok pagar"],
  handle: ["handle pintu", "tarikan pintu", "kunci bulat", "kunci kamar mandi", "mortise lock", "solid", "dekson"],
  engsel: ["hinge", "engsel pintu", "engsel jendela", "engsel stainless", "engsel sendok", "solid"],
  grendel: ["slot pintu", "hak angin", "kancing pintu", "gerendel"],
};

export type CandidateItem = {
  candidateIndex: number;
  product: Product;
  score: number;
  bestVariantId?: string | null;
  bestVariantName?: string | null;
  matchReasons: string[];
};

/**
 * Normalizes query string and extracts tokens, phrases, and technical specs.
 */
export function extractQueryDetails(rawQuery: string) {
  const clean = rawQuery.trim().toLowerCase();
  // Keep alphanumeric and common hardware symbols like /, ", -
  const words = clean
    .replace(/[^a-z0-9\/\.\-\"\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 0);

  // Extract specs: fractions (1/2, 3/4), sizes with inch/mm, numbers
  const specs: string[] = [];
  const specPatterns = [
    /\b\d+\/\d+\s*(?:inch|in|"|dim)?\b/gi, // e.g. 1/2", 3/4 inch
    /\b\d+(?:\.\d+)?\s*(?:inch|in|"|dim)\b/gi, // e.g. 3 inch, 4"
    /\b\d+(?:\.\d+)?\s*(?:mm|mili|cm|meter|m)\b/gi, // e.g. 10mm, 5 meter
    /\b\d+(?:\.\d+)?\s*(?:watt|w|volt|v|kg|gram|g|pcs)\b/gi, // e.g. 9 watt, 1 kg
  ];

  for (const pat of specPatterns) {
    const matches = clean.match(pat);
    if (matches) {
      for (const m of matches) {
        specs.push(m.trim().toLowerCase());
      }
    }
  }

  // Extract color specs
  const colors = ["hitam", "putih", "abu", "abu-abu", "kuning", "merah", "biru", "hijau", "transparan", "bening", "silver", "gold"];
  for (const col of colors) {
    if (clean.includes(col)) {
      specs.push(col);
    }
  }

  // Find synonym expansions
  const expandedSynonyms = new Set<string>();
  for (const [key, list] of Object.entries(HARDWARE_THESAURUS)) {
    if (clean.includes(key)) {
      for (const item of list) {
        expandedSynonyms.add(item.toLowerCase());
      }
    }
  }

  return {
    rawClean: clean,
    words,
    specs,
    expandedSynonyms: Array.from(expandedSynonyms),
  };
}

/**
 * Fast Levenshtein distance for typo tolerance (e.g. gerenda -> gerinda)
 */
function isFuzzyMatch(a: string, b: string): boolean {
  if (a === b) return true;
  if (Math.abs(a.length - b.length) > 2) return false;
  if (a.length < 4 || b.length < 4) return false;

  let matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }
  const dist = matrix[b.length][a.length];
  return dist <= (a.length > 6 ? 2 : 1);
}

/**
 * Scores and filters the catalog in-memory to find top 30-40 relevant candidates.
 * Runs in under 3 milliseconds even for 10,000 products!
 */
export function rankProductsForAI(
  products: Product[],
  rawQuery: string,
  maxCandidates: number = 35
): CandidateItem[] {
  if (!products || products.length === 0) return [];
  const queryInfo = extractQueryDetails(rawQuery);
  const { rawClean, words, specs, expandedSynonyms } = queryInfo;

  const scoredList: CandidateItem[] = [];

  for (let idx = 0; idx < products.length; idx++) {
    const p = products[idx];
    const pName = (p.name || "").toLowerCase();
    const pSku = (p.sku || "").toLowerCase();
    const pBarcode = (p.barcode || "").toLowerCase();
    const pBrand = (p.brand || "").toLowerCase();
    const pCat = (p.category || "").toLowerCase();

    let score = 0;
    const reasons: string[] = [];
    let bestVariantId: string | null = null;
    let bestVariantName: string | null = null;
    let bestVariantScore = -1;

    // 1. Exact SKU / Barcode match
    if (pSku && pSku === rawClean) {
      score += 400;
      reasons.push("SKU persis");
    }
    if (pBarcode && pBarcode === rawClean) {
      score += 500;
      reasons.push("Barcode persis");
    }

    // 2. Full phrase match
    if (pName.includes(rawClean)) {
      score += 150;
      reasons.push("Nama produk cocok penuh");
    }

    // 3. Word token matches
    let wordHitCount = 0;
    for (const w of words) {
      if (pName.includes(w)) {
        score += 30;
        wordHitCount++;
      } else if (pBrand.includes(w)) {
        score += 35;
        reasons.push(`Brand ${p.brand}`);
      } else if (pCat.includes(w)) {
        score += 25;
      } else {
        // Try fuzzy match for typo tolerance
        const nameTokens = pName.split(/\s+/);
        for (const nt of nameTokens) {
          if (isFuzzyMatch(w, nt)) {
            score += 18;
            wordHitCount++;
            break;
          }
        }
      }
    }

    // 4. Synonym / Thesaurus matches
    for (const syn of expandedSynonyms) {
      if (pName.includes(syn)) {
        score += 22;
        reasons.push(`Sinonim "${syn}"`);
      } else if (pCat.includes(syn)) {
        score += 15;
      }
    }

    // 5. Variant scoring & Spec matching
    const variants = (p.variants ?? []).filter((v) => v.is_active !== false);
    for (const v of variants) {
      const vName = (v.name || "").toLowerCase();
      const vSku = (v.sku || "").toLowerCase();
      let vScore = 0;

      if (vSku && vSku === rawClean) {
        vScore += 350;
      }
      if (vName.includes(rawClean)) {
        vScore += 100;
      }

      for (const w of words) {
        if (vName.includes(w)) vScore += 20;
      }

      // Check specific size/color specs
      for (const sp of specs) {
        if (vName.includes(sp)) {
          vScore += 45;
          score += 30; // boost parent product too
        }
        if (pName.includes(sp)) {
          score += 25;
        }
      }

      if (vScore > bestVariantScore) {
        bestVariantScore = vScore;
        bestVariantId = v.id;
        bestVariantName = v.name;
      }
    }

    if (bestVariantScore > 0) {
      score += bestVariantScore;
      if (bestVariantName) reasons.push(`Varian "${bestVariantName}" cocok`);
    }

    // In-stock preference (prefer items that are available)
    const stock = p.selected_stock ?? p.total_stock ?? 0;
    if (stock > 0 && score > 0) {
      score += 5;
    }

    if (score > 0) {
      scoredList.push({
        candidateIndex: 0, // will assign sequentially
        product: p,
        score,
        bestVariantId: bestVariantScore > 0 ? bestVariantId : undefined,
        bestVariantName: bestVariantScore > 0 ? bestVariantName : undefined,
        matchReasons: reasons.slice(0, 3),
      });
    }
  }

  // Sort descending by score
  scoredList.sort((a, b) => b.score - a.score);

  // Take top N candidates and assign 1-based index
  const topCandidates = scoredList.slice(0, maxCandidates);
  topCandidates.forEach((item, idx) => {
    item.candidateIndex = idx + 1;
  });

  return topCandidates;
}

/**
 * Builds a dense, ultra-lightweight representation of candidates for the LLM prompt.
 * Only ~15-20 tokens per item instead of 250+ tokens in raw JSON!
 */
export function buildCompactCatalogPrompt(candidates: CandidateItem[]): string {
  if (!candidates || candidates.length === 0) {
    return "(Tidak ada kandidat produk yang cocok langsung dari kata kunci)";
  }

  const lines = candidates.map((c) => {
    const p = c.product;
    const stock = p.selected_stock ?? p.total_stock ?? 0;
    const activeVars = (p.variants ?? []).filter((v) => v.is_active !== false);

    let line = `[${c.candidateIndex}] ${p.name}`;
    const metaParts: string[] = [];
    if (p.category) metaParts.push(`Kat: ${p.category}`);
    if (p.brand) metaParts.push(`Brand: ${p.brand}`);
    metaParts.push(`Stok: ${stock}`);
    line += ` (${metaParts.join(" | ")})`;

    if (activeVars.length > 0) {
      const varParts = activeVars.slice(0, 8).map((v, vIdx) => {
        const vStock = v.selected_stock ?? 0;
        return `(v${vIdx + 1}) ${v.name} [Stok:${vStock}]`;
      });
      line += `\n    Varian: ${varParts.join(", ")}`;
      if (activeVars.length > 8) {
        line += ` (+${activeVars.length - 8} varian lain)`;
      }
    }

    return line;
  });

  return lines.join("\n");
}

/**
 * Resolves AI output matches back to full product IDs and variant IDs.
 * Handles candidate index [1], product UUIDs, variant indices (v1), etc.
 */
export function resolveCandidateMatches(
  parsedMatches: any[],
  candidates: CandidateItem[],
  allProducts: Product[]
): AIMatchItem[] {
  if (!Array.isArray(parsedMatches)) return [];

  const candidateMapByIndex = new Map<number, CandidateItem>();
  const candidateMapById = new Map<string, CandidateItem>();
  const productMapById = new Map<string, Product>();

  for (const c of candidates) {
    candidateMapByIndex.set(c.candidateIndex, c);
    candidateMapById.set(c.product.id, c);
  }

  for (const p of allProducts) {
    productMapById.set(p.id, p);
  }

  const results: AIMatchItem[] = [];
  const seenProductIds = new Set<string>();

  for (const m of parsedMatches) {
    if (!m) continue;

    let targetProduct: Product | null = null;
    let targetVariantId: string | null = null;
    let targetVariantName: string | null = null;

    // 1. Resolve product by candidate index (e.g. index: 1 or candidate_index: 1)
    const rawIdx = m.candidate_index ?? m.index;
    if (typeof rawIdx === "number" || (typeof rawIdx === "string" && /^\d+$/.test(rawIdx))) {
      const numIdx = Number(rawIdx);
      const cand = candidateMapByIndex.get(numIdx);
      if (cand) {
        targetProduct = cand.product;
        targetVariantId = cand.bestVariantId || null;
        targetVariantName = cand.bestVariantName || null;
      }
    }

    // 2. Fallback resolve product by direct product_id or id
    if (!targetProduct && m.product_id) {
      targetProduct = productMapById.get(String(m.product_id)) || null;
    }

    if (!targetProduct) continue;
    if (seenProductIds.has(targetProduct.id)) continue;
    seenProductIds.add(targetProduct.id);

    // 3. Resolve variant if specified
    const activeVars = (targetProduct.variants ?? []).filter((v) => v.is_active !== false);

    // Variant by index (e.g. "v1", "v2" or 1, 2)
    const rawVarIdx = m.variant_index ?? m.variant;
    if (rawVarIdx !== undefined && rawVarIdx !== null && activeVars.length > 0) {
      let vNum = -1;
      if (typeof rawVarIdx === "number") {
        vNum = rawVarIdx;
      } else if (typeof rawVarIdx === "string") {
        const cleaned = rawVarIdx.toLowerCase().replace(/^v/, "").trim();
        if (/^\d+$/.test(cleaned)) {
          vNum = Number(cleaned);
        }
      }
      if (vNum >= 1 && vNum <= activeVars.length) {
        const selectedVar = activeVars[vNum - 1];
        targetVariantId = selectedVar.id;
        targetVariantName = selectedVar.name;
      }
    }

    // Variant by variant_id
    if (m.variant_id && activeVars.length > 0) {
      const foundVar = activeVars.find((v) => v.id === String(m.variant_id));
      if (foundVar) {
        targetVariantId = foundVar.id;
        targetVariantName = foundVar.name;
      }
    }

    const confidence = typeof m.confidence === "number" ? Math.min(Math.max(m.confidence, 0), 1) : 0.9;
    const reason = String(m.reason || "Rekomendasi barang sesuai pencarian").trim();

    results.push({
      product_id: targetProduct.id,
      variant_id: targetVariantId,
      variant_name: targetVariantName,
      confidence,
      reason,
    });

    if (results.length >= 8) break;
  }

  return results;
}

/**
 * Instant fallback matches when LLM times out or is offline.
 * Returns the best candidate products directly from local semantic scoring!
 */
export function buildFallbackMatches(candidates: CandidateItem[], query: string): AIMatchItem[] {
  if (!candidates || candidates.length === 0) return [];

  return candidates.slice(0, 6).map((c, i) => {
    const p = c.product;
    const activeVars = (p.variants ?? []).filter((v) => v.is_active !== false);
    const chosenVar = c.bestVariantId
      ? activeVars.find((v) => v.id === c.bestVariantId)
      : activeVars.length > 0
      ? activeVars[0]
      : null;

    const reasons = c.matchReasons.length > 0 ? c.matchReasons.join(", ") : `Cocok dengan pencarian "${query}"`;
    const confidence = Math.max(0.7, 0.95 - i * 0.05);

    return {
      product_id: p.id,
      variant_id: chosenVar ? chosenVar.id : null,
      variant_name: chosenVar ? chosenVar.name : null,
      confidence,
      reason: "",
    };
  });
}
