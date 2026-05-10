import { readFileSync } from "fs";
import { fileURLToPath, pathToFileURL } from "url";
import { join, dirname } from "path";
import { getDocument, GlobalWorkerOptions } from "pdfjs-dist/legacy/build/pdf.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
GlobalWorkerOptions.workerSrc = pathToFileURL(join(__dirname, "node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs")).href;

const FILES = [
  "braas-frankfurter-pfanne",
  "braas-tegalit",
  "braas-rubin-9v",
  "braas-granat-11v",
];

for (const name of FILES) {
  const buf = readFileSync(`public/pdfs/${name}.pdf`);
  const pdf = await getDocument({ data: new Uint8Array(buf), useWorkerFetch: false, isEvalSupported: false }).promise;
  console.log(`\n=== ${name} (${pdf.numPages} Seiten) ===`);
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const tc = await page.getTextContent();
    const text = tc.items.map(x => x.str).join(" ").replace(/\s+/g, " ").trim();
    if (text.match(/LAF|FLA|First|Lattung|DN |°\s*\d|Dachneigung|Verschiebe/i)) {
      console.log(`  S.${i}: ${text.slice(0, 400)}`);
    }
  }
}
