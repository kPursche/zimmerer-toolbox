import { PageHeader } from "@/components/page-header";
import { ToolGrid } from "@/components/tool-grid";
import { TOOLS } from "@/lib/tools";

export default function DashboardPage() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-12">
      <PageHeader
        title="Deine Werkzeugkiste"
        description="Wähle ein Werkzeug aus, um eine Berechnung zu starten. Alle Tools funktionieren ohne Anmeldung — Ergebnisse speichern kannst du später mit einem Account."
        className="mb-8 sm:mb-10"
      />
      <ToolGrid tools={TOOLS} />
    </div>
  );
}
