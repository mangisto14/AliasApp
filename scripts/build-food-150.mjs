/**
 * Merge food batches from Cursor transcript (if present) + hard tier → food.json
 * Run: node scripts/build-food-150.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, "..");

const TRANSCRIPT_CANDIDATES = [
  path.join(
    process.env.USERPROFILE || "",
    ".cursor",
    "projects",
    "c-Users-repo-Claude-AliasApp",
    "agent-transcripts",
    "a4dd577e-6428-4b67-987c-612c46bcced5",
    "a4dd577e-6428-4b67-987c-612c46bcced5.jsonl"
  ),
  path.join(
    "C:",
    "Users",
    "Media",
    ".cursor",
    "projects",
    "c-Users-repo-Claude-AliasApp",
    "agent-transcripts",
    "a4dd577e-6428-4b67-987c-612c46bcced5",
    "a4dd577e-6428-4b67-987c-612c46bcced5.jsonl"
  ),
];

function extractJsonBlocks(text) {
  const out = [];
  const re = /```json\n([\s\S]*?)\n```/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    try {
      out.push(JSON.parse(m[1]));
    } catch {
      /* skip */
    }
  }
  return out;
}

function pickBatch(blocks, firstWordHe) {
  for (const arr of blocks) {
    if (!Array.isArray(arr) || arr.length === 0) continue;
    if (arr[0]?.word === firstWordHe) return arr;
  }
  return null;
}

const batch3 = [
  { word: "זעפרן", wordEn: "Saffron", d: 3, tabooHe: ["תבלין", "יקר", "צהוב"], tabooEn: ["spice", "expensive", "threads"] },
  { word: "כמהין", wordEn: "Truffle (fungus)", d: 3, tabooHe: ["פטרייה", "קרקע", "ארומה"], tabooEn: ["fungus", "earth", "aroma"] },
  { word: "פואה גרא", wordEn: "Foie gras", d: 3, tabooHe: ["כבד", "אווז", "מעדן"], tabooEn: ["liver", "goose", "delicacy"] },
  { word: "ביצי דג", wordEn: "Caviar", d: 3, tabooHe: ["דגים", "מלוח", "פריחה"], tabooEn: ["roe", "salt", "luxury"] },
  { word: "קרם פרש", wordEn: "Crème fraîche", d: 3, tabooHe: ["שמנת", "מותסס", "צרפת"], tabooEn: ["cream", "cultured", "France"] },
  { word: "בור נואזט", wordEn: "Beurre noisette", d: 3, tabooHe: ["חמאה", "מקורמל", "אגוז"], tabooEn: ["butter", "browned", "hazelnut"] },
  { word: "הולנדייז", wordEn: "Hollandaise", d: 3, tabooHe: ["חמאה", "חלמון", "רטיב"], tabooEn: ["butter", "yolk", "sauce"] },
  { word: "רטב ברנז", wordEn: "Béarnaise sauce", d: 3, tabooHe: ["רטיב", "חמאה", "צרפת"], tabooEn: ["sauce", "butter", "French"] },
  { word: "רטב מורנה", wordEn: "Mornay sauce", d: 3, tabooHe: ["גבינה", "בשאמל", "גרטן"], tabooEn: ["cheese", "béchamel", "gratin"] },
  { word: "קונסומה", wordEn: "Consommé", d: 3, tabooHe: ["ציר", "צלול", "סינון"], tabooEn: ["broth", "clear", "strained"] },
  { word: "רוטב ווסטר", wordEn: "Worcestershire sauce", d: 3, tabooHe: ["מותסס", "אנשובי", "אנגלי"], tabooEn: ["fermented", "anchovy", "English"] },
  { word: "אגר אגר", wordEn: "Agar-agar", d: 3, tabooHe: ["גל", "אצות", "טבעוני"], tabooEn: ["gel", "seaweed", "vegan"] },
  { word: "קולגן", wordEn: "Collagen (cooking)", d: 3, tabooHe: ["חלבון", "רו", "קיפול"], tabooEn: ["protein", "stock", "gel"] },
  { word: "דאשי", wordEn: "Dashi", d: 3, tabooHe: ["ציר", "יפן", "קומבו"], tabooEn: ["broth", "Japan", "kombu"] },
  { word: "בוניטו דקה", wordEn: "Katsuobushi", d: 3, tabooHe: ["דקה", "דג", "אוממי"], tabooEn: ["flakes", "fish", "umami"] },
  { word: "פונזו", wordEn: "Ponzu", d: 3, tabooHe: ["רטיב", "סיטרוס", "סויה"], tabooEn: ["citrus", "soy", "dressing"] },
  { word: "טארט טאטן", wordEn: "Tarte Tatin", d: 3, tabooHe: ["תפוחים", "הפוך", "צרפת"], tabooEn: ["apples", "upside-down", "French"] },
  { word: "עוגת אופרה", wordEn: "Gâteau Opéra", d: 3, tabooHe: ["שכבות", "שוקולד", "קפה"], tabooEn: ["layers", "chocolate", "coffee"] },
  { word: "קרם שאנטילי", wordEn: "Crème Chantilly", d: 3, tabooHe: ["שמנת", "מוקצפת", "סוכר"], tabooEn: ["whipped", "cream", "sweet"] },
  { word: "פרלינה", wordEn: "Praline", d: 3, tabooHe: ["אגוזים", "קרמל", "מילוי"], tabooEn: ["nuts", "caramel", "filling"] },
  { word: "ג׳נדויה", wordEn: "Gianduja", d: 3, tabooHe: ["אגוזים", "שוקולד", "איטליה"], tabooEn: ["hazelnut", "chocolate", "Italy"] },
  { word: "גרם מסאלה", wordEn: "Garam masala", d: 3, tabooHe: ["תערובת", "הודי", "חם"], tabooEn: ["blend", "Indian", "warm"] },
  { word: "אספטידה", wordEn: "Asafoetida (hing)", d: 3, tabooHe: ["תבלין", "הודי", "ריח"], tabooEn: ["hing", "Indian", "aroma"] },
  { word: "ברברה", wordEn: "Berbere spice", d: 3, tabooHe: ["אתיופי", "חריף", "תערובת"], tabooEn: ["Ethiopian", "spicy", "blend"] },
  { word: "סובזיד", wordEn: "Sous-vide", d: 3, tabooHe: ["רותחן", "וואקום", "טמפרטורה"], tabooEn: ["water bath", "vacuum", "temperature"] },
  { word: "רדוקציה", wordEn: "Reduction (sauce)", d: 3, tabooHe: ["ריכוז", "אידוי", "רטיב"], tabooEn: ["reduce", "simmer", "sauce"] },
  { word: "מיזון פלאס", wordEn: "Mise en place", d: 3, tabooHe: ["הכנה", "מטבח", "סידור"], tabooEn: ["prep", "kitchen", "setup"] },
  { word: "מרגז", wordEn: "Merguez", d: 3, tabooHe: ["נקניק", "צאן", "צפון אפריקה"], tabooEn: ["sausage", "lamb", "North Africa"] },
  { word: "עראייס", wordEn: "Arisa", d: 3, tabooHe: ["חרדל", "טוניס", "רטיב"], tabooEn: ["mustard", "Tunis", "condiment"] },
  { word: "רוטב אמבה", wordEn: "Amba (mango pickle sauce)", d: 3, tabooHe: ["מנגו", "חריף", "תיבול"], tabooEn: ["mango", "pickle", "tangy"] },
  { word: "מלאבי", wordEn: "Malabi", d: 3, tabooHe: ["חלב", "וורד", "קינוח"], tabooEn: ["milk", "rose", "dessert"] },
  { word: "חלה גבינה", wordEn: "Savory cheese challah", d: 3, tabooHe: ["חלה", "מלוח", "תיבול"], tabooEn: ["bread", "savory", "braid"] },
  { word: "תערובת שווארמה", wordEn: "Shawarma spice blend", d: 3, tabooHe: ["תבלינים", "שווארמה", "בשר"], tabooEn: ["spices", "shawarma", "meat"] },
  { word: "במבה", wordEn: "Bamba (peanut snack)", d: 3, tabooHe: ["בוטנים", "חטיף", "ילדים"], tabooEn: ["peanut", "snack", "Israeli"] },
  { word: "קינואה שחורה", wordEn: "Black quinoa", d: 3, tabooHe: ["דגן", "בישול", "מריר"], tabooEn: ["grain", "bitter", "Andes"] },
  { word: "מיסו אדום", wordEn: "Aka miso", d: 3, tabooHe: ["סויה", "תסיסה", "יפן"], tabooEn: ["soy", "fermented", "Japan"] },
  { word: "פבלובה", wordEn: "Pavlova", d: 3, tabooHe: ["מרנג", "פירות", "קינוח"], tabooEn: ["meringue", "fruit", "dessert"] },
  { word: "סופלה", wordEn: "Soufflé", d: 3, tabooHe: ["אווירי", "ביצים", "אפייה"], tabooEn: ["airy", "eggs", "baked"] },
  { word: "נדוג׳ה", wordEn: "’Nduja", d: 3, tabooHe: ["נקניק", "חריף", "ממרח"], tabooEn: ["salami", "spicy", "spread"] },
  { word: "מורטדלה", wordEn: "Mortadella", d: 3, tabooHe: ["נקניק", "איטליה", "פיסטוק"], tabooEn: ["salami", "Italy", "pistachio"] },
  { word: "קפריקולה", wordEn: "Capicola", d: 3, tabooHe: ["נקניק", "איטליה", "צוואר"], tabooEn: ["cured", "Italy", "pork"] },
  { word: "קורנד ביף", wordEn: "Corned beef", d: 3, tabooHe: ["מלוח", "בישול", "בשר"], tabooEn: ["brined", "beef", "boil"] },
  { word: "טארטאר בקר", wordEn: "Steak tartare", d: 3, tabooHe: ["בשר חי", "ביצה", "קצוץ"], tabooEn: ["raw beef", "egg", "minced"] },
  { word: "פלפל סצ׳ואן", wordEn: "Sichuan peppercorn", d: 3, tabooHe: ["חריף", "סיני", "סנטר"], tabooEn: ["numbing", "Chinese", "pepper"] },
  { word: "טמרהינד", wordEn: "Tamarind", d: 3, tabooHe: ["חמוץ", "פרי", "קארי"], tabooEn: ["sour", "pod", "curry"] },
  { word: "אצ׳אר", wordEn: "Achar (Indian pickle)", d: 3, tabooHe: ["חמוץ", "הודי", "כבוש"], tabooEn: ["pickle", "Indian", "spicy"] },
  { word: "גולאב ג׳מון", wordEn: "Gulab jamun", d: 3, tabooHe: ["מטוגן", "סירופ", "הודי"], tabooEn: ["fried", "syrup", "Indian"] },
  { word: "קצף מולקולרי", wordEn: "Molecular gastronomy foam", d: 3, tabooHe: ["קצף", "לציטין", "טכניקה"], tabooEn: ["foam", "lecithin", "modernist"] },
  { word: "ברטאן", wordEn: "Beurre blanc", d: 3, tabooHe: ["חמאה", "יין לבן", "רטיב"], tabooEn: ["butter", "white wine", "sauce"] },
  { word: "פטיסקרי", wordEn: "Pâtisserie", d: 3, tabooHe: ["מאפים", "צרפת", "קינוחים"], tabooEn: ["pastries", "France", "desserts"] },
];

if (batch3.length !== 50) {
  throw new Error(`batch3 must be 50, got ${batch3.length}`);
}

const TRANSCRIPT = TRANSCRIPT_CANDIDATES.find((p) => fs.existsSync(p));
let batch1;
let batch2;

if (TRANSCRIPT) {
  const lines = fs.readFileSync(TRANSCRIPT, "utf8").split(/\r?\n/).filter(Boolean);
  for (const line of lines) {
    try {
      const o = JSON.parse(line);
      if (o.role !== "assistant" || !o.message?.content?.[0]?.text) continue;
      const text = o.message.content[0].text;
      const blocks = extractJsonBlocks(text);
      if (!batch1) batch1 = pickBatch(blocks, "חומוס");
      if (!batch2) batch2 = pickBatch(blocks, "מג׳דרה");
      if (batch1 && batch2) break;
    } catch {
      /* skip line */
    }
  }
}

if (!batch1 || !batch2) {
  const fallback = path.join(repoRoot, "scripts", "food-batches-1-2.json");
  if (!fs.existsSync(fallback)) {
    throw new Error(
      `Could not load batch1/batch2 from transcript or ${fallback}. ` +
        `Transcript tried: ${TRANSCRIPT || "(none)"}`
    );
  }
  const packed = JSON.parse(fs.readFileSync(fallback, "utf8"));
  batch1 = packed.batch1;
  batch2 = packed.batch2;
}

if (batch1.length !== 50 || batch2.length !== 50) {
  throw new Error(`Expected 50+50, got ${batch1.length} + ${batch2.length}`);
}

const all = [...batch1, ...batch2, ...batch3];
const out = path.join(repoRoot, "src", "data", "dictionary", "food.json");
fs.writeFileSync(out, JSON.stringify(all, null, 2) + "\n", "utf8");
console.log(`Wrote ${all.length} bilingual entries to ${out}`);
