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

// Extract LAF rows from text - returns [row1_3x5, row2_4x6] as arrays of numbers
function extractLAF(text) {
  // Find all lines with "LAF" followed by numbers
  const matches = [...text.matchAll(/LAF\s+([\d\s]+?)(?=FLA|\n|$)/g)];
  const rows = [];
  for (const m of matches) {
    const nums = m[1].trim().split(/\s+/).map(Number).filter(n => !isNaN(n) && n > 0);
    if (nums.length >= 10) rows.push(nums.slice(0, 12));
  }
  return rows;
}

function extractDecklänge(text) {
  // Look for patterns like "310 bis 345 mm" or "variabel ... 31,0 bis 34,5 cm" or "Decklänge ca. 345 mm"
  let m;
  // Variable range in cm
  m = text.match(/(\d{2},\d)\s*bis\s*(\d{2},\d)\s*cm/);
  if (m) return { min: Math.round(parseFloat(m[1].replace(',','.')) * 10), max: Math.round(parseFloat(m[2].replace(',','.')) * 10) };
  // Variable range in mm
  m = text.match(/(\d{3})\s*(?:bis|-)\s*(\d{3})\s*mm.*?[Dd]ecklänge/);
  if (m) return { min: parseInt(m[1]), max: parseInt(m[2]) };
  // Fixed mm
  m = text.match(/[Dd]ecklänge\s*(?:ca\.)?\s*(\d{3})\s*mm/);
  if (m) { const v = parseInt(m[1]); return { min: v-10, max: v+10, fixed: v }; }
  return null;
}

for (const name of PDFS) {
  const buf = readFileSync(`public/pdfs/${name}.pdf`);
  const pdf = await getDocument({ data: new Uint8Array(buf), useWorkerFetch: false, isEvalSupported: false }).promise;

  let fullText = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const tc = await page.getTextContent();
    fullText += " " + tc.items.map(x => x.str).join(" ").replace(/\s+/g, " ");
  }

  const dl = extractDecklänge(fullText);
  const lafs = extractLAF(fullText);

  console.log(`\n### ${name}`);
  console.log(`Decklänge: ${dl ? JSON.stringify(dl) : 'NOT FOUND - check manually'}`);
  console.log(`LAF rows found: ${lafs.length}`);
  lafs.forEach((row, i) => console.log(`  row${i+1}: [${row.join(', ')}]`));

  // Also find any "mm" values near "Trauf" or dimension-like measurements
  const traufMatches = [...fullText.matchAll(/(\d{3})\s*mm/g)].map(m => m[1]).slice(0, 20);
  console.log(`mm values (first 20): ${traufMatches.join(', ')}`);
}
