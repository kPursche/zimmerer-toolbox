import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Multiple Lockfiles im System — explizit Projekt-Wurzel setzen
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
