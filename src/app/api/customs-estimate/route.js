import { NextResponse } from 'next/server'

/**
 * CUSTOMS ESTIMATE API
 * 
 * POST /api/customs-estimate
 * Body: { description, hs_code?, origin_country, import_country, cargo_value, currency }
 * 
 * Returns: HS code suggestions, duty rate, VAT rate, total landed cost breakdown,
 *          import restrictions/requirements, and applicable cost lines for the cost matrix.
 */

// ─── HS CODE DATABASE (top-level chapters + common codes) ───────
const HS_CHAPTERS = [
  { chapter: "01-05", desc: "Live animals; Animal products", keywords: ["animal", "meat", "fish", "dairy", "egg", "honey", "seafood", "poultry", "beef", "pork", "lamb", "chicken"] },
  { chapter: "06-14", desc: "Vegetable products", keywords: ["vegetable", "plant", "fruit", "grain", "rice", "wheat", "corn", "coffee", "tea", "spice", "cocoa", "tobacco", "seed", "oil seed", "cereal", "flour", "sugar cane"] },
  { chapter: "15", desc: "Animal or vegetable fats and oils", keywords: ["oil", "fat", "palm", "olive", "sunflower", "coconut", "margarine", "wax"] },
  { chapter: "16-24", desc: "Prepared foodstuffs; Beverages; Tobacco", keywords: ["food", "beverage", "juice", "wine", "beer", "spirit", "chocolate", "confectionery", "pasta", "sauce", "canned", "preserved", "tobacco", "cigarette"] },
  { chapter: "25-27", desc: "Mineral products", keywords: ["mineral", "salt", "cement", "ore", "coal", "petroleum", "crude", "oil", "gas", "fuel", "bitumen"] },
  { chapter: "28-38", desc: "Chemical products", keywords: ["chemical", "pharmaceutical", "medicine", "drug", "fertilizer", "pesticide", "paint", "cosmetic", "soap", "detergent", "adhesive", "explosive", "photographic"] },
  { chapter: "39-40", desc: "Plastics and Rubber", keywords: ["plastic", "rubber", "polymer", "PVC", "polyethylene", "silicone", "tube", "pipe", "film", "sheet", "tyre", "tire"] },
  { chapter: "41-43", desc: "Leather and Furs", keywords: ["leather", "hide", "skin", "fur", "handbag", "luggage", "saddle", "belt"] },
  { chapter: "44-46", desc: "Wood and articles of wood", keywords: ["wood", "timber", "lumber", "plywood", "furniture", "cork", "bamboo", "rattan", "charcoal"] },
  { chapter: "47-49", desc: "Paper and paperboard", keywords: ["paper", "cardboard", "pulp", "book", "newspaper", "magazine", "printing", "label", "wallpaper"] },
  { chapter: "50-63", desc: "Textiles and textile articles", keywords: ["textile", "fabric", "cotton", "silk", "wool", "synthetic", "clothing", "garment", "shirt", "trouser", "dress", "knit", "yarn", "carpet", "curtain"] },
  { chapter: "64-67", desc: "Footwear; Headgear; Umbrellas", keywords: ["shoe", "boot", "sandal", "footwear", "hat", "umbrella", "feather"] },
  { chapter: "68-70", desc: "Stone, ceramic, glass", keywords: ["stone", "marble", "granite", "ceramic", "tile", "brick", "glass", "mirror", "fibre optic"] },
  { chapter: "71", desc: "Precious metals and stones", keywords: ["gold", "silver", "platinum", "diamond", "gem", "jewellery", "jewelry", "pearl", "precious"] },
  { chapter: "72-83", desc: "Base metals and articles", keywords: ["steel", "iron", "aluminium", "aluminum", "copper", "zinc", "tin", "lead", "nickel", "metal", "wire", "pipe", "tube", "bolt", "screw", "nail", "chain", "anchor"] },
  { chapter: "84", desc: "Machinery and mechanical appliances", keywords: ["machine", "machinery", "engine", "pump", "turbine", "compressor", "crane", "excavator", "tractor", "computer", "printer", "valve", "bearing", "gear"] },
  { chapter: "85", desc: "Electrical machinery and equipment", keywords: ["electrical", "electronic", "battery", "cable", "wire", "transformer", "motor", "generator", "solar", "panel", "LED", "lamp", "phone", "television", "TV", "speaker", "semiconductor", "chip", "circuit", "PCB", "component"] },
  { chapter: "86-89", desc: "Vehicles, aircraft, vessels", keywords: ["vehicle", "car", "truck", "bus", "motorcycle", "bicycle", "aircraft", "airplane", "helicopter", "ship", "boat", "vessel", "railway", "locomotive", "container"] },
  { chapter: "90", desc: "Optical, medical, measuring instruments", keywords: ["optical", "medical", "surgical", "instrument", "meter", "gauge", "thermometer", "microscope", "telescope", "camera", "lens", "x-ray"] },
  { chapter: "91", desc: "Clocks and watches", keywords: ["clock", "watch", "timer", "chronometer"] },
  { chapter: "92", desc: "Musical instruments", keywords: ["music", "instrument", "piano", "guitar", "drum", "violin"] },
  { chapter: "93", desc: "Arms and ammunition", keywords: ["arms", "weapon", "ammunition", "gun", "rifle", "firearm"] },
  { chapter: "94", desc: "Furniture; Lighting; Prefabricated buildings", keywords: ["furniture", "chair", "table", "bed", "mattress", "lamp", "lighting", "chandelier", "prefabricated"] },
  { chapter: "95", desc: "Toys, games, sports equipment", keywords: ["toy", "game", "sport", "ball", "exercise", "gym", "playground", "puzzle", "doll"] },
  { chapter: "96-97", desc: "Miscellaneous manufactured articles; Art", keywords: ["pen", "pencil", "button", "zipper", "broom", "candle", "art", "antique", "painting", "sculpture", "collector"] },
];

// Common specific HS codes
const HS_CODES = [
  { code: "0901.11", desc: "Coffee, not roasted, not decaffeinated", duty_class: "agricultural" },
  { code: "0901.21", desc: "Coffee, roasted, not decaffeinated", duty_class: "agricultural" },
  { code: "1001.99", desc: "Wheat (excl. durum and seed)", duty_class: "agricultural" },
  { code: "1005.90", desc: "Maize (corn), other than seed", duty_class: "agricultural" },
  { code: "1006.30", desc: "Semi-milled or wholly milled rice", duty_class: "agricultural" },
  { code: "1201.90", desc: "Soya beans", duty_class: "agricultural" },
  { code: "1507.10", desc: "Crude soya-bean oil", duty_class: "agricultural" },
  { code: "1511.10", desc: "Crude palm oil", duty_class: "agricultural" },
  { code: "1701.14", desc: "Raw cane sugar", duty_class: "agricultural" },
  { code: "2101.11", desc: "Extracts of coffee", duty_class: "processed_food" },
  { code: "2709.00", desc: "Petroleum oils, crude", duty_class: "energy" },
  { code: "2710.12", desc: "Light petroleum oils", duty_class: "energy" },
  { code: "2711.11", desc: "Natural gas, liquefied (LNG)", duty_class: "energy" },
  { code: "3004.90", desc: "Medicaments, packaged for retail", duty_class: "pharmaceutical" },
  { code: "3904.10", desc: "PVC, not mixed, in primary forms", duty_class: "chemical" },
  { code: "4001.10", desc: "Natural rubber latex", duty_class: "agricultural" },
  { code: "4407.11", desc: "Lumber, coniferous (pine/spruce)", duty_class: "raw_material" },
  { code: "5201.00", desc: "Cotton, not carded or combed", duty_class: "textile_raw" },
  { code: "5209.42", desc: "Denim fabric (cotton, >200g/m2)", duty_class: "textile" },
  { code: "6109.10", desc: "T-shirts, singlets, cotton, knit", duty_class: "textile" },
  { code: "7207.11", desc: "Semi-finished iron/steel, <0.25% carbon", duty_class: "metal" },
  { code: "7210.49", desc: "Flat-rolled iron/steel, zinc-coated", duty_class: "metal" },
  { code: "7601.10", desc: "Aluminium, not alloyed, unwrought", duty_class: "metal" },
  { code: "8471.30", desc: "Portable computers (laptops)", duty_class: "electronics" },
  { code: "8471.49", desc: "Data processing machines (PCs)", duty_class: "electronics" },
  { code: "8517.12", desc: "Smartphones", duty_class: "electronics" },
  { code: "8528.72", desc: "Television receivers, colour", duty_class: "electronics" },
  { code: "8541.40", desc: "Photovoltaic cells (solar)", duty_class: "electronics" },
  { code: "8542.31", desc: "Electronic integrated circuits (processors)", duty_class: "electronics" },
  { code: "8703.23", desc: "Motor vehicles, 1500-3000cc", duty_class: "vehicle" },
  { code: "8703.80", desc: "Electric vehicles", duty_class: "vehicle" },
  { code: "9403.60", desc: "Wooden furniture", duty_class: "manufactured" },
  { code: "9404.21", desc: "Mattresses, cellular rubber/plastic", duty_class: "manufactured" },
];

// ─── COUNTRY DUTY & VAT DATABASE ────────────────────────────────
const COUNTRIES = {
  GB: {
    name: "United Kingdom", currency: "GBP",
    vat_rate: 20, vat_name: "VAT",
    duty_rates: { agricultural: 8, processed_food: 10, energy: 0, pharmaceutical: 0, chemical: 4.5, raw_material: 2, textile_raw: 0, textile: 12, metal: 0, electronics: 0, vehicle: 6.5, manufactured: 3.5, default: 4 },
    de_minimis: 135, // GBP - no duty below this
    restrictions: ["Certain food products require health certificates", "Phytosanitary certificates for plant products", "UKCA marking for electronics since Brexit"],
    notes: "Post-Brexit: goods from EU now subject to customs declarations. UK Global Tariff applies.",
  },
  US: {
    name: "United States", currency: "USD",
    vat_rate: 0, vat_name: "Sales Tax (state-level, not at import)",
    duty_rates: { agricultural: 5, processed_food: 8, energy: 0.5, pharmaceutical: 0, chemical: 5.5, raw_material: 0, textile_raw: 3, textile: 16, metal: 0, electronics: 0, vehicle: 2.5, manufactured: 4, default: 3.5 },
    de_minimis: 800,
    restrictions: ["FDA approval required for food, drugs, cosmetics", "CPSC compliance for consumer products", "FCC certification for electronics", "Section 301 tariffs on Chinese goods (7.5-25% additional)"],
    notes: "MPF (Merchandise Processing Fee): 0.3464% of value, min $31.67, max $614.35. HMF (Harbor Maintenance Fee): 0.125% for ocean.",
  },
  EU: {
    name: "European Union", currency: "EUR",
    vat_rate: 21, vat_name: "VAT (varies by member state, avg 21%)",
    duty_rates: { agricultural: 10, processed_food: 12, energy: 0, pharmaceutical: 0, chemical: 5, raw_material: 0, textile_raw: 0, textile: 12, metal: 0, electronics: 0, vehicle: 6.5, manufactured: 3.5, default: 4 },
    de_minimis: 150,
    restrictions: ["CE marking required for most products", "REACH compliance for chemicals", "RoHS for electronics", "EUDR deforestation regulation for commodities"],
    notes: "EORI number required. Common External Tariff applies. GSP preferences for developing countries.",
  },
  IN: {
    name: "India", currency: "INR",
    vat_rate: 18, vat_name: "IGST (Integrated GST)",
    duty_rates: { agricultural: 30, processed_food: 35, energy: 5, pharmaceutical: 10, chemical: 10, raw_material: 5, textile_raw: 5, textile: 20, metal: 7.5, electronics: 10, vehicle: 60, manufactured: 15, default: 10 },
    de_minimis: 0,
    restrictions: ["BIS certification for electronics and many consumer goods", "FSSAI for food products", "Import licence required for restricted items", "Anti-dumping duties on Chinese steel and chemicals"],
    notes: "Basic Customs Duty + Social Welfare Surcharge (10% on BCD) + IGST. Cess may apply on certain items.",
  },
  ZA: {
    name: "South Africa", currency: "ZAR",
    vat_rate: 15, vat_name: "VAT",
    duty_rates: { agricultural: 10, processed_food: 15, energy: 0, pharmaceutical: 0, chemical: 5, raw_material: 0, textile_raw: 5, textile: 22, metal: 5, electronics: 0, vehicle: 25, manufactured: 10, default: 5 },
    de_minimis: 500,
    restrictions: ["NRCS compulsory specifications for certain products", "ITAC permits for restricted goods", "PPECB for perishable products"],
    notes: "SACU (Southern African Customs Union) rates apply. Ad valorem or specific duties.",
  },
  AE: {
    name: "United Arab Emirates", currency: "AED",
    vat_rate: 5, vat_name: "VAT",
    duty_rates: { agricultural: 0, processed_food: 5, energy: 0, pharmaceutical: 0, chemical: 5, raw_material: 0, textile_raw: 5, textile: 5, metal: 5, electronics: 5, vehicle: 5, manufactured: 5, default: 5 },
    de_minimis: 1000,
    restrictions: ["Halal certification for food products", "ESMA conformity for certain products", "Restricted/prohibited items list applies"],
    notes: "Flat 5% duty on most goods. Free zone imports may be exempt. GCC common tariff.",
  },
  CN: {
    name: "China", currency: "CNY",
    vat_rate: 13, vat_name: "VAT",
    duty_rates: { agricultural: 15, processed_food: 20, energy: 0, pharmaceutical: 4, chemical: 6.5, raw_material: 3, textile_raw: 5, textile: 14, metal: 5, electronics: 0, vehicle: 15, manufactured: 10, default: 8 },
    de_minimis: 50,
    restrictions: ["CCC certification for electronics and vehicles", "AQSIQ for food and agricultural products", "Import licences for restricted categories"],
    notes: "MFN (Most Favoured Nation) rates apply. Consumption tax on luxury goods.",
  },
  SG: {
    name: "Singapore", currency: "SGD",
    vat_rate: 9, vat_name: "GST",
    duty_rates: { agricultural: 0, processed_food: 0, energy: 0, pharmaceutical: 0, chemical: 0, raw_material: 0, textile_raw: 0, textile: 0, metal: 0, electronics: 0, vehicle: 0, manufactured: 0, default: 0 },
    de_minimis: 400,
    restrictions: ["Duty only on alcohol, tobacco, petroleum, vehicles", "Permits required for controlled goods"],
    notes: "Singapore is virtually duty-free. Only 4 categories attract duty. GST applies on all imports.",
  },
  AU: {
    name: "Australia", currency: "AUD",
    vat_rate: 10, vat_name: "GST",
    duty_rates: { agricultural: 0, processed_food: 5, energy: 0, pharmaceutical: 0, chemical: 5, raw_material: 0, textile_raw: 5, textile: 10, metal: 5, electronics: 0, vehicle: 5, manufactured: 5, default: 5 },
    de_minimis: 1000,
    restrictions: ["Strict biosecurity (BICON) for all food, plant, animal products", "TGA for therapeutic goods", "ACMA for telecommunications equipment"],
    notes: "AUD 1,000 de minimis is one of the highest globally. FTAs with China, Japan, Korea, ASEAN reduce rates.",
  },
  NG: {
    name: "Nigeria", currency: "NGN",
    vat_rate: 7.5, vat_name: "VAT",
    duty_rates: { agricultural: 20, processed_food: 20, energy: 5, pharmaceutical: 5, chemical: 10, raw_material: 5, textile_raw: 10, textile: 20, metal: 10, electronics: 10, vehicle: 20, manufactured: 15, default: 10 },
    de_minimis: 0,
    restrictions: ["Import prohibition on 41 categories (rice, cement, textiles etc.)", "SON conformity assessment for manufactured goods", "NAFDAC for food and pharmaceuticals"],
    notes: "ECOWAS Common External Tariff. High duties to protect local industry. Many items on import prohibition list.",
  },
  KE: {
    name: "Kenya", currency: "KES",
    vat_rate: 16, vat_name: "VAT",
    duty_rates: { agricultural: 25, processed_food: 25, energy: 0, pharmaceutical: 0, chemical: 10, raw_material: 0, textile_raw: 10, textile: 25, metal: 10, electronics: 10, vehicle: 25, manufactured: 25, default: 10 },
    de_minimis: 0,
    restrictions: ["KEBS standards mark for imports", "Import Declaration Fee (IDF) at 3.5%", "Railway Development Levy at 2%"],
    notes: "EAC Common External Tariff. Additional levies: IDF 3.5%, RDL 2%.",
  },
  BR: {
    name: "Brazil", currency: "BRL",
    vat_rate: 17, vat_name: "ICMS (varies by state)",
    duty_rates: { agricultural: 10, processed_food: 14, energy: 0, pharmaceutical: 6, chemical: 12, raw_material: 4, textile_raw: 8, textile: 18, metal: 12, electronics: 14, vehicle: 18, manufactured: 14, default: 12 },
    de_minimis: 50,
    restrictions: ["INMETRO certification for regulated products", "ANVISA for health products", "Complex multi-layer tax system"],
    notes: "Import taxes: II (Import Duty) + IPI (Industrial Products Tax) + PIS/COFINS + ICMS. Total effective rate can exceed 50%.",
  },
};

// ─── HS CODE MATCHING ENGINE ────────────────────────────────────

function suggestHSCodes(description) {
  if (!description) return [];
  const words = description.toLowerCase().split(/\s+/);
  const results = [];

  // Match against specific HS codes first
  for (const hs of HS_CODES) {
    const descWords = hs.desc.toLowerCase().split(/\s+/);
    let score = 0;
    for (const w of words) {
      if (w.length < 3) continue;
      for (const dw of descWords) {
        if (dw.includes(w) || w.includes(dw)) score += 2;
      }
    }
    if (score > 0) results.push({ ...hs, score, match_type: "specific" });
  }

  // Match against chapter keywords
  for (const ch of HS_CHAPTERS) {
    let score = 0;
    for (const w of words) {
      if (w.length < 3) continue;
      for (const kw of ch.keywords) {
        if (kw.includes(w) || w.includes(kw)) score += 1;
      }
    }
    if (score > 0) results.push({ code: ch.chapter + ".XX.XX", desc: ch.desc, duty_class: "default", score: score * 0.5, match_type: "chapter" });
  }

  results.sort((a, b) => b.score - a.score);
  return results.slice(0, 8);
}

// ─── DUTY CALCULATION ───────────────────────────────────────────

function calculateDuties(hsCode, cargoValue, originCountry, importCountry) {
  const country = COUNTRIES[importCountry];
  if (!country) return null;

  // Determine duty class from HS code
  const matched = HS_CODES.find(h => hsCode.startsWith(h.code));
  const dutyClass = matched?.duty_class || "default";
  const dutyRate = country.duty_rates[dutyClass] ?? country.duty_rates.default;

  const customsDuty = Math.round(cargoValue * dutyRate / 100);
  const dutyableValue = cargoValue + customsDuty; // VAT is typically on CIF + duty
  const vatAmount = Math.round(dutyableValue * country.vat_rate / 100);

  // Additional fees by country
  let additionalFees = [];
  if (importCountry === "US") {
    const mpf = Math.min(Math.max(Math.round(cargoValue * 0.003464), 32), 614);
    const hmf = Math.round(cargoValue * 0.00125);
    additionalFees.push({ name: "Merchandise Processing Fee (MPF)", amount: mpf, rate: "0.3464%" });
    additionalFees.push({ name: "Harbor Maintenance Fee (HMF)", amount: hmf, rate: "0.125%" });
  }
  if (importCountry === "IN") {
    const swc = Math.round(customsDuty * 0.10);
    additionalFees.push({ name: "Social Welfare Surcharge", amount: swc, rate: "10% on BCD" });
  }
  if (importCountry === "KE") {
    const idf = Math.round(cargoValue * 0.035);
    const rdl = Math.round(cargoValue * 0.02);
    additionalFees.push({ name: "Import Declaration Fee (IDF)", amount: idf, rate: "3.5%" });
    additionalFees.push({ name: "Railway Development Levy (RDL)", amount: rdl, rate: "2%" });
  }
  if (importCountry === "BR") {
    const ipi = Math.round((cargoValue + customsDuty) * 0.10);
    const pis = Math.round(cargoValue * 0.0211);
    const cofins = Math.round(cargoValue * 0.0965);
    additionalFees.push({ name: "IPI (Industrial Products Tax)", amount: ipi, rate: "~10%" });
    additionalFees.push({ name: "PIS/COFINS", amount: pis + cofins, rate: "~11.75%" });
  }

  const additionalTotal = additionalFees.reduce((s, f) => s + f.amount, 0);
  const totalDutyTaxes = customsDuty + vatAmount + additionalTotal;
  const effectiveRate = cargoValue > 0 ? ((totalDutyTaxes / cargoValue) * 100) : 0;

  // Brokerage estimate
  const brokerageEstimate = Math.max(Math.round(cargoValue * 0.005), 150);

  return {
    cargo_value: cargoValue,
    currency: country.currency,
    duty_class: dutyClass,
    customs_duty: { rate: dutyRate, amount: customsDuty },
    vat: { name: country.vat_name, rate: country.vat_rate, amount: vatAmount },
    additional_fees: additionalFees,
    brokerage: { name: "Customs Brokerage (est.)", amount: brokerageEstimate },
    total_duties_taxes: totalDutyTaxes,
    total_landed_cost: cargoValue + totalDutyTaxes + brokerageEstimate,
    effective_rate: effectiveRate,
    de_minimis: country.de_minimis,
    below_de_minimis: cargoValue < country.de_minimis,
    restrictions: country.restrictions,
    notes: country.notes,
    country_name: country.name,
  };
}

// ─── INCOTERM RESPONSIBILITY CHECK ──────────────────────────────

function isCustomsBuyerResponsibility(incoterm) {
  // Buyer pays import duties for these incoterms (i.e., NOT DDP)
  const buyerPaysImport = ["EXW", "FCA", "FAS", "FOB", "CFR", "CIF", "CPT", "CIP", "DAP", "DPU"];
  return buyerPaysImport.includes(incoterm?.toUpperCase());
}

// ─── HANDLER ────────────────────────────────────────────────────

export async function POST(request) {
  const body = await request.json();
  const { description, hs_code, origin_country, import_country, cargo_value, currency, sell_incoterm } = body;

  // HS code suggestions
  const suggestions = suggestHSCodes(description || "");
  const selectedHS = hs_code || (suggestions.length > 0 ? suggestions[0].code : "0000.00");

  // Validate import country
  if (!import_country || !COUNTRIES[import_country]) {
    return NextResponse.json({
      hs_suggestions: suggestions,
      selected_hs: selectedHS,
      error: "Import country not found. Available: " + Object.keys(COUNTRIES).join(", "),
      countries_available: Object.entries(COUNTRIES).map(([code, c]) => ({ code, name: c.name })),
    }, { status: 200 }); // 200 because HS suggestions are still valid
  }

  const value = parseFloat(cargo_value) || 0;
  const duties = calculateDuties(selectedHS, value, origin_country, import_country);

  // Determine if customs costs should go into cost matrix
  const includeInCostMatrix = sell_incoterm ? !isCustomsBuyerResponsibility(sell_incoterm) : true;

  // Build cost lines for cost matrix injection
  const costLines = [];
  if (duties) {
    costLines.push({ line_item: `Import Duty (${duties.customs_duty.rate}%)`, amount: duties.customs_duty.amount, block: "D", cost_type: "additional", source: "customs" });
    if (duties.vat.amount > 0) {
      costLines.push({ line_item: `${duties.vat.name} (${duties.vat.rate}%)`, amount: duties.vat.amount, block: "D", cost_type: "additional", source: "customs" });
    }
    for (const fee of duties.additional_fees) {
      costLines.push({ line_item: `${fee.name} (${fee.rate})`, amount: fee.amount, block: "D", cost_type: "additional", source: "customs" });
    }
    costLines.push({ line_item: duties.brokerage.name, amount: duties.brokerage.amount, block: "D", cost_type: "additional", source: "customs" });
  }

  return NextResponse.json({
    hs_suggestions: suggestions,
    selected_hs: selectedHS,
    duties,
    cost_lines: costLines,
    include_in_cost_matrix: includeInCostMatrix,
    incoterm_note: sell_incoterm === "DDP"
      ? "DDP: Seller is responsible for all import duties and taxes. These costs should be included in the cost matrix."
      : sell_incoterm
        ? `${sell_incoterm}: Import duties are typically the buyer's responsibility. Shown for reference but may not need to be in seller's cost matrix.`
        : "No incoterm specified. Showing duties for reference.",
    countries_available: Object.entries(COUNTRIES).map(([code, c]) => ({ code, name: c.name })),
  });
}

// GET — return available countries list
export async function GET() {
  return NextResponse.json({
    countries: Object.entries(COUNTRIES).map(([code, c]) => ({
      code, name: c.name, currency: c.currency, vat_rate: c.vat_rate, vat_name: c.vat_name,
    })),
    hs_chapters: HS_CHAPTERS.map(ch => ({ chapter: ch.chapter, desc: ch.desc })),
  });
}
