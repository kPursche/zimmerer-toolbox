import { ToolKachel } from "@/components/tool-kachel";
import type { Tool } from "@/lib/tools";

interface ToolGridProps {
  tools: Tool[];
}

/**
 * ToolGrid — responsives Grid für die Tool-Kacheln.
 * Mobile: 1 Spalte, Tablet: 2 Spalten, Desktop: 3 Spalten.
 *
 * Wenn keine Tools vorhanden sind, wird ein Empty-State angezeigt.
 */
export function ToolGrid({ tools }: ToolGridProps) {
  if (tools.length === 0) {
    return (
      <div
        role="status"
        className="rounded-lg border border-dashed border-border bg-s1/50 p-12 text-center"
      >
        <p className="text-tx">Noch keine Werkzeuge in der Toolbox.</p>
        <p className="mt-2 text-sm text-mu">
          Die ersten Tools erscheinen hier, sobald sie freigeschaltet sind.
        </p>
      </div>
    );
  }

  return (
    <div
      role="list"
      aria-label="Verfügbare Werkzeuge"
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
    >
      {tools.map((tool) => (
        <div key={tool.slug} role="listitem">
          <ToolKachel tool={tool} />
        </div>
      ))}
    </div>
  );
}
