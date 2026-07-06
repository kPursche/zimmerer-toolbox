import { readFileSync } from "fs";
import { fileURLToPath, pathToFileURL } from "url";
import { join, dirname } from "path";
import { getDocument, GlobalWorkerOptions } from "pdfjs-dist/legacy/build/pdf.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
GlobalWorkerOptions.workerSrc = pathToFileURL(join(__dirname, "node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs")).href;

// Modelle mit Lücken - größeres Fenster
const TARGETS = [
  { name: "braas-tegalit",           patterns: [/[Vv]ariable\s+[Dd]ecklänge/, /PÜT/] },
  { name: "braas-doppel-s",          patterns: [/[Vv]ariable\s+[Dd]ecklänge/, /L\s*a\s*\[mm\]/i] },
  { name: "braas-harzer-pfanne",     patterns: [/[Vv]ariable\s+[Dd]ecklänge/, /L\s*a\s*\[mm\]/i] },
  { name: "braas-harzer-pfanne-7",   patterns: [/[Vv]ariable\s+[Dd]ecklänge/, /L\s*a\s*\[mm\]/i] },
  { name: "braas-rubin-9v",          patterns: [/LAF\s+je\s+nach/i, /Sattelfirst.*?\d+/i] },
  { name: "braas-rubin-13v",         patterns: [/PÜT/, /LAF.*?\d+\s+\d+/i] },
  { name: "braas-rubin-15v",         patterns: [/LAF.*?\d+/i, /Sattelfirst.*?\d+/i] },
  { name: "braas-achat-14",          patterns: [/[Vv]ariable\s+[Dd]ecklänge/, /LAF.*?\d+/i] },
  { name: "braas-granat-13v",        patterns: [/[Vv]ariable\s+[Dd]ecklänge/, /LAF.*?\d+/i] },
  { name: "braas-topas-11v",         patterns: [/[Vv]ariable\s+[Dd]ecklänge/, /PÜT/] },
  { name: "braas-topas-15v",         patterns: [/[Vv]ariable\s+[Dd]ecklänge/, /LAF.*?\d+/i] },
  { name: "braas-smaragd",           patterns: [/[Vv]ariable\s+[Dd]ecklänge/, /LAF.*?\d+/i] },
  { name: "braas-opal-turmbiber",    patterns: [/PÜT/, /LAF.*?\d+/i] },
];

for (const { name, patterns } of TARGETS) {
  const buf = readFileSync(`public/pdfs/${name}.pdf`);
  const pdf = await getDocument({ data: new Uint8Array(buf), useWorkerFetch: false, isEvalSupported: false }).promise;
  let text = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const tc = await page.getTextContent();
    text += tc.items.map(x => x.str).join(" ").replace(/\s+/g, " ") + " ";
  }

  console.log(`\n=== ${name} ===`);
  for (const pat of patterns) {
    const m = text.match(pat);
    if (m) {
      const idx = m.index;
      console.log(`  [${pat.source}]:`);
      console.log(`  ${text.slice(Math.max(0, idx - 10), idx + 350).trim()}`);
    } else {
      console.log(`  [${pat.source}]: NICHT GEFUNDEN`);
    }
  }
}
