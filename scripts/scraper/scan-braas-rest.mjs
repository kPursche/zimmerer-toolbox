import { readFileSync } from "fs";
import { fileURLToPath, pathToFileURL } from "url";
import { join, dirname } from "path";
import { getDocument, GlobalWorkerOptions } from "pdfjs-dist/legacy/build/pdf.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
GlobalWorkerOptions.workerSrc = pathToFileURL(join(__dirname, "node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs")).href;

const TARGETS = [
  { name: "braas-rubin-9v",    search: /Sattelfirst\s*O/i,  radius: 400 },
  { name: "braas-rubin-13v",   search: /10°\s*15°/,         radius: 400 },
  { name: "braas-rubin-15v",   search: /Sattelfirst\s*HO/i, radius: 400 },
  { name: "braas-granat-13v",  search: /Sattelfirst\s*HO/i, radius: 400 },
  { name: "braas-topas-11v",   search: /la\s*=\s*3\d\d\s*[–-]/i, radius: 300 },
  { name: "braas-achat-12v",   search: /Lattenabstand\s+First/i, radius: 500 },
  { name: "braas-opal",        search: /LAT\s*2/i,          radius: 400 },
];

for (const { name, search, radius } of TARGETS) {
  const buf = readFileSync(`public/pdfs/${name}.pdf`);
  const pdf = await getDocument({ data: new Uint8Array(buf), useWorkerFetch: false, isEvalSupported: false }).promise;
  let text = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const tc = await page.getTextContent();
    text += tc.items.map(x => x.str).join(" ").replace(/\s+/g, " ") + " ";
  }
  const m = text.match(search);
  console.log(`\n=== ${name} ===`);
  if (m) {
    console.log(text.slice(Math.max(0, m.index - 30), m.index + radius).trim());
  } else {
    console.log(`  Muster nicht gefunden: ${search}`);
  }
}
