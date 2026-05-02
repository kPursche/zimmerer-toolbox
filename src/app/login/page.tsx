import type { Metadata } from "next";

import { BackLink } from "@/components/back-link";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Anmelden",
  description: "Anmelden bei der Zimmerer-Toolbox.",
};

/**
 * Login-Platzhalter.
 * Die echte Anmeldung mit Supabase wird in PROJ-2 implementiert.
 */
export default function LoginPage() {
  return (
    <div className="mx-auto w-full max-w-md px-4 py-10 sm:px-6 lg:px-8">
      <BackLink className="mb-6" />
      <PageHeader
        title="Anmelden"
        description="Mit einem Account speicherst du deine Berechnungen in der Cloud."
        className="mb-8"
      />
      <Card>
        <CardHeader>
          <CardTitle className="text-tx">Bald verfügbar</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-mu">
          <p>
            Die Anmeldung wird in PROJ-2 freigeschaltet. Bis dahin kannst du
            alle Werkzeuge ohne Login nutzen — die Ergebnisse erscheinen direkt
            auf der jeweiligen Seite.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
