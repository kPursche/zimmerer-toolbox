const { PDFDocument } = require("pdf-lib");
const { default: pdfParse } = await import("pdf-parse");
const fs = require("fs");

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

async function main() {
  const buf = fs.readFileSync("tmp-koramic.pdf");
  const full = await pdfParse(buf, {
    pagerender: function(pageData) {
      return pageData.getTextContent().then(tc => {
        return tc.items.map(i => i.str).join(" ");
      });
    }
  });

  // Re-parse page by page
  const pdf = await PDFDocument.load(buf);
  const totalPages = pdf.getPageCount();
  console.log(`Total pages: ${totalPages}\n`);

  for (let i = 0; i < totalPages; i++) {
    const singleDoc = await PDFDocument.create();
    const [copied] = await singleDoc.copyPages(pdf, [i]);
    singleDoc.addPage(copied);
    const singleBuf = Buffer.from(await singleDoc.save());

    const parsed = await pdfParse(singleBuf);
    const text = parsed.text.replace(/\s+/g, " ").trim().slice(0, 300);

    const found = MODELS.filter(m => text.includes(m));
    console.log(`Page ${i + 1}: ${found.length ? found.join(", ") : "(no match)"}`);
    if (text) console.log(`  → ${text.slice(0, 150)}`);
  }
}

main().catch(console.error);
