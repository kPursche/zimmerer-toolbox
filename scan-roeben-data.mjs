import { readFileSync } from "fs";
import { fileURLToPath, pathToFileURL } from "url";
import { join, dirname } from "path";
import { getDocument, GlobalWorkerOptions } from "pdfjs-dist/legacy/build/pdf.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
GlobalWorkerOptions.workerSrc = pathToFileURL(join(__dirname, "node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs")).href;

const PDFS = [
  "roeben-monza",
  "roeben-limburg",
  "roeben-flandernplus",
  "roeben-bari",
  "roeben-milano",
  "roeben-elsass",
  "roeben-eifel",
  "roeben-rheinland",
  "roeben-bergamo",
  "roeben-piemont",
];

// Keywords we care about
const KEYWORDS = ["deckl", "decklänge", "lattweite", "lattabstand", "lattenweite", "lattenabstand",
  "üb", "überstand", "trauf", "laf", "mindest", "höchst", "mm", "verleg", "lat",
  "dachneig", "neig", "sparren", "konterlatt", "deckmaß", "min", "max"];

function isRelevant(line) {
  const l = line.toLowerCase();
  return KEYWORDS.some(k => l.includes(k));
}

for (const name of PDFS) {
  const buf = readFileSync(`public/pdfs/${name}.pdf`);
  const pdf = await getDocument({ data: new Uint8Array(buf), useWorkerFetch: false, isEvalSupported: false }).promise;

  console.log(`\n${"=".repeat(60)}`);
  console.log(`=== ${name} (${pdf.numPages} pages) ===`);
  console.log(`${"=".repeat(60)}`);

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const tc = await page.getTextContent();
    const text = tc.items.map(x => x.str).join(" ").replace(/\s+/g, " ").trim();

    // Check if this page has relevant content
    const lower = text.toLowerCase();
    const hasKeyword = KEYWORDS.some(k => lower.includes(k));
    if (hasKeyword && text.length > 30) {
      console.log(`\n--- Page ${i} ---`);
      // Print sentences/segments containing numbers or keywords
      const parts = text.split(/(?<=[.!?])\s+|(?=\b(?:Deck|Latt|Über|Trauf|LAF|Min|Max|mm)\b)/);
      for (const part of parts) {
        if (part.length > 5 && (part.match(/\d/) || isRelevant(part))) {
          console.log(part.slice(0, 300));
        }
      }
    }
  }
}
