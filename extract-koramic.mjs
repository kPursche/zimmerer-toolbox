import { readFileSync, writeFileSync } from "fs";
import { PDFDocument } from "pdf-lib";

const src = readFileSync("tmp-koramic.pdf");
const srcPdf = await PDFDocument.load(src);

// Pages 60-62: overview tables (Regeldachneigung, Verschiebebereich, Firste) — included in every model PDF
const OVERVIEW = [60, 61, 62];

// 1-indexed page numbers from scan-pages.mjs output
const MODELS = [
  { id: "actua-10",    pages: [34] },
  { id: "plano-11",    pages: [35] },
  { id: "v11",         pages: [36] },
  { id: "alegra-8",    pages: [37, 38] },
  { id: "alegra-10-e", pages: [39, 40] },
  { id: "alegra-12-b", pages: [41, 42] },
  { id: "alegra-15",   pages: [43] },
  { id: "universo-10", pages: [44] },
  { id: "universo-14", pages: [45] },
  { id: "cosmo-11",    pages: [46] },
  { id: "cosmo-12-s",  pages: [47, 48] },
  { id: "cavus-13",    pages: [49] },
  { id: "tradi-12",    pages: [50] },
  { id: "mondo-11",    pages: [51] },
  { id: "mondo-15-s",  pages: [52] },
  { id: "karthago-14", pages: [53, 54, 55, 56] },
  { id: "falzbiber",   pages: [57, 58, 59] },
];

for (const model of MODELS) {
  const dst = await PDFDocument.create();
  const allPages = [...model.pages, ...OVERVIEW];
  const indices = allPages.map(p => p - 1);
  const copied = await dst.copyPages(srcPdf, indices);
  for (const page of copied) dst.addPage(page);
  const bytes = await dst.save();
  const outPath = `public/pdfs/wienerberger-${model.id}.pdf`;
  writeFileSync(outPath, bytes);
  console.log(`  ${outPath} (${copied.length} Seiten)`);
}
console.log("Fertig.");
