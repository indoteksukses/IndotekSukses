import type { AIMatchItem, Product, ProductVariant } from "@/lib/types";

/**
 * Stopwords bahasa Indonesia yang tidak bernilai informasi dalam pencarian toko
 */
export const STOPWORDS = new Set([
  "untuk", "buat", "yang", "bisa", "mau", "ada", "di", "ke", "dari", "pada", "dan", "atau",
  "adalah", "dengan", "saya", "cari", "tolong", "mohon", "ini", "itu", "dong", "kah", "ya", "pun",
  "apa", "mana", "siapa", "bagaimana", "agar", "supaya", "dalam", "luar", "atas", "bawah", "nya"
]);

/**
 * Kata umum / payung berkategori luas yang harus diberi bobot rendah (agar tidak memicu false positive)
 */
export const GENERIC_WORDS = new Set([
  "mesin", "alat", "barang", "tipe", "model", "unit", "perkakas", "merk", "merek", "macam", "produk"
]);

/**
 * Ekstraktor akar kata bahasa Indonesia sederhana dan cepat (menghilangkan awalan me-/mem-/meng-/pe-/di- dan akhiran -kan/-i/-an)
 */
export function getIndonesianRoots(word: string): string[] {
  const roots = new Set<string>([word]);
  const w = word.toLowerCase();

  // Akhiran: -kan, -an, -i
  if (w.endsWith("kan") && w.length > 5) roots.add(w.slice(0, -3));
  if (w.endsWith("an") && w.length > 4) roots.add(w.slice(0, -2));
  if (w.endsWith("i") && w.length > 4) roots.add(w.slice(0, -1));

  // Awalan
  for (const base of Array.from(roots)) {
    if (base.startsWith("menge") && base.length > 6) {
      roots.add(base.slice(5)); // mengebor -> bor, mengecat -> cat
    } else if (base.startsWith("meng") && base.length > 5) {
      roots.add(base.slice(4)); // mengamplas -> amplas, mengelas -> elas -> las
      roots.add("k" + base.slice(4)); // mengikis -> kikis
      roots.add("g" + base.slice(4)); // menggali -> gali
    } else if (base.startsWith("meny") && base.length > 5) {
      roots.add("s" + base.slice(4)); // menyambung -> sambung, menyiram -> siram
    } else if (base.startsWith("mem") && base.length > 4) {
      roots.add(base.slice(3)); // membongkar -> bongkar
      roots.add("p" + base.slice(3)); // memotong -> potong, memaku -> paku
    } else if (base.startsWith("men") && base.length > 4) {
      roots.add(base.slice(3)); // mendongkrak -> dongkrak
      roots.add("t" + base.slice(3)); // menempel -> tempel
    } else if (base.startsWith("me") && base.length > 4) {
      roots.add(base.slice(2)); // melubangi -> lubang, meratakan -> rata
    } else if (base.startsWith("di") && base.length > 4) {
      roots.add(base.slice(2)); // dipotong -> potong, dibor -> bor
    } else if (base.startsWith("pe") && base.length > 4) {
      roots.add(base.slice(2)); // pelapis -> lapis
      if (base.startsWith("pem") && base.length > 4) roots.add("p" + base.slice(3)); // pemotong -> potong
      if (base.startsWith("pen") && base.length > 4) roots.add("t" + base.slice(3)); // penempel -> tempel
      if (base.startsWith("peng") && base.length > 5) roots.add(base.slice(4));
    }
  }

  return Array.from(roots).filter((r) => r.length >= 2);
}

export type FunctionalIntent = {
  id: string;
  name: string;
  triggerKeywords: string[];
  targetWords: string[];
  preferredCategories: string[];
  negativeWords?: string[];
};

/**
 * Pemetaan Maksud & Fungsi Alat Teknik / Toko Bangunan
 * Memetakan deskripsi pekerjaan (misal: "melubangi", "memotong") ke alat & kategori yang tepat
 */
export const FUNCTIONAL_INTENTS: FunctionalIntent[] = [
  {
    id: "drilling",
    name: "Melubangi / Bor",
    triggerKeywords: ["lubang", "melubangi", "pelubang", "bolong", "bolongin", "tembus", "ngebor", "bor", "drill", "lubangin"],
    targetWords: ["mesin bor", "bor", "cordless", "impact drill", "rotary hammer", "mata bor", "hole saw", "step drill", "bor tangan", "bor duduk"],
    preferredCategories: ["mesin bor", "aksesoris mesin", "perkakas & alat", "suku cadang mesin"],
    negativeWords: ["blower", "giling", "parut", "poles", "pompa"],
  },
  {
    id: "cutting",
    name: "Memotong / Pemotong",
    triggerKeywords: ["potong", "memotong", "pemotong", "belah", "iris", "gergaji", "saw", "cut", "potong besi", "potong kayu", "potong keramik"],
    targetWords: ["gerinda", "mesin gerinda", "circular saw", "jig saw", "cut off", "batu potong", "mata gerinda", "gergaji", "tang potong", "cutter", "diamond wheel", "mata potong"],
    preferredCategories: ["mesin potong & gergaji", "mesin gerinda & poles", "perkakas & alat", "alat listrik & pemanas"],
    negativeWords: ["blower", "bor", "giling", "pompa"],
  },
  {
    id: "planing_sanding",
    name: "Menghaluskan / Meratakan / Serut / Poles",
    triggerKeywords: ["halus", "menghaluskan", "rata", "meratakan", "serut", "pasah", "ketam", "amplas", "mengamplas", "poles", "memoles", "planner"],
    targetWords: ["mesin planner", "planner", "pasah", "ketam", "mesin poles", "amplas", "sander", "flap disc", "kertas amplas"],
    preferredCategories: ["mesin kayu", "mesin gerinda & poles"],
  },
  {
    id: "routing_engraving",
    name: "Mengukir / Profil Kayu / Grafir",
    triggerKeywords: ["ukir", "mengukir", "profil", "grafir", "menggrafir", "router", "trimmer", "beading"],
    targetWords: ["mesin router", "mesin trimmer", "mesin grafir", "alat grafir", "mata router", "mata trimmer", "engraver"],
    preferredCategories: ["mesin kayu", "mesin serbaguna"],
  },
  {
    id: "blowing",
    name: "Meniup Debu / Pengering / Blower",
    triggerKeywords: ["tiup", "meniup", "hembus", "debu", "keringkan", "blower"],
    targetWords: ["mesin blower", "blower", "bl 500", "air duster", "air gun"],
    preferredCategories: ["mesin serbaguna", "kompresor & pneumatik"],
  },
  {
    id: "washing",
    name: "Mencuci / Semprot Tekanan Tinggi",
    triggerKeywords: ["cuci mobil", "cuci motor", "cuci ac", "semprot air", "jet cleaner", "pressure washer"],
    targetWords: ["mesin jet cleaner", "jet cleaner", "laguna", "washing gun", "high pressure"],
    preferredCategories: ["pompa & pembersih"],
  },
  {
    id: "welding",
    name: "Mengelas / Sambung Besi",
    triggerKeywords: ["las", "mengelas", "trafo las", "inverter las", "kawat las", "welding"],
    targetWords: ["mesin las", "trafo las", "inverter", "mma", "falkon", "kawat las", "topeng las"],
    preferredCategories: ["mesin las"],
  },
  {
    id: "compressing",
    name: "Kompresor / Angin Tekanan / Staples",
    triggerKeywords: ["kompresor", "pompa angin", "isi angin", "semprot angin", "staples angin", "paku tembak"],
    targetWords: ["mesin kompresor", "kompresor", "fresco", "multipro", "mesin staples angin", "air duster"],
    preferredCategories: ["kompresor & pneumatik"],
  },
  {
    id: "water_pumping",
    name: "Pompa Air / Sedot Air",
    triggerKeywords: ["pompa air", "sedot air", "dorong air", "sanyo", "shimizu", "jet pump", "toren"],
    targetWords: ["mesin pompa air", "pompa air", "shimizu", "ps 128", "ps 135", "gp 129", "otomatis pompa", "radar pompa"],
    preferredCategories: ["pompa & pembersih", "pompa & sanitari"],
  },
  {
    id: "fastening",
    name: "Mengencangkan / Buka Baut / Baut Macet",
    triggerKeywords: ["buka baut", "kencangkan", "baut macet", "baut slek", "kunci inggris", "obeng", "tang buaya"],
    targetWords: ["kunci inggris", "kunci pas", "kunci ring", "kunci sok", "obeng", "tang buaya", "wd-40"],
    preferredCategories: ["perkakas & alat", "perkakas tangan"],
  },
  {
    id: "leak_repair",
    name: "Menambal / Atap Bocor / Waterproofing",
    triggerKeywords: ["nambal", "tambal", "menambal", "bocor", "rembes", "atap seng", "kebocoran"],
    targetWords: ["no drop", "aquaproof", "pelapis anti bocor", "lakban aluminium", "serat fiber", "sealant"],
    preferredCategories: ["cat & pelapis", "perekat & lakban"],
  },
];

/**
 * Kamus Sinonim & Istilah Pasar
 */
export const HARDWARE_THESAURUS: Record<string, string[]> = {
  nambal: ["tambal", "pelapis", "anti bocor", "aquaproof", "no drop", "nodrop", "sealant", "aspal", "flashing", "lakban", "waterproof", "kassa", "serat", "seng"],
  tambal: ["nambal", "pelapis", "anti bocor", "aquaproof", "no drop", "sealant", "aspal", "lakban", "waterproof"],
  bocor: ["anti bocor", "aquaproof", "no drop", "nodrop", "sealant", "silikon", "waterproof", "lem seng", "flintkote", "serat fiber", "lakban aluminium", "sealtape"],
  rembes: ["anti bocor", "waterproofing", "aquaproof", "no drop", "sealant", "semen putih", "damdex", "sika"],
  atap: ["seng", "asbes", "genteng", "spandek", "galvalum", "roofing", "talang", "karpet talang", "baut roofing"],
  seng: ["atap", "galvalum", "spandek", "plat", "baut roofing", "paku seng", "karpet talang"],
  talang: ["karpet talang", "talang pvc", "corong talang", "lem talang", "gantungan talang"],

  sanyo: ["pompa", "pompa air", "shimizu", "panasonic", "otomatis pompa", "jet pump", "semi jet"],
  pompa: ["sanyo", "shimizu", "panasonic", "pompa air", "otomatis", "tusen klep", "pelampung", "radar", "toren", "booster"],
  toren: ["tangki", "tandon", "pelampung", "radar", "otomatis toren", "valve", "watermur"],
  tandon: ["toren", "tangki air", "pelampung", "radar", "watermur"],
  otomatis: ["pressure switch", "radar", "pelampung toren", "saklar otomatis", "mcb"],

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

  gerinda: ["grinder", "gurinda", "mesin gerinda", "batu gerinda", "batu potong", "mata gerinda", "batu wd", "flap disc"],
  gurinda: ["gerinda", "grinder", "mesin gerinda", "batu gerinda", "batu potong", "mata gerinda", "batu wd"],
  "batu wd": ["wd", "batu potong", "mata gerinda potong", "batu gerinda"],
  potong: ["gerinda", "mesin gerinda", "circular saw", "jig saw", "cut off", "batu potong", "gergaji", "tang potong", "cutter", "gunting", "diamond wheel"],
  gergaji: ["gergaji besi", "gergaji kayu", "hacksaw", "mata gergaji", "gergaji dahan"],
  cutter: ["pisau cutter", "refill cutter", "mata cutter", "alat potong"],

  lubang: ["bor", "mesin bor", "mata bor", "cordless", "impact drill", "rotary hammer", "hole saw", "step drill"],
  bor: ["mesin bor", "mata bor", "cordless", "impact", "rotary hammer", "bor tangan", "bor duduk"],

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

  baut: ["sekrup", "screw", "bolt", "mur", "nut", "dynabolt", "baut roofing", "baut kuning"],
  sekrup: ["screw", "baut", "tapping", "drywall", "gypsum", "fisher", "fischer"],
  roofing: ["baut roofing", "sekrup baja ringan", "self drilling screw", "baut seng", "karet roofing"],
  "baja ringan": ["roofing", "hollow", "reng", "canal c", "sekrup gypsum", "gunting baja ringan"],
  dynabolt: ["dinabolt", "anchor bolt", "baut beton", "fischer besi"],
  dinabolt: ["dynabolt", "anchor bolt", "baut beton", "fischer"],
  fisher: ["fischer", "angkur plastik", "sekrup dinding", "s6", "s8", "s10"],
  fischer: ["fisher", "angkur plastik", "sekrup dinding", "s6", "s8", "s10"],
  paku: ["paku kayu", "paku beton", "paku seng", "paku payung", "paku rivet", "paku triplek"],

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

  cat: ["cat tembok", "cat kayu", "cat besi", "avian", "dulux", "catylac", "danapaint", "thinner", "kuas"],
  thinner: ["tiner", "nd", "thinner a", "pengencer cat", "avian"],
  tiner: ["thinner", "nd", "thinner a", "pengencer cat"],
  kuas: ["roll cat", "kuas cat", "kuas roll", "bak cat", "bulu roll"],
  dempul: ["plamir", "sanpolac", "isamu", "dempul kayu", "dempul besi"],
  semen: ["semen gresik", "semen tiga roda", "semen putih", "grouting", "semen nat", "mu"],

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

export function isStopword(w: string): boolean {
  return STOPWORDS.has(w.toLowerCase());
}

export function isGenericWord(w: string): boolean {
  return GENERIC_WORDS.has(w.toLowerCase());
}

/**
 * Normalizes query string, strips stopwords, extracts roots, and identifies functional intent.
 */
export function extractQueryDetails(rawQuery: string) {
  const clean = rawQuery.trim().toLowerCase();
  const rawWords = clean
    .replace(/[^a-z0-9\/\.\-\"\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 0);

  // Filter stopwords
  const meaningfulWords: string[] = [];
  const expandedRoots = new Set<string>();

  for (const w of rawWords) {
    if (!isStopword(w)) {
      meaningfulWords.push(w);
      const roots = getIndonesianRoots(w);
      for (const r of roots) {
        expandedRoots.add(r);
      }
    }
  }

  // Extract specs: fractions (1/2, 3/4), sizes with inch/mm, numbers
  const specs: string[] = [];
  const specPatterns = [
    /\b\d+\/\d+\s*(?:inch|in|"|dim)?\b/gi,
    /\b\d+(?:\.\d+)?\s*(?:inch|in|"|dim)\b/gi,
    /\b\d+(?:\.\d+)?\s*(?:mm|mili|cm|meter|m)\b/gi,
    /\b\d+(?:\.\d+)?\s*(?:watt|w|volt|v|kg|gram|g|pcs)\b/gi,
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

  // Detect Functional Intents (e.g. drilling, cutting, blowing)
  const matchedIntents: FunctionalIntent[] = [];
  for (const intent of FUNCTIONAL_INTENTS) {
    const isTriggered = intent.triggerKeywords.some((kw) => {
      if (clean.includes(kw)) return true;
      const kwRoots = getIndonesianRoots(kw);
      return Array.from(expandedRoots).some((r) => kwRoots.includes(r));
    });
    if (isTriggered) {
      matchedIntents.push(intent);
    }
  }

  // Find synonym expansions from thesaurus
  const expandedSynonyms = new Set<string>();
  for (const [key, list] of Object.entries(HARDWARE_THESAURUS)) {
    if (clean.includes(key) || expandedRoots.has(key)) {
      for (const item of list) {
        expandedSynonyms.add(item.toLowerCase());
      }
    }
  }

  // Add target words from matched intents
  for (const intent of matchedIntents) {
    for (const tw of intent.targetWords) {
      expandedSynonyms.add(tw.toLowerCase());
    }
  }

  return {
    rawClean: clean,
    words: meaningfulWords.length > 0 ? meaningfulWords : rawWords,
    roots: Array.from(expandedRoots),
    specs,
    matchedIntents,
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
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  const dist = matrix[b.length][a.length];
  return dist <= (a.length > 6 ? 2 : 1);
}

/**
 * Scores and filters the catalog in-memory with intelligent functional intent weighting.
 */
export function rankProductsForAI(
  products: Product[],
  rawQuery: string,
  maxCandidates: number = 35
): CandidateItem[] {
  if (!products || products.length === 0) return [];
  const queryInfo = extractQueryDetails(rawQuery);
  const { rawClean, words, roots, specs, matchedIntents, expandedSynonyms } = queryInfo;

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

    // 3. Functional Intent matching (Critical: boosts exact tool function)
    if (matchedIntents.length > 0) {
      for (const intent of matchedIntents) {
        // Preferred category match (e.g. "Mesin Bor" for melubangi)
        if (intent.preferredCategories.some((cat) => pCat.includes(cat) || cat.includes(pCat))) {
          score += 75;
          reasons.push(`Kategori sesuai fungsi ${intent.name}`);
        }

        // Target word match (e.g. "bor", "circular saw", "gerinda")
        for (const tw of intent.targetWords) {
          if (pName.includes(tw)) {
            score += 90;
            reasons.push(`Fungsi ${intent.name} (${tw})`);
            break;
          }
        }

        // Negative words penalty (e.g. "blower" when looking for drilling)
        if (intent.negativeWords && intent.negativeWords.some((nw) => pName.includes(nw))) {
          score -= 150;
        }
      }
    }

    // 4. Word token matches with Stopwords & Generic Words weighting
    let contentWordHits = 0;
    for (const w of words) {
      if (isGenericWord(w)) {
        // Generic word like "mesin", "alat" only gives minor boost (+4)
        if (pName.includes(w)) score += 4;
        continue;
      }

      // Non-generic content words
      let matched = false;
      if (pName.includes(w)) {
        score += 40;
        contentWordHits++;
        matched = true;
      } else if (pBrand.includes(w)) {
        score += 35;
        matched = true;
      } else if (pCat.includes(w)) {
        score += 30;
        matched = true;
      } else {
        // Try roots
        for (const r of roots) {
          if (pName.includes(r)) {
            score += 35;
            contentWordHits++;
            matched = true;
            break;
          }
        }
      }

      if (!matched) {
        // Try fuzzy match for typo tolerance
        const nameTokens = pName.split(/\s+/);
        for (const nt of nameTokens) {
          if (isFuzzyMatch(w, nt)) {
            score += 20;
            contentWordHits++;
            break;
          }
        }
      }
    }

    // 5. Synonym / Thesaurus matches
    for (const syn of expandedSynonyms) {
      if (pName.includes(syn)) {
        score += 30;
        reasons.push(`Sinonim "${syn}"`);
      } else if (pCat.includes(syn)) {
        score += 20;
      }
    }

    // 6. Variant scoring & Spec matching
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
        if (!isGenericWord(w) && vName.includes(w)) vScore += 25;
      }

      // Check specific size/color specs
      for (const sp of specs) {
        if (vName.includes(sp)) {
          vScore += 45;
          score += 30;
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
      if (bestVariantName) reasons.push(`Varian "${bestVariantName}"`);
    }

    // In-stock preference
    const stock = p.selected_stock ?? p.total_stock ?? 0;
    if (stock > 0 && score > 0) {
      score += 5;
    }

    if (score > 0) {
      scoredList.push({
        candidateIndex: 0,
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

    // 1. Resolve product by candidate index
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

    if (m.variant_id && activeVars.length > 0) {
      const foundVar = activeVars.find((v) => v.id === String(m.variant_id));
      if (foundVar) {
        targetVariantId = foundVar.id;
        targetVariantName = foundVar.name;
      }
    }

    const confidence = typeof m.confidence === "number" ? Math.min(Math.max(m.confidence, 0), 1) : 0.9;
    const reason = String(m.reason || "").trim();

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
