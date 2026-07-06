-- Community-Feed absichern.
-- Die Tabelle wurde ursprünglich ohne Migration (per Dashboard) und ohne RLS
-- angelegt — jeder mit dem öffentlichen Anon-Key konnte schreiben UND löschen.
-- Neues Modell:
--   * anon/authenticated: nur SELECT (Feed lesen + Realtime)
--   * INSERT/DELETE: ausschließlich über die Server-Routen
--     /api/community/send und /api/community/delete mit dem Service-Role-Key
--     (der Service-Role-Key umgeht RLS)

-- Falls die Tabelle in einer frischen Umgebung noch nicht existiert
CREATE TABLE IF NOT EXISTS community_feed (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at  timestamptz DEFAULT now(),
  name        text        NOT NULL DEFAULT 'Anonym',
  message     text        NOT NULL,
  reply_to    uuid,
  session_id  text
);

-- Längen-Limits als Defense-in-Depth (zusätzlich zur API-Validierung).
-- NOT VALID: bestehende Zeilen werden nicht geprüft, nur neue.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'community_feed_name_len') THEN
    ALTER TABLE community_feed
      ADD CONSTRAINT community_feed_name_len CHECK (char_length(name) <= 50) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'community_feed_message_len') THEN
    ALTER TABLE community_feed
      ADD CONSTRAINT community_feed_message_len CHECK (char_length(message) <= 1000) NOT VALID;
  END IF;
END $$;

-- RLS aktivieren: anon darf ab jetzt NUR noch lesen
ALTER TABLE community_feed ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_community" ON community_feed;
CREATE POLICY "public_read_community"
  ON community_feed FOR SELECT TO anon, authenticated USING (true);
