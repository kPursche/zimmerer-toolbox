import { readFileSync } from "fs";
import { fileURLToPath, pathToFileURL } from "url";
import { join, dirname } from "path";
import { getDocument, GlobalWorkerOptions } from "pdfjs-dist/legacy/build/pdf.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
GlobalWorkerOptions.workerSrc = pathToFileURL(join(__dirname, "node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs")).href;

const MODELS = [
  "Alegra 8", "Alegra 10", "Alegra 12", "Alegra 15",
  "Universo 10", "Universo 14",
  "Cosmo 11", "Cosmo 12",
  "Mondo 11", "Mondo 15",
  "Tradi 12",
  "Actua 10", "Plano 11", "V11",
  "Karthago 14",
  "Cavus 13",
  "Falzbiber",
];

const buf = readFileSync("tmp-koramic.pdf");
const data = new Uint8Array(buf);
const pdf = await getDocument({ data, useWorkerFetch: false, isEvalSupported: false }).promise;
const totalPages = pdf.numPages;
console.log(`Total pages: ${totalPages}\n`);

for (let i = 1; i <= totalPages; i++) {
  const page = await pdf.getPage(i);
  const tc = await page.getTextContent();
  const text = tc.items.map(x => x.str).join(" ").replace(/\s+/g, " ").trim();
  const found = MODELS.filter(m => text.includes(m));
  const preview = text.slice(0, 130);
  console.log(`Page ${String(i).padStart(2)}: ${found.length ? "[" + found.join(", ") + "] " : ""}${preview}`);
}
