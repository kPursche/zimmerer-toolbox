"use client";

import { useEffect } from "react";

import { Button } from "@/components/ui/button";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Hier könnte später Sentry o.ä. eingehängt werden.
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[50vh] max-w-md flex-col items-center justify-center px-4 py-10 text-center sm:px-6 lg:px-8">
      <p className="text-label text-destructive">Etwas ist schiefgelaufen</p>
      <h1 className="mt-3 text-2xl font-extrabold text-tx sm:text-3xl">
        Unerwarteter Fehler
      </h1>
      <p className="mt-3 text-sm text-mu">
        Bitte versuche es erneut. Wenn das Problem bestehen bleibt, lade die
        Seite neu.
      </p>
      <Button onClick={reset} className="mt-6">
        Nochmal versuchen
      </Button>
    </div>
  );
}
