import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { Tool } from "@/lib/tools";
import { cn } from "@/lib/utils";

interface ToolKachelProps {
  tool: Tool;
}

/**
 * ToolKachel — eine einzelne Kachel auf dem Dashboard.
 * Verfügbare Tools sind klickbar, "coming-soon"-Tools sind ausgegraut.
 */
export function ToolKachel({ tool }: ToolKachelProps) {
  const Icon = tool.icon;
  const isAvailable = tool.status === "available";

  const cardContent = (
    <Card
      className={cn(
        "group relative h-full overflow-hidden border-border bg-s1 transition-all",
        isAvailable
          ? "hover:-translate-y-0.5 hover:border-oak/40 hover:shadow-cta"
          : "opacity-60"
      )}
    >
      <CardHeader className="space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div
            className={cn(
              "flex h-11 w-11 items-center justify-center rounded-md",
              isAvailable
                ? "bg-oak-alpha text-oak"
                : "bg-s2 text-mu"
            )}
            aria-hidden="true"
          >
            <Icon className="h-5 w-5" />
          </div>

          {!isAvailable && (
            <Badge variant="info" className="shrink-0">
              Kommt bald
            </Badge>
          )}
          {isAvailable && (
            <Badge variant="success" className="shrink-0">
              Verfügbar
            </Badge>
          )}
        </div>

        <div className="space-y-1.5">
          <CardTitle className="text-base text-tx">{tool.name}</CardTitle>
          <CardDescription className="text-sm leading-relaxed">
            {tool.description}
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent>
        <span
          className={cn(
            "text-label",
            isAvailable ? "text-oak" : "text-dm"
          )}
        >
          {tool.category}
        </span>
      </CardContent>
    </Card>
  );

  if (!isAvailable) {
    return (
      <div
        aria-disabled="true"
        aria-label={`${tool.name} — kommt bald, noch nicht verfügbar`}
        className="cursor-not-allowed"
      >
        {cardContent}
      </div>
    );
  }

  return (
    <Link
      href={`/tools/${tool.slug}`}
      aria-label={`${tool.name} öffnen`}
      className="block h-full rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-oak focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      {cardContent}
    </Link>
  );
}
