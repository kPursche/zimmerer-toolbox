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
  Car,
  Columns2,
  Home,
  type LucideIcon,
  Layers,
  Ruler,
  Scroll,
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
  whatsNext?: string[];
}

export const TOOLS: Tool[] = [
  {
    slug: "gauenwangen",
    name: "Gaubenwangen aufdoppeln",
    description:
      "Berechnung der Schnittwinkel und Maße für Gaubenwangen aus Dachneigung und Wangenhöhe.",
    icon: Triangle,
    status: "available",
    category: "Dach",
    whatsNext: [
      "Zuschnittplan für Platten an der Wange.",
    ],
  },
  {
    slug: "latteneinteilung",
    name: "Latten- und Pfanneneinteilung",
    description:
      "Optimale Lattenweite für gegebene Sparrenlänge und Ziegeldeckmaß.",
    icon: Ruler,
    status: "available",
    category: "Dach",
    whatsNext: [
      "Erlus, Jacobi & Koramic: technische Daten werden übertragen.",
      "Automatische Materialliste.",
      "Weitere Dachformen.",
    ],
  },
  {
    slug: "boden-deckelschalung",
    name: "Boden-Deckelschalung",
    description:
      "Einteilung der Boden- und Deckbretter für eine gleichmäßige Schalung aus Gesamtbreite und Brettmaßen.",
    icon: Columns2,
    status: "available",
    category: "Holz",
  },
  {
    slug: "dachausmittlung",
    name: "Dachausmittlung",
    description:
      "Grundriss mit dem Finger zeichnen, Kanten als Traufe/Walm/Giebel beschriften und First, Grate, Sparrenlängen in mm berechnen.",
    icon: Home,
    status: "coming-soon",
    category: "Dach",
    whatsNext: [
      "Touch-Zeichenfläche mit Glättung",
      "Pro Kante eigene Neigung",
      "Speichern in localStorage",
      "L-/T-förmige Grundrisse mit Kehlen",
    ],
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
    slug: "carportplaner",
    name: "Carportplaner",
    description:
      "Maße, Sparren- und Stützenplan für einen Carport aus Grundfläche und Dachneigung.",
    icon: Car,
    status: "coming-soon",
    category: "Allgemein",
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
  {
    slug: "richtspruchgenerator",
    name: "Richtspruchgenerator",
    description:
      "Klassische und moderne Richtsprüche für das Richtfest — passend zum Anlass.",
    icon: Scroll,
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
