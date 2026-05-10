const { PDFDocument } = require("pdf-lib");
const fs = require("fs");

async function main() {
  const bytes = fs.readFileSync("tmp-koramic.pdf");
  const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true });
  console.log("Pages:", pdf.getPageCount());

  // Print outline/bookmarks if available
  const catalog = pdf.catalog;
  const outlines = catalog.lookup(pdf.context.obj("Outlines"));
  console.log("Outlines:", outlines ? "yes" : "no");
}

main().catch(console.error);
