-- Hersteller (Dachziegel-/Dachstein-Hersteller)
CREATE TABLE IF NOT EXISTS dachpfannen_hersteller (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  name        text        NOT NULL UNIQUE,
  active      boolean     DEFAULT false,
  created_at  timestamptz DEFAULT now()
);

-- Modelle (Produkte je Hersteller)
CREATE TABLE IF NOT EXISTS dachpfannen_modelle (
  id             uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  hersteller_id  uuid        NOT NULL REFERENCES dachpfannen_hersteller(id) ON DELETE CASCADE,
  name           text        NOT NULL,
  pdf_url        text,
  created_at     timestamptz DEFAULT now(),
  UNIQUE (hersteller_id, name)
);

-- Row-Level-Security: nur Lesezugriff für anon
ALTER TABLE dachpfannen_hersteller ENABLE ROW LEVEL SECURITY;
ALTER TABLE dachpfannen_modelle    ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_read_hersteller"
  ON dachpfannen_hersteller FOR SELECT TO anon USING (true);

CREATE POLICY "public_read_modelle"
  ON dachpfannen_modelle FOR SELECT TO anon USING (true);
