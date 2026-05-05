import type { Metadata, Viewport } from "next";

import { TopNavigation } from "@/components/top-navigation";
import { FeedbackWidget } from "@/components/feedback-widget";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Zimmerer-Toolbox",
    template: "%s — Zimmerer-Toolbox",
  },
  description:
    "Modulare Web-App für Zimmerer: schnelle Berechnungen für Dach, Holz und Baustelle.",
  applicationName: "Zimmerer-Toolbox",
};

export const viewport: Viewport = {
  themeColor: "#0f0d0a",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de" suppressHydrationWarning>
      <body className="min-h-screen bg-bg text-tx antialiased">
        <div className="flex min-h-screen flex-col">
          <TopNavigation />
          <main className="flex-1">{children}</main>
        </div>
        <FeedbackWidget />
      </body>
    </html>
  );
}
