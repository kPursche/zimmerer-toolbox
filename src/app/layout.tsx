import type { Metadata, Viewport } from "next";

import { TopNavigation } from "@/components/top-navigation";
import { ChatFab } from "@/components/chat-fab";
import { SwRegister } from "@/components/sw-register";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Zimmerer-Toolbox",
    template: "%s — Zimmerer-Toolbox",
  },
  description:
    "Modulare Web-App für Zimmerer: schnelle Berechnungen für Dach, Holz und Baustelle.",
  applicationName: "Zimmerer-Toolbox",
  // PWA (PROJ-7): Icons + iOS-Web-App-Modus; Manifest kommt aus app/manifest.ts
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Zimmerer-Toolbox",
  },
};

export const viewport: Viewport = {
  themeColor: "#0f0d0a",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover", // Notch-Handling im Standalone-Modus
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
        <ChatFab />
        <SwRegister />
      </body>
    </html>
  );
}
