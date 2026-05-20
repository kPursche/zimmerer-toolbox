import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { BackLink } from "@/components/back-link";
import { PageHeader } from "@/components/page-header";
import { WhatsNext } from "@/components/whats-next";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TOOLS, getToolBySlug } from "@/lib/tools";
import { GauenwangenTool } from "@/components/tools/gauenwangen";
import { LatteneinteilungTool } from "@/components/tools/latteneinteilung";
import { BodenDeckelschaulungTool } from "@/components/tools/boden-deckelschalung";
import { DachausmittlungTool } from "@/components/tools/dach-ausmittlung";

interface ToolPageProps {
  params: Promise<{ slug: string }>;
}

/**
 * Statische Routen für alle bekannten Tools generieren.
 * Unbekannte Slugs landen auf 404 (siehe notFound() unten).
 */
export function generateStaticParams() {
  return TOOLS.map((tool) => ({ slug: tool.slug }));
}

export async function generateMetadata({
  params,
}: ToolPageProps): Promise<Metadata> {
  const { slug } = await params;
  const tool = getToolBySlug(slug);

  if (!tool) {
    return { title: "Werkzeug nicht gefunden" };
  }

  return {
    title: tool.name,
    description: tool.description,
  };
}

export default async function ToolPage({ params }: ToolPageProps) {
  const { slug } = await params;
  const tool = getToolBySlug(slug);

  if (!tool) {
    notFound();
  }

  const Icon = tool.icon;
  const isAvailable = tool.status === "available";

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
      <BackLink className="mb-6" />

      <div className="mb-8 flex items-start gap-4">
        <div
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-oak-alpha text-oak"
          aria-hidden="true"
        >
          <Icon className="h-6 w-6" />
        </div>
        <div className="flex-1">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <Badge variant={isAvailable ? "success" : "info"}>
              {isAvailable ? "Verfügbar" : "Kommt bald"}
            </Badge>
            <span className="text-label text-mu">{tool.category}</span>
          </div>
          <PageHeader title={tool.name} description={tool.description} />
        </div>
      </div>

      {tool.whatsNext?.length ? (
        <div className="mb-6">
          <WhatsNext items={tool.whatsNext} />
        </div>
      ) : null}

      {slug === "gauenwangen" ? (
        <GauenwangenTool />
      ) : slug === "latteneinteilung" ? (
        <LatteneinteilungTool />
      ) : slug === "boden-deckelschalung" ? (
        <BodenDeckelschaulungTool />
      ) : slug === "dachausmittlung" ? (
        <DachausmittlungTool />
      ) : (
        <Card className="border-dashed bg-s1/60">
          <CardHeader>
            <CardTitle className="text-tx">
              {isAvailable ? "Tool-Inhalt folgt" : "Dieses Werkzeug ist noch in Vorbereitung"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-mu">
            <p>
              Die App-Shell und das Routing stehen. Die eigentliche Eingabemaske
              und Berechnung wird in einem späteren Feature-Ticket implementiert.
            </p>
            <p>
              Tool-Slug: <code className="rounded-sm bg-s2 px-1.5 py-0.5 text-tx">{tool.slug}</code>
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
