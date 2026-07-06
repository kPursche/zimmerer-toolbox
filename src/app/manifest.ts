import type { MetadataRoute } from "next";

// PWA-Manifest (PROJ-7) — Next.js liefert das automatisch als
// /manifest.webmanifest aus und verlinkt es im <head>.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Zimmerer-Toolbox",
    short_name: "Zimmerer",
    description:
      "Schnelle Zimmerer-Berechnungen für die Baustelle — funktioniert auch offline.",
    id: "/",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    lang: "de",
    background_color: "#0f0d0a",
    theme_color: "#0f0d0a",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
