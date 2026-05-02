import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-4 py-10 text-center sm:px-6 lg:px-8">
      <p className="text-label text-oak">Fehler 404</p>
      <h1 className="mt-3 text-2xl font-extrabold text-tx sm:text-3xl">
        Seite nicht gefunden
      </h1>
      <p className="mt-3 text-sm text-mu">
        Diese Seite existiert nicht oder das Werkzeug wurde noch nicht angelegt.
      </p>
      <Button asChild className="mt-6">
        <Link href="/">Zurück zur Übersicht</Link>
      </Button>
    </div>
  );
}
