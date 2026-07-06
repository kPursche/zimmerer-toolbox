"use client";

import { useEffect } from "react";

// Registriert den Service Worker (public/sw.js) — nur im Production-Build,
// damit der Dev-Server (HMR/Turbopack) nicht mit gecachten Antworten kollidiert.
export function SwRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch((err) => {
      console.warn("[sw] Registrierung fehlgeschlagen:", err);
    });
  }, []);

  return null;
}
