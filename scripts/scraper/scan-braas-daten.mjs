import { readFileSync } from "fs";
import { fileURLToPath, pathToFileURL } from "url";
import { join, dirname } from "path";
import { getDocument, GlobalWorkerOptions } from "pdfjs-dist/legacy/build/pdf.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
GlobalWorkerOptions.workerSrc = pathToFileURL(join(__dirname, "node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs")).href;

const FILES = [
  "braas-frankfurter-pfanne",
  "braas-tegalit",
  "braas-taunus-pfanne",
  "braas-doppel-s",
  "braas-harzer-pfanne",
  "braas-harzer-pfanne-7",
  "braas-harzer-pfanne-fp",
  "braas-rubin-9v",
  "braas-rubin-11v",
  "braas-rubin-13v",
  "braas-rubin-15v",
  "braas-achat-12v",
  "braas-achat-14",
  "braas-granat-11v",
  "braas-granat-13v",
  "braas-granat-15",
  "braas-topas-11v",
  "braas-topas-13v",
  "braas-topas-15v",
  "braas-opal",
  "braas-opal-berliner-biber",
  "braas-opal-kirchenbiber",
  "braas-opal-turmbiber",
  "braas-smaragd",
  "braas-turmalin",
  "braas-saphir",
];

// Extrahiert einen Textausschnitt rund um ein Muster
function snippet(text, pattern, radius = 200) {
  const m = text.match(pattern);
  if (!m) return null;
  const idx = m.index;
  return text.slice(Math.max(0, idx - 20), idx + radius);
}

for (const name of FILES) {
  const buf = readFileSync(`public/pdfs/${name}.pdf`);
  const pdf = await getDocument({ data: new Uint8Array(buf), useWorkerFetch: false, isEvalSupported: false }).promise;
  let text = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const tc = await page.getTextContent();
    text += tc.items.map(x => x.str).join(" ").replace(/\s+/g, " ") + " ";
  }

  const decklaenge  = snippet(text, /[Vv]ariable\s+[Dd]ecklänge/);
  const putlat      = snippet(text, /PÜT/);
  const laf         = snippet(text, /LAF\s+(je|=)/i);
  const traufeFirst = snippet(text, /[Ee]inteilung\s+[Tt]raufe/);

  console.log(`\n=== ${name} ===`);
  if (decklaenge)  console.log(`  Decklänge:     ${decklaenge.trim()}`);
  if (putlat)      console.log(`  PÜT/LAT:       ${putlat.trim()}`);
  if (laf)         console.log(`  LAF:           ${laf.trim()}`);
  if (traufeFirst) console.log(`  Traufe-First:  ${traufeFirst.trim()}`);
  if (!decklaenge && !putlat && !laf && !traufeFirst) console.log("  (keine Techn. Daten gefunden)");
}
