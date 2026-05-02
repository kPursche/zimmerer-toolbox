import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { cn } from "@/lib/utils";

interface BackLinkProps {
  href?: string;
  label?: string;
  className?: string;
}

/**
 * BackLink — wird auf jeder Tool-Seite über dem Inhalt angezeigt,
 * damit Nutzer schnell zurück zum Dashboard kommen.
 */
export function BackLink({
  href = "/",
  label = "Zurück zur Übersicht",
  className,
}: BackLinkProps) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center gap-1.5 text-sm text-mu transition-colors hover:text-oak focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-oak focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        className
      )}
    >
      <ArrowLeft className="h-4 w-4" />
      {label}
    </Link>
  );
}
