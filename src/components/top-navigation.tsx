"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Hammer, LogIn } from "lucide-react";

import { Button } from "@/components/ui/button";
import { getToolBySlug } from "@/lib/tools";
import { cn } from "@/lib/utils";

/**
 * TopNavigation — sichtbar auf jeder Seite.
 * Zeigt Logo, Breadcrumb (außer auf Dashboard) und einen Auth-Platzhalter.
 * Der Auth-Button wird in PROJ-2 mit echter Supabase-Logik verdrahtet.
 */
export function TopNavigation() {
  const pathname = usePathname();
  const isDashboard = pathname === "/";

  // Breadcrumb-Inhalt aus Pathname ableiten
  const breadcrumb = (() => {
    if (isDashboard) return null;
    if (pathname.startsWith("/tools/")) {
      const slug = pathname.split("/")[2];
      const tool = slug ? getToolBySlug(slug) : undefined;
      return tool?.name ?? "Tool";
    }
    if (pathname === "/login") return "Anmelden";
    return null;
  })();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-bg/85 backdrop-blur supports-[backdrop-filter]:bg-bg/70">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-2 transition-opacity hover:opacity-80"
          aria-label="Zur Startseite"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-oak-gradient shadow-cta">
            <Hammer className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="text-base font-extrabold tracking-tight text-tx sm:text-lg">
            Zimmerer-Toolbox
          </span>
        </Link>

        {/* Breadcrumb */}
        {breadcrumb && (
          <nav
            aria-label="Breadcrumb"
            className="hidden items-center gap-1 text-sm text-mu sm:flex"
          >
            <ChevronRight className="h-4 w-4" />
            <span
              aria-current="page"
              className={cn("text-tx", "max-w-[40ch] truncate")}
            >
              {breadcrumb}
            </span>
          </nav>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Auth-Platzhalter (PROJ-2 verdrahtet das mit Supabase) */}
        <Button
          asChild
          variant="ghost"
          size="sm"
          aria-label="Anmelden — wird in PROJ-2 aktiviert"
        >
          <Link href="/login">
            <LogIn className="h-4 w-4" />
            <span className="hidden sm:inline">Anmelden</span>
          </Link>
        </Button>
      </div>
    </header>
  );
}
