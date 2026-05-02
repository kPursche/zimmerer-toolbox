import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "1.5rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        // Zimmerer-Toolbox Design-Tokens (Holz-Thematik)
        bg: "#0f0d0a",
        s1: "#1a1814",
        s2: "#242018",
        s3: "#2e2a1e",
        oak: {
          DEFAULT: "#c9924a",
          alpha: "rgba(201,146,74,0.14)",
        },
        pine: {
          DEFAULT: "#7fb87a",
          alpha: "rgba(127,184,122,0.13)",
        },
        steel: {
          DEFAULT: "#6fa8d4",
          alpha: "rgba(111,168,212,0.13)",
        },
        tx: "#ede5d0",
        mu: "#8a8070",
        dm: "#504840",

        // shadcn/ui-Mapping (auf unsere Holz-Tokens)
        border: "rgba(255,255,255,0.07)",
        input: "#242018",
        ring: "#c9924a",
        background: "#0f0d0a",
        foreground: "#ede5d0",
        primary: {
          DEFAULT: "#c9924a",
          foreground: "#1a0800",
        },
        secondary: {
          DEFAULT: "#242018",
          foreground: "#ede5d0",
        },
        destructive: {
          DEFAULT: "#d47070",
          foreground: "#ede5d0",
        },
        muted: {
          DEFAULT: "#1a1814",
          foreground: "#8a8070",
        },
        accent: {
          DEFAULT: "#2e2a1e",
          foreground: "#ede5d0",
        },
        popover: {
          DEFAULT: "#1a1814",
          foreground: "#ede5d0",
        },
        card: {
          DEFAULT: "#1a1814",
          foreground: "#ede5d0",
        },
      },
      borderRadius: {
        lg: "12px",
        md: "9px",
        sm: "7px",
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
      },
      boxShadow: {
        card: "0 5px 18px rgba(0,0,0,0.25)",
        cta: "0 2px 10px rgba(201,146,74,0.3)",
        "cta-hover": "0 4px 16px rgba(201,146,74,0.4)",
      },
      backgroundImage: {
        "oak-gradient": "linear-gradient(145deg, #d4a44f, #9a6828)",
        "avatar-gradient": "linear-gradient(135deg, #c9924a, #7a4a1a)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
