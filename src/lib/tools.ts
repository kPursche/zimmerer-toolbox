/**
 * Tool-Registry für die Zimmerer-Toolbox.
 *
 * Diese statische Liste ist die EINZIGE Stelle, an der ein neues Tool
 * registriert werden muss. Die Dashboard-Kacheln und die dynamische Route
 * `/tools/[slug]` werden automatisch daraus generiert.
 *
 * Wenn ein neues Tool hinzukommt:
 * 1. Eintrag hier ergänzen (status: "coming-soon")
 * 2. Tool-spezifische Komponente unter `src/components/tools/<slug>.tsx` anlegen
 * 3. In `src/app/tools/[slug]/page.tsx` das Tool laden, sobald fertig
 * 4. Status auf "available" setzen
 */

import {
  Calculator,
  type LucideIcon,
  Layers,
  Ruler,
  Triangle,
} from "lucide-react";

export type ToolStatus = "available" | "coming-soon";
export type ToolCategory = "Dach" | "Holz" | "Allgemein";

export interface Tool {
  slug: string;
  name: string;
  description: string;
  icon: LucideIcon;
  status: ToolStatus;
  category: ToolCategory;
}

export const TOOLS: Tool[] = [
  {
    slug: "gauenwangen",
    name: "Gauenwangen aufdoppeln",
    description:
      "Berechnung der Schnittwinkel und Maße für Gauenwangen aus Dachneigung und Wangenhöhe.",
    icon: Triangle,
    status: "available",
    category: "Dach",
  },
  {
    slug: "latteneinteilung",
    name: "Latten- und Pfanneneinteilung",
    description:
      "Optimale Lattenweite für gegebene Sparrenlänge und Ziegeldeckmaß.",
    icon: Ruler,
    status: "coming-soon",
    category: "Dach",
  },
  {
    slug: "plattenschmiegen",
    name: "Plattenschmiegen Kehle/Grat",
    description:
      "Längs- und Querschmiege für Platten in Kehle oder Grat aus zwei Dachneigungen.",
    icon: Layers,
    status: "coming-soon",
    category: "Dach",
  },
  {
    slug: "rechner",
    name: "Universalrechner",
    description:
      "Klassischer Taschenrechner mit Winkel- und Trigonometriefunktionen.",
    icon: Calculator,
    status: "coming-soon",
    category: "Allgemein",
  },
];

export function getToolBySlug(slug: string): Tool | undefined {
  return TOOLS.find((tool) => tool.slug === slug);
}

export function getAvailableTools(): Tool[] {
  return TOOLS.filter((tool) => tool.status === "available");
}
