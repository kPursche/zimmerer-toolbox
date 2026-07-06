import { readFileSync } from "fs";
import { fileURLToPath, pathToFileURL } from "url";
import { join, dirname } from "path";
import { getDocument, GlobalWorkerOptions } from "pdfjs-dist/legacy/build/pdf.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
GlobalWorkerOptions.workerSrc = pathToFileURL(join(__dirname, "node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs")).href;

const PDFS = [
  "nelskamp-f12-sued-verlegeanleitung",
  "nelskamp-f12-nord",
  "nelskamp-f10-pro",
  "nelskamp-f10",
  "nelskamp-f8",
  "nelskamp-h10",
  "nelskamp-h15",
  "nelskamp-g10",
  "nelskamp-r10",
  "nelskamp-ds8",
  "nelskamp-ds5",
  "nelskamp-d13",
  "nelskamp-d15",
  "nelskamp-planum",
  "nelskamp-s-tile",
  "nelskamp-sigma-tile",
  "nelskamp-crown-tile",
];

for (const name of PDFS) {
  const buf = readFileSync(`public/pdfs/${name}.pdf`);
  const pdf = await getDocument({ data: new Uint8Array(buf), useWorkerFetch: false, isEvalSupported: false }).promise;
  // Only read first 4 pages (data is always on pages 1-2)
  const maxPages = Math.min(pdf.numPages, 4);
  let text = "";
  for (let i = 1; i <= maxPages; i++) {
    const page = await pdf.getPage(i);
    const tc = await page.getTextContent();
    text += tc.items.map(x => x.str).join(" ").replace(/\s+/g, " ") + "\n---PAGE---\n";
  }

  console.log(`\n${"=".repeat(60)}`);
  console.log(`=== ${name} ===`);
  console.log(`${"=".repeat(60)}`);

  // Search for Decklänge
  const laMatch = text.match(/Deckl[äa]nge[^0-9]*([0-9,]+)[^0-9]*[–\-][^0-9]*([0-9,]+)/i);
  if (laMatch) {
    console.log(`Decklänge: ${laMatch[1]} – ${laMatch[2]} cm`);
  } else {
    const laMatch2 = text.match(/Deckl[äa]nge[^\n]{0,80}/i);
    console.log(`Decklänge raw: ${laMatch2?.[0] ?? "NOT FOUND"}`);
  }

  // Search for Trauflatte
  const traufMatch = text.match(/Trauflatte[^\n]{0,100}/gi);
  if (traufMatch) {
    traufMatch.forEach(m => console.log(`Trauflatte: ${m.trim()}`));
  } else {
    console.log("Trauflatte: NOT FOUND");
  }

  // Search for X table (LAF)
  const xMatch = text.match(/DN[^\n]{0,200}/gi);
  if (xMatch) {
    xMatch.slice(0, 3).forEach(m => console.log(`X-Tabelle: ${m.trim()}`));
  }

  // Also dump first 1500 chars for context
  console.log("\n--- RAW (first 1500 chars) ---");
  console.log(text.slice(0, 1500));
}
