"use client";

import { useState, useEffect, useCallback } from "react";

export interface SprechzettelEintrag {
  datum: string; // YYYY-MM-DD
  stunden: number;
  baustelle: string;
  taetigkeit: string;
  updatedAt: string; // ISO timestamp
}

const STORAGE_KEY = "zb_sprechzettel";

function isValidEintrag(e: unknown): e is SprechzettelEintrag {
  if (!e || typeof e !== "object") return false;
  const eintrag = e as Record<string, unknown>;
  return (
    typeof eintrag.datum === "string" &&
    typeof eintrag.stunden === "number" &&
    typeof eintrag.baustelle === "string" &&
    typeof eintrag.taetigkeit === "string" &&
    typeof eintrag.updatedAt === "string"
  );
}

function laden(): SprechzettelEintrag[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isValidEintrag);
  } catch {
    return [];
  }
}

function speichern(eintraege: SprechzettelEintrag[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(eintraege));
  } catch (e) {
    console.error("[use-sprechzettel] Speichern fehlgeschlagen:", e);
  }
}

export function useSprechzettel() {
  const [eintraege, setEintraege] = useState<SprechzettelEintrag[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setEintraege(laden());
    setIsLoaded(true);
  }, []);

  const persist = useCallback((updated: SprechzettelEintrag[]) => {
    const sortiert = [...updated].sort((a, b) => b.datum.localeCompare(a.datum));
    setEintraege(sortiert);
    speichern(sortiert);
  }, []);

  /** Speichert einen Eintrag; überschreibt einen bestehenden Eintrag mit gleichem Datum. */
  const speichereEintrag = useCallback(
    (eintrag: Omit<SprechzettelEintrag, "updatedAt">) => {
      const current = laden();
      const ohneAlten = current.filter((e) => e.datum !== eintrag.datum);
      persist([...ohneAlten, { ...eintrag, updatedAt: new Date().toISOString() }]);
    },
    [persist]
  );

  const loescheEintrag = useCallback(
    (datum: string) => {
      persist(laden().filter((e) => e.datum !== datum));
    },
    [persist]
  );

  const findeEintrag = useCallback(
    (datum: string): SprechzettelEintrag | undefined =>
      eintraege.find((e) => e.datum === datum),
    [eintraege]
  );

  return { eintraege, isLoaded, speichereEintrag, loescheEintrag, findeEintrag };
}
