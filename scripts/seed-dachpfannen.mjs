/**
 * Seed-Skript für Dachpfannen-Hersteller und -Modelle.
 *
 * Voraussetzungen:
 *   - Node 18+ (nativer fetch)
 *   - @supabase/supabase-js installiert (npm i -D @supabase/supabase-js)
 *
 * Verwendung:
 *   NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co \
 *   SUPABASE_SERVICE_ROLE_KEY=eyJ... \
 *   node scripts/seed-dachpfannen.mjs
 *
 * Den Service-Role-Key findest du im Supabase-Dashboard unter
 *   Project Settings → API → service_role (secret)
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error(
    "Fehler: Umgebungsvariablen NEXT_PUBLIC_SUPABASE_URL und SUPABASE_SERVICE_ROLE_KEY müssen gesetzt sein."
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

// ─── 1. Storage-Bucket anlegen ────────────────────────────────────────────────

const { error: bucketError } = await supabase.storage.createBucket(
  "dachpfannen-pdf",
  { public: true }
);
if (bucketError && !bucketError.message.includes("already exists")) {
  console.error("Bucket-Fehler:", bucketError.message);
  process.exit(1);
}
console.log("✓ Bucket 'dachpfannen-pdf' bereit");

// ─── 2. PDFs herunterladen und hochladen ──────────────────────────────────────

const PDF_QUELLEN = [
  {
    modell: "Frankfurter Pfanne",
    dateiname: "braas-frankfurter-pfanne.pdf",
    url: "https://www.braas.de/-/media/images/de/products/dachsteine/frankfurter-pfanne/produktdatenblatt-frankfurter-pfanne-protegon-gd-163pdf.pdf",
  },
  {
    modell: "Tegalit",
    dateiname: "braas-tegalit.pdf",
    url: "https://www.braas.de/-/media/images/de/products/dachsteine/tegalit/produktdatenblatt-tegalit-gd-069pdf.pdf",
  },
  {
    modell: "Rubin 9V",
    dateiname: "braas-rubin-9v.pdf",
    url: "https://www.braas.de/-/media/images/de/products/dachziegel/1003592/1000654/produktdatenblatt-rubin-9v-gd-358pdf.pdf",
  },
];

const pdfUrls = {};

for (const pdf of PDF_QUELLEN) {
  process.stdout.write(`  Lade ${pdf.dateiname}... `);
  try {
    const res = await fetch(pdf.url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; ZimmererToolbox/1.0)" },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const buffer = await res.arrayBuffer();

    const { error: uploadError } = await supabase.storage
      .from("dachpfannen-pdf")
      .upload(pdf.dateiname, buffer, { contentType: "application/pdf", upsert: true });

    if (uploadError) throw new Error(uploadError.message);

    const { data: urlData } = supabase.storage
      .from("dachpfannen-pdf")
      .getPublicUrl(pdf.dateiname);

    pdfUrls[pdf.modell] = urlData.publicUrl;
    console.log("✓");
  } catch (err) {
    console.log(`✗ (${err.message}) — wird ohne PDF gespeichert`);
  }
}

// ─── 3. Hersteller eintragen ──────────────────────────────────────────────────

const HERSTELLER = [
  { name: "Braas",        active: true  },
  { name: "Creaton",      active: false },
  { name: "Erlus",        active: false },
  { name: "Jacobi",       active: false },
  { name: "Ludowici",     active: false },
  { name: "Nelskamp",     active: false },
  { name: "Rathscheck",   active: false },
  { name: "Röben",        active: false },
  { name: "Tondach",      active: false },
  { name: "Wienerberger", active: false },
];

const { data: herstellerDaten, error: herstellerFehler } = await supabase
  .from("dachpfannen_hersteller")
  .upsert(HERSTELLER, { onConflict: "name" })
  .select();

if (herstellerFehler) {
  console.error("Hersteller-Fehler:", herstellerFehler.message);
  process.exit(1);
}
console.log(`✓ ${herstellerDaten.length} Hersteller eingetragen`);

const braas = herstellerDaten.find((h) => h.name === "Braas");

// ─── 4. Braas-Modelle eintragen ───────────────────────────────────────────────

const BRAAS_MODELLE = [
  // Dachsteine (Beton)
  "Frankfurter Pfanne",
  "Tegalit",
  "Taunus Pfanne",
  "Doppel-S",
  "Harzer Pfanne",
  "Harzer Pfanne 7",
  "Harzer Pfanne F+",
  // Dachziegel (Ton)
  "Rubin 9V",
  "Rubin 11V",
  "Rubin 13V",
  "Rubin 15V",
  "Achat 12V",
  "Achat 14 Geradschnitt",
  "Granat 11V",
  "Granat 13V",
  "Granat 15",
  "Topas 11V",
  "Topas 13V",
  "Topas 15V",
  "Opal",
  "Opal Berliner Biber",
  "Opal Kirchenbiber",
  "Opal Turmbiber",
  "Smaragd",
  "Turmalin",
  "Saphir",
].map((name) => ({
  hersteller_id: braas.id,
  name,
  pdf_url: pdfUrls[name] ?? null,
}));

const { error: modelleFehler } = await supabase
  .from("dachpfannen_modelle")
  .upsert(BRAAS_MODELLE, { onConflict: "hersteller_id,name" });

if (modelleFehler) {
  console.error("Modelle-Fehler:", modelleFehler.message);
  process.exit(1);
}
console.log(`✓ ${BRAAS_MODELLE.length} Braas-Modelle eingetragen`);
console.log("\nFertig! Datenbank ist bereit.");
