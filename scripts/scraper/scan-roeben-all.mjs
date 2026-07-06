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

for (const name of PDFS) {
  const buf = readFileSync(`public/pdfs/${name}.pdf`);
  const pdf = await getDocument({ data: new Uint8Array(buf), useWorkerFetch: false, isEvalSupported: false }).promise;

  console.log(`\n${"=".repeat(70)}`);
  console.log(`=== ${name} (${pdf.numPages} pages) ===`);
  console.log(`${"=".repeat(70)}`);

  for (let i = 1; i <= Math.min(pdf.numPages, 6); i++) {
    const page = await pdf.getPage(i);
    const tc = await page.getTextContent();
    const text = tc.items.map(x => x.str).join(" ").replace(/\s+/g, " ").trim();
    if (text.length > 20) {
      console.log(`\n--- Page ${i} ---`);
      console.log(text.slice(0, 3000));
    }
  }
}
