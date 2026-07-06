"use client";

import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";

// Zeigt in der Navigation an, wenn keine Verbindung besteht.
// Die Rechner laufen komplett lokal — die App bleibt offline nutzbar.
export function OfflineBadge() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    setOffline(!navigator.onLine);
    const on = () => setOffline(false);
    const off = () => setOffline(true);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  if (!offline) return null;

  return (
    <span
      role="status"
      title="Keine Internetverbindung — die Rechner funktionieren weiter"
      className="flex items-center gap-1.5 rounded-full border border-oak/40 bg-oak-alpha px-2.5 py-1 text-xs font-medium text-oak"
    >
      <WifiOff className="h-3.5 w-3.5" />
      <span className="hidden sm:inline">Offline</span>
    </span>
  );
}
