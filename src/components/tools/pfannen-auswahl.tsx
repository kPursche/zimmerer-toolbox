"use client";

import { useState } from "react";
import { FileText } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface Hersteller {
  id: string;
  name: string;
  active: boolean;
}

export interface LafEintrag {
  bis_grad: number; // gilt bis einschließlich dieser Dachneigung
  laf: number;      // LAF in mm
}

export interface Modell {
  id: string;
  name: string;
  active: boolean;
  pdf_url: string | null;
  la_min?: number;      // Mindest-Lattenabstand in mm
  la_max?: number;      // Höchst-Lattenabstand in mm
  put_min?: number;     // min Plattenüberstand in mm
  put_max?: number;     // max Plattenüberstand in mm
  put_default?: number; // Vorgabe-PÜT (wenn nicht = Mitte aus put_min/put_max)
  lat_base?: number;    // LAT = lat_base − PÜT
  laf_table?: LafEintrag[];                           // einheitliche LAF-Tabelle
  laf_tables?: { [lattung: string]: LafEintrag[] };   // lattungsabhängige LAF-Tabellen
}

const HERSTELLER: Hersteller[] = [
  { id: "braas",        name: "Braas",        active: true  },
  { id: "creaton",      name: "Creaton",      active: true  },
  { id: "erlus",        name: "Erlus",        active: true  },
  { id: "jacobi",       name: "Jacobi",       active: true  },
  { id: "ludowici",     name: "Ludowici",     active: false },
  { id: "nelskamp",     name: "Nelskamp",     active: true  },
  { id: "rathscheck",   name: "Rathscheck",   active: false },
  { id: "roeben",       name: "Röben",        active: true  },
  { id: "tondach",      name: "Tondach",      active: false },
  { id: "wienerberger", name: "Koramic",      active: true  },
];

const BRAAS_MODELLE: Modell[] = [
  // Dachsteine (Beton) – LAF fest 40 mm
  { id: "frankfurter-pfanne", name: "Frankfurter Pfanne", active: true, pdf_url: "/pdfs/braas-frankfurter-pfanne.pdf",
    la_min: 312, la_max: 345, put_min: 0, put_max: 80, lat_base: 400,
    laf_table: [{ bis_grad: 90, laf: 40 }],
  },
  { id: "tegalit", name: "Tegalit", active: true, pdf_url: "/pdfs/braas-tegalit.pdf",
    la_min: 312, la_max: 340, put_min: 0, put_max: 80, lat_base: 400,
    laf_table: [{ bis_grad: 90, laf: 40 }],
  },
  { id: "taunus-pfanne", name: "Taunus Pfanne", active: true, pdf_url: "/pdfs/braas-taunus-pfanne.pdf",
    la_min: 312, la_max: 345, put_min: 0, put_max: 80, lat_base: 400,
    laf_table: [{ bis_grad: 90, laf: 40 }],
  },
  { id: "doppel-s", name: "Doppel-S", active: true, pdf_url: "/pdfs/braas-doppel-s.pdf",
    la_min: 312, la_max: 345, put_min: 0, put_max: 80, lat_base: 400,
    laf_table: [{ bis_grad: 90, laf: 40 }],
  },
  { id: "harzer-pfanne", name: "Harzer Pfanne", active: true, pdf_url: "/pdfs/braas-harzer-pfanne.pdf",
    la_min: 312, la_max: 345, put_min: 0, put_max: 80, lat_base: 400,
    laf_table: [{ bis_grad: 90, laf: 40 }],
  },
  { id: "harzer-pfanne-7", name: "Harzer Pfanne 7", active: true, pdf_url: "/pdfs/braas-harzer-pfanne-7.pdf",
    la_min: 372, la_max: 405, put_min: 0, put_max: 80, lat_base: 460,
    laf_table: [{ bis_grad: 90, laf: 40 }],
  },
  { id: "harzer-pfanne-fp", name: "Harzer Pfanne F+", active: true, pdf_url: "/pdfs/braas-harzer-pfanne-fp.pdf",
    la_min: 365, la_max: 375, put_min: 0, put_max: 80, lat_base: 460,
    laf_table: [{ bis_grad: 90, laf: 40 }],
  },
  // Dachziegel (Ton)
  { id: "rubin-9v", name: "Rubin 9V", active: true, pdf_url: "/pdfs/braas-rubin-9v.pdf",
    la_min: 370, la_max: 400, put_min: 0, put_max: 80, lat_base: 430,
    laf_table: [
      { bis_grad: 30, laf: 40 },
      { bis_grad: 45, laf: 30 },
      { bis_grad: 90, laf: 20 },
    ],
  },
  { id: "rubin-11v", name: "Rubin 11V", active: true, pdf_url: "/pdfs/braas-rubin-11v.pdf",
    la_min: 338, la_max: 373, put_min: 0, put_max: 80, lat_base: 403,
    laf_table: [
      { bis_grad: 30, laf: 40 },
      { bis_grad: 45, laf: 30 },
      { bis_grad: 90, laf: 20 },
    ],
  },
  // Rubin 13V: PÜT/LAT-Werte nicht als Text im PDF, daher ohne lat_base
  { id: "rubin-13v", name: "Rubin 13V", active: true, pdf_url: "/pdfs/braas-rubin-13v.pdf",
    la_min: 330, la_max: 360,
    laf_table: [
      { bis_grad: 30, laf: 40 },
      { bis_grad: 45, laf: 30 },
      { bis_grad: 90, laf: 20 },
    ],
  },
  { id: "rubin-15v", name: "Rubin 15V", active: true, pdf_url: "/pdfs/braas-rubin-15v.pdf",
    la_min: 330, la_max: 350, put_min: 0, put_max: 80, lat_base: 405,
    laf_table: [
      { bis_grad: 30, laf: 40 },
      { bis_grad: 45, laf: 30 },
      { bis_grad: 90, laf: 20 },
    ],
  },
  { id: "achat-12v", name: "Achat 12V", active: true, pdf_url: "/pdfs/braas-achat-12v.pdf",
    la_min: 330, la_max: 360, put_min: 0, put_max: 80, lat_base: 410,
    laf_table: [
      { bis_grad: 10, laf: 50 },
      { bis_grad: 20, laf: 40 },
      { bis_grad: 30, laf: 35 },
      { bis_grad: 40, laf: 30 },
      { bis_grad: 50, laf: 25 },
      { bis_grad: 90, laf: 25 },
    ],
  },
  { id: "achat-14", name: "Achat 14 Geradschnitt", active: true, pdf_url: "/pdfs/braas-achat-14.pdf",
    la_min: 334, la_max: 356, put_min: 0, put_max: 80, lat_base: 414,
    laf_table: [
      { bis_grad: 30, laf: 40 },
      { bis_grad: 45, laf: 35 },
      { bis_grad: 90, laf: 30 },
    ],
  },
  { id: "granat-11v", name: "Granat 11V", active: true, pdf_url: "/pdfs/braas-granat-11v.pdf",
    la_min: 338, la_max: 380, put_min: 0, put_max: 80, lat_base: 415,
    laf_table: [
      { bis_grad: 30, laf: 45 },
      { bis_grad: 45, laf: 35 },
      { bis_grad: 90, laf: 25 },
    ],
  },
  { id: "granat-13v", name: "Granat 13V", active: true, pdf_url: "/pdfs/braas-granat-13v.pdf",
    la_min: 330, la_max: 360, put_min: 0, put_max: 80, lat_base: 400,
    laf_table: [
      { bis_grad: 30, laf: 40 },
      { bis_grad: 45, laf: 30 },
      { bis_grad: 90, laf: 20 },
    ],
  },
  { id: "granat-15", name: "Granat 15", active: true, pdf_url: "/pdfs/braas-granat-15.pdf",
    la_min: 338, la_max: 350, put_min: 0, put_max: 80, lat_base: 380,
    laf_table: [
      { bis_grad: 30, laf: 40 },
      { bis_grad: 45, laf: 35 },
      { bis_grad: 90, laf: 30 },
    ],
  },
  { id: "topas-11v", name: "Topas 11V", active: true, pdf_url: "/pdfs/braas-topas-11v.pdf",
    la_min: 320, la_max: 380, put_min: 0, put_max: 80, lat_base: 415,
    laf_table: [
      { bis_grad: 30, laf: 45 },
      { bis_grad: 45, laf: 35 },
      { bis_grad: 90, laf: 25 },
    ],
  },
  { id: "topas-13v", name: "Topas 13V", active: true, pdf_url: "/pdfs/braas-topas-13v.pdf",
    la_min: 320, la_max: 360, put_min: 0, put_max: 80, lat_base: 390,
    laf_table: [
      { bis_grad: 30, laf: 40 },
      { bis_grad: 45, laf: 30 },
      { bis_grad: 90, laf: 20 },
    ],
  },
  { id: "topas-15v", name: "Topas 15V", active: true, pdf_url: "/pdfs/braas-topas-15v.pdf",
    la_min: 320, la_max: 350, put_min: 0, put_max: 80, lat_base: 365,
    laf_table: [
      { bis_grad: 29, laf: 45 },
      { bis_grad: 45, laf: 40 },
      { bis_grad: 90, laf: 30 },
    ],
  },
  // Biberschwanz – Opal (Doppeldeckung: LAT1 variabel, LAT2 = 120 mm fest)
  { id: "opal", name: "Opal", active: true, pdf_url: "/pdfs/braas-opal.pdf",
    la_min: 145, la_max: 165, put_min: 0, put_max: 40, lat_base: 215,
    laf_table: [
      { bis_grad: 30, laf: 100 },
      { bis_grad: 45, laf: 90 },
      { bis_grad: 90, laf: 75 },
    ],
  },
  { id: "opal-berliner", name: "Opal Berliner Biber", active: true, pdf_url: "/pdfs/braas-opal-berliner-biber.pdf",
    la_min: 145, la_max: 165, put_min: 0, put_max: 40, lat_base: 215,
    laf_table: [
      { bis_grad: 30, laf: 100 },
      { bis_grad: 45, laf: 90 },
      { bis_grad: 90, laf: 75 },
    ],
  },
  { id: "opal-kirchen", name: "Opal Kirchenbiber", active: true, pdf_url: "/pdfs/braas-opal-kirchenbiber.pdf",
    la_min: 145, la_max: 165, put_min: 0, put_max: 40, lat_base: 215,
    laf_table: [
      { bis_grad: 30, laf: 100 },
      { bis_grad: 45, laf: 90 },
      { bis_grad: 90, laf: 75 },
    ],
  },
  // Biberschwanz – Opal Turmbiber (LAT1 variabel, LAT2 = 155 mm fest)
  { id: "opal-turm", name: "Opal Turmbiber", active: true, pdf_url: "/pdfs/braas-opal-turmbiber.pdf",
    la_min: 145, la_max: 165, put_min: 0, put_max: 40, lat_base: 190,
    laf_table: [
      { bis_grad: 30, laf: 85 },
      { bis_grad: 45, laf: 80 },
      { bis_grad: 90, laf: 70 },
    ],
  },
  // Biberschwanz – Smaragd (LAT1 variabel, LAT2 = 180 mm fest)
  { id: "smaragd", name: "Smaragd", active: true, pdf_url: "/pdfs/braas-smaragd.pdf",
    la_min: 165, la_max: 185, put_min: 0, put_max: 80, lat_base: 260,
    laf_table: [
      { bis_grad: 16, laf: 50 },
      { bis_grad: 30, laf: 45 },
      { bis_grad: 45, laf: 40 },
      { bis_grad: 90, laf: 35 },
    ],
  },
  { id: "turmalin", name: "Turmalin", active: true, pdf_url: "/pdfs/braas-turmalin.pdf",
    la_min: 355, la_max: 380, put_min: 0, put_max: 80, lat_base: 445,
    laf_table: [
      { bis_grad: 30, laf: 45 },
      { bis_grad: 45, laf: 40 },
      { bis_grad: 90, laf: 35 },
    ],
  },
  { id: "saphir", name: "Saphir", active: true, pdf_url: "/pdfs/braas-saphir.pdf",
    la_min: 335, la_max: 345, put_min: 0, put_max: 80, lat_base: 405,
    laf_table: [
      { bis_grad: 30, laf: 45 },
      { bis_grad: 45, laf: 40 },
      { bis_grad: 90, laf: 30 },
    ],
  },
];

const CREATON_MODELLE: Modell[] = [
  // Flachdachziegel
  { id: "mz3", name: "MZ3", active: true, pdf_url: "/pdfs/creaton-mz3.pdf",
    la_min: 334, la_max: 360, put_min: 0, put_max: 80, put_default: 50, lat_base: 395,
    laf_tables: {
      "30x50": [
        { bis_grad: 10, laf: 65 }, { bis_grad: 15, laf: 60 }, { bis_grad: 20, laf: 55 },
        { bis_grad: 25, laf: 50 }, { bis_grad: 30, laf: 45 }, { bis_grad: 35, laf: 40 },
        { bis_grad: 40, laf: 35 }, { bis_grad: 45, laf: 25 }, { bis_grad: 50, laf: 15 },
        { bis_grad: 55, laf: 10 },
      ],
      "40x60": [
        { bis_grad: 10, laf: 65 }, { bis_grad: 15, laf: 60 }, { bis_grad: 20, laf: 55 },
        { bis_grad: 25, laf: 45 }, { bis_grad: 30, laf: 40 }, { bis_grad: 35, laf: 35 },
        { bis_grad: 40, laf: 30 }, { bis_grad: 45, laf: 15 }, { bis_grad: 50, laf: 5 },
      ],
      "50x50": [
        { bis_grad: 10, laf: 60 }, { bis_grad: 15, laf: 55 }, { bis_grad: 20, laf: 50 },
        { bis_grad: 25, laf: 40 }, { bis_grad: 30, laf: 35 }, { bis_grad: 35, laf: 25 },
        { bis_grad: 40, laf: 20 }, { bis_grad: 45, laf: 5 },
      ],
    },
  },
  { id: "mz3-klassik", name: "MZ3 Klassik", active: true, pdf_url: "/pdfs/creaton-mz3-klassik.pdf",
    la_min: 343, la_max: 358, put_min: 0, put_max: 80, put_default: 30, lat_base: 390,
    laf_tables: {
      "30x50": [
        { bis_grad: 10, laf: 45 }, { bis_grad: 15, laf: 45 }, { bis_grad: 20, laf: 40 },
        { bis_grad: 25, laf: 35 }, { bis_grad: 30, laf: 35 }, { bis_grad: 35, laf: 30 },
        { bis_grad: 40, laf: 25 }, { bis_grad: 45, laf: 20 }, { bis_grad: 50, laf: 15 },
        { bis_grad: 55, laf: 10 },
      ],
      "40x60": [
        { bis_grad: 10, laf: 45 }, { bis_grad: 15, laf: 45 }, { bis_grad: 20, laf: 40 },
        { bis_grad: 25, laf: 30 }, { bis_grad: 30, laf: 30 }, { bis_grad: 35, laf: 25 },
        { bis_grad: 40, laf: 20 }, { bis_grad: 45, laf: 10 },
      ],
      "50x50": [
        { bis_grad: 10, laf: 40 }, { bis_grad: 15, laf: 40 }, { bis_grad: 20, laf: 35 },
        { bis_grad: 25, laf: 25 }, { bis_grad: 30, laf: 25 }, { bis_grad: 35, laf: 15 },
        { bis_grad: 40, laf: 10 },
      ],
    },
  },
  // Glattziegel
  { id: "cantus", name: "Cantus", active: true, pdf_url: "/pdfs/creaton-cantus.pdf",
    la_min: 348, la_max: 384, put_min: 0, put_max: 80, put_default: 50, lat_base: 410,
    laf_tables: {
      "30x50": [
        { bis_grad: 10, laf: 60 }, { bis_grad: 15, laf: 55 }, { bis_grad: 20, laf: 55 },
        { bis_grad: 25, laf: 50 }, { bis_grad: 30, laf: 40 }, { bis_grad: 35, laf: 35 },
        { bis_grad: 40, laf: 30 }, { bis_grad: 45, laf: 20 }, { bis_grad: 50, laf: 15 },
        { bis_grad: 55, laf: 10 },
      ],
      "40x60": [
        { bis_grad: 10, laf: 60 }, { bis_grad: 15, laf: 55 }, { bis_grad: 20, laf: 55 },
        { bis_grad: 25, laf: 45 }, { bis_grad: 30, laf: 35 }, { bis_grad: 35, laf: 30 },
        { bis_grad: 40, laf: 25 }, { bis_grad: 45, laf: 10 }, { bis_grad: 50, laf: 5 },
      ],
    },
  },
  { id: "domino", name: "Domino", active: true, pdf_url: "/pdfs/creaton-domino.pdf",
    la_min: 343, la_max: 354, put_min: 0, put_max: 80, put_default: 50, lat_base: 400,
    laf_tables: {
      "30x50": [
        { bis_grad: 15, laf: 95 }, { bis_grad: 20, laf: 90 }, { bis_grad: 25, laf: 85 },
        { bis_grad: 30, laf: 85 }, { bis_grad: 35, laf: 85 }, { bis_grad: 40, laf: 85 },
        { bis_grad: 45, laf: 85 }, { bis_grad: 50, laf: 85 }, { bis_grad: 55, laf: 85 },
      ],
      "40x60": [
        { bis_grad: 15, laf: 95 }, { bis_grad: 20, laf: 90 }, { bis_grad: 25, laf: 80 },
        { bis_grad: 30, laf: 80 }, { bis_grad: 35, laf: 80 }, { bis_grad: 40, laf: 80 },
        { bis_grad: 45, laf: 75 }, { bis_grad: 50, laf: 70 }, { bis_grad: 55, laf: 70 },
      ],
      "50x50": [
        { bis_grad: 15, laf: 90 }, { bis_grad: 20, laf: 85 }, { bis_grad: 25, laf: 75 },
        { bis_grad: 30, laf: 75 }, { bis_grad: 35, laf: 70 }, { bis_grad: 40, laf: 70 },
        { bis_grad: 45, laf: 65 }, { bis_grad: 50, laf: 60 }, { bis_grad: 55, laf: 60 },
      ],
    },
  },
  { id: "mikado", name: "Mikado", active: true, pdf_url: "/pdfs/creaton-mikado.pdf",
    la_min: 343, la_max: 371, put_min: 0, put_max: 80, put_default: 45, lat_base: 415,
    laf_tables: {
      "30x50": [
        { bis_grad: 10, laf: 70 }, { bis_grad: 15, laf: 70 }, { bis_grad: 20, laf: 65 },
        { bis_grad: 25, laf: 60 }, { bis_grad: 30, laf: 55 }, { bis_grad: 35, laf: 50 },
        { bis_grad: 40, laf: 45 }, { bis_grad: 45, laf: 40 }, { bis_grad: 50, laf: 30 },
      ],
      "40x60": [
        { bis_grad: 10, laf: 70 }, { bis_grad: 15, laf: 70 }, { bis_grad: 20, laf: 65 },
        { bis_grad: 25, laf: 55 }, { bis_grad: 30, laf: 50 }, { bis_grad: 35, laf: 45 },
        { bis_grad: 40, laf: 40 }, { bis_grad: 45, laf: 30 }, { bis_grad: 50, laf: 15 },
      ],
      "50x50": [
        { bis_grad: 10, laf: 65 }, { bis_grad: 15, laf: 65 }, { bis_grad: 20, laf: 60 },
        { bis_grad: 25, laf: 50 }, { bis_grad: 30, laf: 45 }, { bis_grad: 35, laf: 35 },
        { bis_grad: 40, laf: 30 }, { bis_grad: 45, laf: 20 }, { bis_grad: 50, laf: 5 },
      ],
    },
  },
  // Reformziegel
  { id: "eleganz", name: "Eleganz", active: true, pdf_url: "/pdfs/creaton-eleganz.pdf",
    la_min: 337, la_max: 350, put_min: 0, put_max: 80, put_default: 45, lat_base: 375,
    laf_tables: {
      "30x50": [
        { bis_grad: 10, laf: 80 }, { bis_grad: 15, laf: 75 }, { bis_grad: 20, laf: 75 },
        { bis_grad: 25, laf: 70 }, { bis_grad: 30, laf: 65 }, { bis_grad: 35, laf: 60 },
        { bis_grad: 40, laf: 55 }, { bis_grad: 45, laf: 50 }, { bis_grad: 50, laf: 50 },
        { bis_grad: 55, laf: 45 },
      ],
      "40x60": [
        { bis_grad: 10, laf: 80 }, { bis_grad: 15, laf: 80 }, { bis_grad: 20, laf: 75 },
        { bis_grad: 25, laf: 65 }, { bis_grad: 30, laf: 60 }, { bis_grad: 35, laf: 55 },
        { bis_grad: 40, laf: 50 }, { bis_grad: 45, laf: 40 }, { bis_grad: 50, laf: 35 },
        { bis_grad: 55, laf: 30 },
      ],
      "50x50": [
        { bis_grad: 10, laf: 75 }, { bis_grad: 15, laf: 75 }, { bis_grad: 20, laf: 70 },
        { bis_grad: 25, laf: 60 }, { bis_grad: 30, laf: 55 }, { bis_grad: 35, laf: 45 },
        { bis_grad: 40, laf: 40 }, { bis_grad: 45, laf: 30 }, { bis_grad: 50, laf: 25 },
        { bis_grad: 55, laf: 20 },
      ],
    },
  },
  // Falzziegel
  { id: "futura", name: "Futura", active: true, pdf_url: "/pdfs/creaton-futura.pdf",
    la_min: 360, la_max: 388, put_min: 0, put_max: 80, put_default: 55, lat_base: 425,
    laf_tables: {
      "30x50": [
        { bis_grad: 10, laf: 80 }, { bis_grad: 15, laf: 80 }, { bis_grad: 20, laf: 75 },
        { bis_grad: 25, laf: 70 }, { bis_grad: 30, laf: 65 }, { bis_grad: 35, laf: 65 },
        { bis_grad: 40, laf: 60 }, { bis_grad: 45, laf: 50 }, { bis_grad: 50, laf: 45 },
        { bis_grad: 55, laf: 45 }, { bis_grad: 60, laf: 45 },
      ],
      "40x60": [
        { bis_grad: 10, laf: 80 }, { bis_grad: 15, laf: 80 }, { bis_grad: 20, laf: 75 },
        { bis_grad: 25, laf: 65 }, { bis_grad: 30, laf: 60 }, { bis_grad: 35, laf: 60 },
        { bis_grad: 40, laf: 55 }, { bis_grad: 45, laf: 40 }, { bis_grad: 50, laf: 30 },
        { bis_grad: 55, laf: 30 }, { bis_grad: 60, laf: 30 },
      ],
      "50x50": [
        { bis_grad: 10, laf: 75 }, { bis_grad: 15, laf: 75 }, { bis_grad: 20, laf: 70 },
        { bis_grad: 25, laf: 60 }, { bis_grad: 30, laf: 55 }, { bis_grad: 35, laf: 50 },
        { bis_grad: 40, laf: 45 }, { bis_grad: 45, laf: 30 }, { bis_grad: 50, laf: 20 },
        { bis_grad: 55, laf: 20 }, { bis_grad: 60, laf: 15 },
      ],
    },
  },
  { id: "profil", name: "Profil", active: true, pdf_url: "/pdfs/creaton-profil.pdf",
    la_min: 270, la_max: 300,
  },
  { id: "premion", name: "Premion", active: true, pdf_url: "/pdfs/creaton-premion.pdf",
    la_min: 357, la_max: 379, put_min: 0, put_max: 80, put_default: 50, lat_base: 410,
    laf_tables: {
      "30x50": [
        { bis_grad: 10, laf: 70 }, { bis_grad: 15, laf: 70 }, { bis_grad: 20, laf: 65 },
        { bis_grad: 25, laf: 60 }, { bis_grad: 30, laf: 60 }, { bis_grad: 35, laf: 55 },
        { bis_grad: 40, laf: 50 }, { bis_grad: 45, laf: 40 }, { bis_grad: 50, laf: 30 },
        { bis_grad: 55, laf: 20 },
      ],
      "40x60": [
        { bis_grad: 10, laf: 70 }, { bis_grad: 15, laf: 70 }, { bis_grad: 20, laf: 65 },
        { bis_grad: 25, laf: 55 }, { bis_grad: 30, laf: 55 }, { bis_grad: 35, laf: 50 },
        { bis_grad: 40, laf: 45 }, { bis_grad: 45, laf: 30 }, { bis_grad: 50, laf: 15 },
        { bis_grad: 55, laf: 5 },
      ],
      "50x50": [
        { bis_grad: 10, laf: 65 }, { bis_grad: 15, laf: 65 }, { bis_grad: 20, laf: 60 },
        { bis_grad: 25, laf: 50 }, { bis_grad: 30, laf: 50 }, { bis_grad: 35, laf: 40 },
        { bis_grad: 40, laf: 35 }, { bis_grad: 45, laf: 20 }, { bis_grad: 50, laf: 5 },
      ],
    },
  },
  { id: "ratio", name: "Ratio", active: true, pdf_url: "/pdfs/creaton-ratio.pdf",
    la_min: 357, la_max: 380, put_min: 0, put_max: 80, lat_base: 410,
    laf_tables: {
      "30x50": [
        { bis_grad: 15, laf: 60 }, { bis_grad: 20, laf: 55 }, { bis_grad: 25, laf: 50 },
        { bis_grad: 30, laf: 50 }, { bis_grad: 35, laf: 45 }, { bis_grad: 40, laf: 45 },
        { bis_grad: 45, laf: 40 }, { bis_grad: 50, laf: 30 },
      ],
      "40x60": [
        { bis_grad: 15, laf: 60 }, { bis_grad: 20, laf: 55 }, { bis_grad: 25, laf: 45 },
        { bis_grad: 30, laf: 45 }, { bis_grad: 35, laf: 40 }, { bis_grad: 40, laf: 40 },
        { bis_grad: 45, laf: 30 }, { bis_grad: 50, laf: 15 },
      ],
      "50x50": [
        { bis_grad: 15, laf: 55 }, { bis_grad: 20, laf: 50 }, { bis_grad: 25, laf: 40 },
        { bis_grad: 30, laf: 40 }, { bis_grad: 35, laf: 30 }, { bis_grad: 40, laf: 30 },
        { bis_grad: 45, laf: 20 }, { bis_grad: 50, laf: 5 },
      ],
    },
  },
  { id: "magnum", name: "Magnum", active: true, pdf_url: null },
  { id: "maxima-pro", name: "Maxima Pro", active: true, pdf_url: "/pdfs/creaton-maxima-pro.pdf",
    la_min: 310, la_max: 350, put_min: 0, put_max: 80, lat_base: 375,
    laf_tables: {
      "30x50": [
        { bis_grad: 10, laf: 115 }, { bis_grad: 15, laf: 110 }, { bis_grad: 20, laf: 100 },
        { bis_grad: 25, laf: 100 }, { bis_grad: 30, laf: 100 }, { bis_grad: 35, laf: 100 },
        { bis_grad: 40, laf: 100 }, { bis_grad: 45, laf: 100 }, { bis_grad: 50, laf: 105 },
        { bis_grad: 55, laf: 110 }, { bis_grad: 60, laf: 110 },
      ],
      "40x60": [
        { bis_grad: 10, laf: 115 }, { bis_grad: 15, laf: 110 }, { bis_grad: 20, laf: 100 },
        { bis_grad: 25, laf: 95 }, { bis_grad: 30, laf: 95 }, { bis_grad: 35, laf: 95 },
        { bis_grad: 40, laf: 95 }, { bis_grad: 45, laf: 90 }, { bis_grad: 50, laf: 90 },
        { bis_grad: 55, laf: 95 }, { bis_grad: 60, laf: 95 },
      ],
      "50x50": [
        { bis_grad: 10, laf: 110 }, { bis_grad: 15, laf: 105 }, { bis_grad: 20, laf: 95 },
        { bis_grad: 25, laf: 90 }, { bis_grad: 30, laf: 90 }, { bis_grad: 35, laf: 85 },
        { bis_grad: 40, laf: 85 }, { bis_grad: 45, laf: 80 }, { bis_grad: 50, laf: 80 },
        { bis_grad: 55, laf: 85 }, { bis_grad: 60, laf: 85 },
      ],
    },
  },
  // Hohlfalzziegel
  { id: "harmonie", name: "Harmonie", active: true, pdf_url: "/pdfs/creaton-harmonie.pdf",
    la_min: 328, la_max: 352, put_min: 0, put_max: 80, put_default: 35, lat_base: 390,
    laf_tables: {
      "30x50": [
        { bis_grad: 10, laf: 60 }, { bis_grad: 15, laf: 60 }, { bis_grad: 20, laf: 55 },
        { bis_grad: 25, laf: 50 }, { bis_grad: 30, laf: 45 }, { bis_grad: 35, laf: 40 },
        { bis_grad: 40, laf: 35 }, { bis_grad: 45, laf: 30 }, { bis_grad: 50, laf: 30 },
        { bis_grad: 55, laf: 25 }, { bis_grad: 60, laf: 25 },
      ],
      "40x60": [
        { bis_grad: 10, laf: 60 }, { bis_grad: 15, laf: 60 }, { bis_grad: 20, laf: 55 },
        { bis_grad: 25, laf: 45 }, { bis_grad: 30, laf: 40 }, { bis_grad: 35, laf: 35 },
        { bis_grad: 40, laf: 30 }, { bis_grad: 45, laf: 20 }, { bis_grad: 50, laf: 15 },
        { bis_grad: 55, laf: 10 }, { bis_grad: 60, laf: 10 },
      ],
      "50x50": [
        { bis_grad: 10, laf: 55 }, { bis_grad: 15, laf: 55 }, { bis_grad: 20, laf: 50 },
        { bis_grad: 25, laf: 40 }, { bis_grad: 30, laf: 35 }, { bis_grad: 35, laf: 25 },
        { bis_grad: 40, laf: 20 }, { bis_grad: 45, laf: 10 }, { bis_grad: 50, laf: 5 },
      ],
    },
  },
  { id: "melodie", name: "Melodie", active: true, pdf_url: "/pdfs/creaton-melodie.pdf",
    la_min: 314, la_max: 347, put_min: 0, put_max: 80, put_default: 50, lat_base: 400,
    laf_tables: {
      "30x50": [
        { bis_grad: 10, laf: 50 }, { bis_grad: 15, laf: 50 }, { bis_grad: 20, laf: 45 },
        { bis_grad: 25, laf: 40 }, { bis_grad: 30, laf: 30 }, { bis_grad: 35, laf: 20 },
        { bis_grad: 40, laf: 15 }, { bis_grad: 45, laf: 15 }, { bis_grad: 50, laf: 15 },
        { bis_grad: 55, laf: 10 }, { bis_grad: 60, laf: 10 },
      ],
      "40x60": [
        { bis_grad: 10, laf: 50 }, { bis_grad: 15, laf: 50 }, { bis_grad: 20, laf: 45 },
        { bis_grad: 25, laf: 35 }, { bis_grad: 30, laf: 25 }, { bis_grad: 35, laf: 15 },
        { bis_grad: 40, laf: 10 }, { bis_grad: 45, laf: 10 }, { bis_grad: 50, laf: 10 },
      ],
      "50x50": [
        { bis_grad: 10, laf: 45 }, { bis_grad: 15, laf: 45 }, { bis_grad: 20, laf: 40 },
        { bis_grad: 25, laf: 30 }, { bis_grad: 30, laf: 20 }, { bis_grad: 35, laf: 5 },
      ],
    },
  },
  { id: "sinfonie", name: "Sinfonie", active: true, pdf_url: "/pdfs/creaton-sinfonie.pdf",
    la_min: 361, la_max: 389, put_min: 0, put_max: 80, put_default: 60, lat_base: 420,
    laf_tables: {
      "30x50": [
        { bis_grad: 10, laf: 80 }, { bis_grad: 15, laf: 80 }, { bis_grad: 20, laf: 70 },
        { bis_grad: 25, laf: 65 }, { bis_grad: 30, laf: 60 }, { bis_grad: 35, laf: 60 },
        { bis_grad: 40, laf: 60 }, { bis_grad: 45, laf: 50 }, { bis_grad: 50, laf: 45 },
        { bis_grad: 55, laf: 45 }, { bis_grad: 60, laf: 45 },
      ],
      "40x60": [
        { bis_grad: 10, laf: 80 }, { bis_grad: 15, laf: 80 }, { bis_grad: 20, laf: 70 },
        { bis_grad: 25, laf: 60 }, { bis_grad: 30, laf: 55 }, { bis_grad: 35, laf: 55 },
        { bis_grad: 40, laf: 55 }, { bis_grad: 45, laf: 40 }, { bis_grad: 50, laf: 30 },
        { bis_grad: 55, laf: 30 }, { bis_grad: 60, laf: 30 },
      ],
      "50x50": [
        { bis_grad: 10, laf: 75 }, { bis_grad: 15, laf: 75 }, { bis_grad: 20, laf: 65 },
        { bis_grad: 25, laf: 55 }, { bis_grad: 30, laf: 50 }, { bis_grad: 35, laf: 45 },
        { bis_grad: 40, laf: 45 }, { bis_grad: 45, laf: 30 }, { bis_grad: 50, laf: 20 },
        { bis_grad: 55, laf: 20 }, { bis_grad: 60, laf: 15 },
      ],
    },
  },
  // weitere
  { id: "rustico", name: "Rustico", active: true, pdf_url: "/pdfs/creaton-rustico.pdf",
    la_min: 328, la_max: 348, put_min: 0, put_max: 80, put_default: 50, lat_base: 365,
    laf_tables: {
      "30x50": [
        { bis_grad: 10, laf: 80 }, { bis_grad: 15, laf: 75 }, { bis_grad: 20, laf: 75 },
        { bis_grad: 25, laf: 70 }, { bis_grad: 30, laf: 65 }, { bis_grad: 35, laf: 60 },
        { bis_grad: 40, laf: 55 }, { bis_grad: 45, laf: 50 }, { bis_grad: 50, laf: 50 },
        { bis_grad: 55, laf: 45 }, { bis_grad: 60, laf: 45 },
      ],
      "40x60": [
        { bis_grad: 10, laf: 80 }, { bis_grad: 15, laf: 80 }, { bis_grad: 20, laf: 75 },
        { bis_grad: 25, laf: 65 }, { bis_grad: 30, laf: 60 }, { bis_grad: 35, laf: 55 },
        { bis_grad: 40, laf: 50 }, { bis_grad: 45, laf: 40 }, { bis_grad: 50, laf: 35 },
        { bis_grad: 55, laf: 30 }, { bis_grad: 60, laf: 30 },
      ],
      "50x50": [
        { bis_grad: 10, laf: 75 }, { bis_grad: 15, laf: 75 }, { bis_grad: 20, laf: 70 },
        { bis_grad: 25, laf: 60 }, { bis_grad: 30, laf: 55 }, { bis_grad: 35, laf: 45 },
        { bis_grad: 40, laf: 40 }, { bis_grad: 45, laf: 30 }, { bis_grad: 50, laf: 25 },
        { bis_grad: 55, laf: 20 }, { bis_grad: 60, laf: 20 },
      ],
    },
  },
  { id: "terra-optima", name: "Terra Optima", active: true, pdf_url: "/pdfs/creaton-terra-optima.pdf",
    la_min: 330, la_max: 375, put_min: 0, put_max: 80, lat_base: 410,
    laf_tables: {
      "30x50": [
        { bis_grad: 15, laf: 60 }, { bis_grad: 20, laf: 55 }, { bis_grad: 25, laf: 50 },
        { bis_grad: 30, laf: 45 }, { bis_grad: 35, laf: 45 }, { bis_grad: 40, laf: 40 },
        { bis_grad: 45, laf: 35 }, { bis_grad: 50, laf: 35 },
      ],
      "40x60": [
        { bis_grad: 20, laf: 55 }, { bis_grad: 25, laf: 45 }, { bis_grad: 30, laf: 40 },
        { bis_grad: 35, laf: 40 }, { bis_grad: 40, laf: 35 }, { bis_grad: 45, laf: 25 },
        { bis_grad: 50, laf: 20 },
      ],
      "50x50": [
        { bis_grad: 20, laf: 50 }, { bis_grad: 25, laf: 40 }, { bis_grad: 30, laf: 35 },
        { bis_grad: 35, laf: 30 }, { bis_grad: 40, laf: 25 }, { bis_grad: 45, laf: 15 },
        { bis_grad: 50, laf: 10 },
      ],
    },
  },
  // Biberschwanzziegel
  { id: "ambiente-gerade",      name: "Ambiente Geradschnitt",   active: true, pdf_url: "/pdfs/creaton-ambiente-gerade.pdf",
    la_min: 145, la_max: 165,
  },
  { id: "ambiente-segment",     name: "Ambiente Segmentschnitt", active: true, pdf_url: "/pdfs/creaton-ambiente-segment.pdf",
    la_min: 145, la_max: 165,
  },
  { id: "antik",                name: "Antik",                   active: true, pdf_url: null },
  { id: "klassik",              name: "Klassik",                 active: true, pdf_url: "/pdfs/creaton-klassik.pdf",
    la_min: 145, la_max: 165,
  },
  { id: "sakral-gerade",        name: "Sakral Geradschnitt",     active: true, pdf_url: null },
  { id: "sakral-rund",          name: "Sakral Rundschnitt",      active: true, pdf_url: null },
  { id: "manufaktur-turmbiber", name: "Manufaktur Turmbiber",    active: true, pdf_url: "/pdfs/creaton-manufaktur-turmbiber.pdf",
    la_min: 95, la_max: 115,
  },
  { id: "kera-biber",           name: "Kera-Biber Profil",       active: true, pdf_url: null },
];

const NELSKAMP_MODELLE: Modell[] = [
  // Flachdachziegel
  { id: "f12-sued", name: "F 12 Ü Süd", active: true, pdf_url: "/pdfs/nelskamp-f12-sued-verlegeanleitung.pdf",
    la_min: 327, la_max: 363, put_min: 40, put_max: 40, lat_base: 435,
    laf_table: [{ bis_grad: 30, laf: 30 }, { bis_grad: 45, laf: 25 }, { bis_grad: 90, laf: 20 }],
  },
  { id: "f12-nord", name: "F 12 Ü Nord", active: true, pdf_url: "/pdfs/nelskamp-f12-nord.pdf",
    la_min: 321, la_max: 361, put_min: 40, put_max: 40, lat_base: 462,
    laf_table: [{ bis_grad: 30, laf: 30 }, { bis_grad: 45, laf: 25 }, { bis_grad: 90, laf: 20 }],
  },
  { id: "f10-pro", name: "F 10 PRO", active: true, pdf_url: "/pdfs/nelskamp-f10-pro.pdf",
    la_min: 380, la_max: 410, put_min: 40, put_max: 40, lat_base: 460,
    laf_table: [{ bis_grad: 30, laf: 30 }, { bis_grad: 45, laf: 25 }, { bis_grad: 90, laf: 20 }],
  },
  { id: "f10", name: "F 10 Ü", active: true, pdf_url: "/pdfs/nelskamp-f10.pdf",
    la_min: 404, la_max: 428, put_min: 40, put_max: 40, lat_base: 460,
    laf_table: [{ bis_grad: 30, laf: 30 }, { bis_grad: 45, laf: 25 }, { bis_grad: 90, laf: 20 }],
  },
  { id: "f8", name: "F 8 ½", active: true, pdf_url: "/pdfs/nelskamp-f8.pdf",
    la_min: 370, la_max: 405, put_min: 40, put_max: 40, lat_base: 470,
    laf_table: [{ bis_grad: 30, laf: 40 }, { bis_grad: 45, laf: 35 }, { bis_grad: 90, laf: 30 }],
  },
  // Hohlfalzziegel
  { id: "h10", name: "H 10", active: true, pdf_url: "/pdfs/nelskamp-h10.pdf",
    la_min: 369, la_max: 399, put_min: 40, put_max: 40, lat_base: 450,
    laf_table: [
      { bis_grad: 25, laf: 65 }, { bis_grad: 30, laf: 60 }, { bis_grad: 35, laf: 55 },
      { bis_grad: 40, laf: 50 }, { bis_grad: 45, laf: 45 }, { bis_grad: 50, laf: 40 },
      { bis_grad: 55, laf: 35 }, { bis_grad: 90, laf: 35 },
    ],
  },
  { id: "h15", name: "H 15", active: true, pdf_url: "/pdfs/nelskamp-h15.pdf",
    la_min: 326, la_max: 341, put_min: 40, put_max: 40, lat_base: 392,
    laf_table: [{ bis_grad: 30, laf: 30 }, { bis_grad: 45, laf: 25 }, { bis_grad: 90, laf: 20 }],
  },
  // Glattziegel
  { id: "g10", name: "G 10", active: true, pdf_url: "/pdfs/nelskamp-g10.pdf",
    la_min: 386, la_max: 406, put_min: 40, put_max: 40, lat_base: 460,
    laf_table: [{ bis_grad: 30, laf: 30 }, { bis_grad: 45, laf: 25 }, { bis_grad: 90, laf: 20 }],
  },
  { id: "g10-pro", name: "G 10 PRO", active: true, pdf_url: null },
  // Kombinations-Ziegel
  { id: "r10", name: "R 10", active: true, pdf_url: "/pdfs/nelskamp-r10.pdf",
    la_min: 300, la_max: 420, put_min: 40, put_max: 40, lat_base: 450,
    laf_table: [{ bis_grad: 30, laf: 40 }, { bis_grad: 45, laf: 35 }, { bis_grad: 90, laf: 30 }],
  },
  // Doppelmuldenfalz
  { id: "ds8", name: "DS 8", active: true, pdf_url: "/pdfs/nelskamp-ds8.pdf",
    la_min: 320, la_max: 420, put_min: 40, put_max: 40, lat_base: 450,
    laf_table: [{ bis_grad: 30, laf: 40 }, { bis_grad: 45, laf: 35 }, { bis_grad: 90, laf: 30 }],
  },
  { id: "ds5", name: "DS 5", active: true, pdf_url: "/pdfs/nelskamp-ds5.pdf",
    la_min: 460, la_max: 540, put_min: 40, put_max: 40, lat_base: 570,
    laf_table: [{ bis_grad: 30, laf: 30 }, { bis_grad: 45, laf: 25 }, { bis_grad: 90, laf: 20 }],
  },
  { id: "d13", name: "D 13 Ü", active: true, pdf_url: "/pdfs/nelskamp-d13.pdf",
    la_min: 356, la_max: 380, put_min: 40, put_max: 40, lat_base: 400,
    laf_table: [{ bis_grad: 30, laf: 40 }, { bis_grad: 45, laf: 35 }, { bis_grad: 90, laf: 30 }],
  },
  { id: "d15", name: "D 15 Ü", active: true, pdf_url: "/pdfs/nelskamp-d15.pdf",
    la_min: 336, la_max: 352, put_min: 40, put_max: 40, lat_base: 400,
    laf_table: [{ bis_grad: 30, laf: 40 }, { bis_grad: 45, laf: 35 }, { bis_grad: 90, laf: 30 }],
  },
  // Dachsteine (Beton)
  { id: "planum", name: "Planum", active: true, pdf_url: "/pdfs/nelskamp-planum.pdf",
    la_min: 312, la_max: 340, put_min: 40, put_max: 40, lat_base: 400,
    laf_table: [{ bis_grad: 30, laf: 40 }, { bis_grad: 45, laf: 35 }, { bis_grad: 90, laf: 30 }],
  },
  { id: "finkenberger", name: "Finkenberger Pfanne", active: true, pdf_url: "/pdfs/nelskamp-finkenberger.pdf",
    la_min: 314, la_max: 345, put_min: 40, put_max: 40, lat_base: 400,
    laf_table: [{ bis_grad: 30, laf: 40 }, { bis_grad: 45, laf: 35 }, { bis_grad: 90, laf: 30 }],
  },
  { id: "s-tile", name: "S-Tile", active: true, pdf_url: "/pdfs/nelskamp-s-tile.pdf",
    la_min: 314, la_max: 345, put_min: 40, put_max: 40, lat_base: 400,
    laf_table: [{ bis_grad: 30, laf: 40 }, { bis_grad: 45, laf: 35 }, { bis_grad: 90, laf: 30 }],
  },
  { id: "sigma-tile", name: "Sigma Tile", active: true, pdf_url: "/pdfs/nelskamp-sigma-tile.pdf",
    la_min: 314, la_max: 345, put_min: 40, put_max: 40, lat_base: 400,
    laf_table: [{ bis_grad: 30, laf: 40 }, { bis_grad: 45, laf: 35 }, { bis_grad: 90, laf: 30 }],
  },
  { id: "crown-tile", name: "Crown Tile", active: true, pdf_url: "/pdfs/nelskamp-crown-tile.pdf",
    la_min: 314, la_max: 345, put_min: 40, put_max: 40, lat_base: 400,
    laf_table: [{ bis_grad: 30, laf: 40 }, { bis_grad: 45, laf: 35 }, { bis_grad: 90, laf: 30 }],
  },
];

const JACOBI_MODELLE: Modell[] = [
  // Flachdachziegel
  { id: "j11v",          name: "J11v",              active: true, pdf_url: "/pdfs/jacobi-j11v.pdf" },
  { id: "j13v",          name: "J13v",              active: true, pdf_url: "/pdfs/jacobi-j13v.pdf" },
  { id: "j160",          name: "J160",              active: true, pdf_url: "/pdfs/jacobi-j160.pdf" },
  { id: "w4v",           name: "W4v",               active: true, pdf_url: "/pdfs/jacobi-w4v.pdf" },
  { id: "w6v",           name: "W6v",               active: true, pdf_url: "/pdfs/jacobi-w6v.pdf" },
  { id: "stylist",       name: "Stylist",           active: true, pdf_url: "/pdfs/jacobi-stylist.pdf" },
  // Hohlfalzziegel
  { id: "z2",            name: "Z2",                active: true, pdf_url: "/pdfs/jacobi-z2.pdf" },
  { id: "z5",            name: "Z5",                active: true, pdf_url: "/pdfs/jacobi-z5.pdf" },
  // Reformziegel
  { id: "z7v",           name: "Z7v",               active: true, pdf_url: "/pdfs/jacobi-z7v.pdf" },
  { id: "z10",           name: "Z10",               active: true, pdf_url: "/pdfs/jacobi-z10.pdf" },
  { id: "z12v",          name: "Z12v",              active: true, pdf_url: "/pdfs/jacobi-z12v.pdf" },
  // Hohlpfanne
  { id: "h1",            name: "H1",                active: true, pdf_url: "/pdfs/jacobi-h1.pdf" },
  { id: "h2",            name: "H2",                active: true, pdf_url: "/pdfs/jacobi-h2.pdf" },
  // Krempziegel
  { id: "k1",            name: "K1",                active: true, pdf_url: "/pdfs/jacobi-k1.pdf" },
  // Biberschwanzziegel (gemeinsames Prospekt)
  { id: "biber-18",      name: "Biber 18×38",       active: true, pdf_url: "/pdfs/jacobi-biber.pdf" },
  { id: "biber-berlin",  name: "Biber 15,5×38",     active: true, pdf_url: "/pdfs/jacobi-biber.pdf" },
  { id: "wellenbiber",   name: "Wellenbiber 17×38", active: true, pdf_url: "/pdfs/jacobi-biber.pdf" },
  { id: "turmbiber",     name: "Turmbiber",         active: true, pdf_url: "/pdfs/jacobi-biber.pdf" },
  { id: "biber-contura", name: "Biber Contura",     active: true, pdf_url: "/pdfs/jacobi-biber.pdf" },
  // Romanische Pfanne
  { id: "marko",         name: "Marko",             active: true, pdf_url: "/pdfs/jacobi-marko.pdf" },
  // Solar
  { id: "j160-pv",       name: "J160-PV",           active: true, pdf_url: "/pdfs/jacobi-j160-pv.pdf" },
  { id: "stylist-pv",    name: "Stylist-PV",        active: true, pdf_url: null },
];

const ERLUS_MODELLE: Modell[] = [
  // E58-Serie
  { id: "e58-s",            name: "E 58 S",             active: true, pdf_url: "/pdfs/erlus-e58-s-zeichnungen.pdf" },
  { id: "e58-sl",           name: "E 58 SL",            active: true, pdf_url: "/pdfs/erlus-e58-sl-zeichnungen.pdf" },
  { id: "e58-sl-d",         name: "E 58 SL-D",          active: true, pdf_url: "/pdfs/erlus-e58-sl-d-zeichnungen.pdf" },
  { id: "e58-rs",           name: "E 58 RS",            active: true, pdf_url: "/pdfs/erlus-e58-rs-zeichnungen.pdf" },
  { id: "e58-max",          name: "E 58 MAX",           active: true, pdf_url: "/pdfs/erlus-e58-max-zeichnungen.pdf" },
  { id: "e58-plus",         name: "E 58 PLUS",          active: true, pdf_url: "/pdfs/erlus-e58-plus-zeichnungen.pdf" },
  // Karat-Serie
  { id: "karat-rs",         name: "Karat RS",           active: true, pdf_url: "/pdfs/erlus-karat-rs-zeichnungen.pdf" },
  { id: "karat-xxl",        name: "Karat XXL",          active: true, pdf_url: "/pdfs/erlus-karat-xxl-zeichnungen.pdf" },
  { id: "karat-xxl-d",      name: "Karat XXL-D",        active: true, pdf_url: "/pdfs/erlus-karat-xxl-d-zeichnungen.pdf" },
  // Flach- / Reformziegel
  { id: "linea",            name: "Linea",              active: true, pdf_url: "/pdfs/erlus-linea-zeichnungen.pdf" },
  { id: "level-rs",         name: "Level RS",           active: true, pdf_url: "/pdfs/erlus-level-rs-zeichnungen.pdf" },
  { id: "forma",            name: "Forma",              active: true, pdf_url: "/pdfs/erlus-forma-zeichnungen.pdf" },
  { id: "scala",            name: "Scala",              active: true, pdf_url: "/pdfs/erlus-scala-zeichnungen.pdf" },
  // Falzziegel
  { id: "falzziegel",       name: "Falzziegel",         active: true, pdf_url: "/pdfs/erlus-falzziegel-zeichnungen.pdf" },
  { id: "grossfalzziegel",  name: "Großfalzziegel",     active: true, pdf_url: "/pdfs/erlus-grossfalzziegel-zeichnungen.pdf" },
  { id: "grossfalz-xxl",    name: "Großfalzziegel XXL", active: true, pdf_url: "/pdfs/erlus-grossfalz-xxl-zeichnungen.pdf" },
  // Reformpfanne
  { id: "reform-sl",        name: "Reformpfanne SL",    active: true, pdf_url: "/pdfs/erlus-reform-sl-zeichnungen.pdf" },
  { id: "reform-xxl",       name: "Reformpfanne XXL",   active: true, pdf_url: "/pdfs/erlus-reform-xxl-zeichnungen.pdf" },
  // Hohlfalz
  { id: "hohlfalz-sl",      name: "Hohlfalz SL",        active: true, pdf_url: "/pdfs/erlus-hohlfalz-sl-zeichnungen.pdf" },
  { id: "hohlfalz-sl-d",    name: "Hohlfalz SL-D",      active: true, pdf_url: "/pdfs/erlus-hohlfalz-sl-d-zeichnungen.pdf" },
  // Sonstige
  { id: "monaco",           name: "Monaco",             active: true, pdf_url: "/pdfs/erlus-monaco-zeichnungen.pdf" },
  { id: "plain-tile",       name: "Plain Tile",         active: true, pdf_url: null },
];

const ROEBEN_MODELLE: Modell[] = [
  { id: "bari", name: "Bari", active: true, pdf_url: "/pdfs/roeben-bari.pdf",
    la_min: 335, la_max: 365, put_min: 40, put_max: 40, lat_base: 415,
    laf_tables: {
      "30x50": [
        {bis_grad:10,laf:52},{bis_grad:14,laf:50},{bis_grad:18,laf:48},{bis_grad:22,laf:46},
        {bis_grad:25,laf:46},{bis_grad:30,laf:44},{bis_grad:35,laf:42},{bis_grad:40,laf:42},
        {bis_grad:45,laf:42},{bis_grad:50,laf:40},{bis_grad:55,laf:40},{bis_grad:90,laf:38},
      ],
      "40x60": [
        {bis_grad:10,laf:48},{bis_grad:14,laf:46},{bis_grad:18,laf:44},{bis_grad:22,laf:42},
        {bis_grad:25,laf:42},{bis_grad:30,laf:40},{bis_grad:35,laf:38},{bis_grad:40,laf:34},
        {bis_grad:45,laf:30},{bis_grad:50,laf:28},{bis_grad:55,laf:26},{bis_grad:90,laf:24},
      ],
    },
  },
  { id: "bergamo", name: "Bergamo", active: true, pdf_url: "/pdfs/roeben-bergamo.pdf",
    la_min: 334, la_max: 358, put_min: 40, put_max: 40, lat_base: 410,
    laf_tables: {
      "30x50": [
        {bis_grad:10,laf:40},{bis_grad:13,laf:40},{bis_grad:17,laf:38},{bis_grad:21,laf:38},
        {bis_grad:25,laf:38},{bis_grad:30,laf:38},{bis_grad:35,laf:38},{bis_grad:40,laf:40},
        {bis_grad:45,laf:40},{bis_grad:50,laf:40},{bis_grad:55,laf:40},{bis_grad:90,laf:42},
      ],
      "40x60": [
        {bis_grad:10,laf:38},{bis_grad:13,laf:38},{bis_grad:17,laf:36},{bis_grad:21,laf:34},
        {bis_grad:25,laf:32},{bis_grad:30,laf:30},{bis_grad:35,laf:28},{bis_grad:40,laf:28},
        {bis_grad:45,laf:28},{bis_grad:50,laf:28},{bis_grad:55,laf:28},{bis_grad:90,laf:28},
      ],
    },
  },
  { id: "eifel", name: "Eifel", active: true, pdf_url: "/pdfs/roeben-eifel.pdf",
    la_min: 348, la_max: 378, put_min: 40, put_max: 40, lat_base: 420,
    laf_tables: {
      "30x50": [
        {bis_grad:10,laf:54},{bis_grad:14,laf:52},{bis_grad:18,laf:52},{bis_grad:22,laf:50},
        {bis_grad:25,laf:50},{bis_grad:30,laf:48},{bis_grad:35,laf:48},{bis_grad:40,laf:48},
        {bis_grad:45,laf:48},{bis_grad:50,laf:48},{bis_grad:55,laf:48},{bis_grad:90,laf:48},
      ],
      "40x60": [
        {bis_grad:10,laf:54},{bis_grad:14,laf:52},{bis_grad:18,laf:50},{bis_grad:22,laf:48},
        {bis_grad:25,laf:46},{bis_grad:30,laf:44},{bis_grad:35,laf:42},{bis_grad:40,laf:40},
        {bis_grad:45,laf:38},{bis_grad:50,laf:36},{bis_grad:55,laf:34},{bis_grad:90,laf:32},
      ],
    },
  },
  { id: "elsass", name: "Elsass", active: true, pdf_url: "/pdfs/roeben-elsass.pdf",
    la_min: 340, la_max: 355, put_min: 40, put_max: 40, lat_base: 380,
    laf_tables: {
      "30x50": [
        {bis_grad:10,laf:58},{bis_grad:13,laf:56},{bis_grad:17,laf:54},{bis_grad:21,laf:54},
        {bis_grad:25,laf:54},{bis_grad:30,laf:54},{bis_grad:35,laf:54},{bis_grad:40,laf:54},
        {bis_grad:45,laf:54},{bis_grad:50,laf:58},{bis_grad:55,laf:62},{bis_grad:90,laf:64},
      ],
      "40x60": [
        {bis_grad:10,laf:54},{bis_grad:13,laf:52},{bis_grad:17,laf:50},{bis_grad:21,laf:48},
        {bis_grad:25,laf:46},{bis_grad:30,laf:44},{bis_grad:35,laf:44},{bis_grad:40,laf:44},
        {bis_grad:45,laf:44},{bis_grad:50,laf:44},{bis_grad:55,laf:46},{bis_grad:90,laf:46},
      ],
    },
  },
  { id: "flandern", name: "Flandern", active: true, pdf_url: "/pdfs/roeben-flandern.pdf",
    la_min: 335, la_max: 355, put_min: 40, put_max: 40, lat_base: 380,
    laf_tables: {
      "30x50": [
        {bis_grad:10,laf:50},{bis_grad:14,laf:48},{bis_grad:18,laf:46},{bis_grad:22,laf:46},
        {bis_grad:25,laf:44},{bis_grad:30,laf:44},{bis_grad:35,laf:44},{bis_grad:40,laf:44},
        {bis_grad:45,laf:44},{bis_grad:50,laf:42},{bis_grad:55,laf:42},{bis_grad:90,laf:40},
      ],
      "40x60": [
        {bis_grad:10,laf:46},{bis_grad:14,laf:44},{bis_grad:18,laf:42},{bis_grad:22,laf:40},
        {bis_grad:25,laf:40},{bis_grad:30,laf:38},{bis_grad:35,laf:36},{bis_grad:40,laf:34},
        {bis_grad:45,laf:32},{bis_grad:50,laf:30},{bis_grad:55,laf:28},{bis_grad:90,laf:26},
      ],
    },
  },
  { id: "flandernplus", name: "Flandern Plus", active: true, pdf_url: "/pdfs/roeben-flandernplus.pdf",
    la_min: 380, la_max: 395, put_min: 40, put_max: 40, lat_base: 420,
    laf_tables: {
      "30x50": [
        {bis_grad:10,laf:54},{bis_grad:14,laf:52},{bis_grad:18,laf:52},{bis_grad:22,laf:50},
        {bis_grad:25,laf:50},{bis_grad:30,laf:48},{bis_grad:35,laf:48},{bis_grad:40,laf:48},
        {bis_grad:45,laf:48},{bis_grad:50,laf:48},{bis_grad:55,laf:48},{bis_grad:90,laf:48},
      ],
      "40x60": [
        {bis_grad:10,laf:54},{bis_grad:14,laf:52},{bis_grad:18,laf:50},{bis_grad:22,laf:48},
        {bis_grad:25,laf:46},{bis_grad:30,laf:44},{bis_grad:35,laf:42},{bis_grad:40,laf:40},
        {bis_grad:45,laf:38},{bis_grad:50,laf:36},{bis_grad:55,laf:34},{bis_grad:90,laf:32},
      ],
    },
  },
  { id: "limburg", name: "Limburg", active: true, pdf_url: "/pdfs/roeben-limburg.pdf",
    la_min: 310, la_max: 345, put_min: 40, put_max: 40, lat_base: 385,
    laf_tables: {
      "30x50": [
        {bis_grad:10,laf:56},{bis_grad:14,laf:56},{bis_grad:18,laf:54},{bis_grad:22,laf:54},
        {bis_grad:25,laf:52},{bis_grad:30,laf:50},{bis_grad:35,laf:48},{bis_grad:40,laf:48},
        {bis_grad:45,laf:46},{bis_grad:50,laf:46},{bis_grad:55,laf:44},{bis_grad:90,laf:44},
      ],
      "40x60": [
        {bis_grad:10,laf:54},{bis_grad:14,laf:52},{bis_grad:18,laf:50},{bis_grad:22,laf:48},
        {bis_grad:25,laf:48},{bis_grad:30,laf:46},{bis_grad:35,laf:44},{bis_grad:40,laf:42},
        {bis_grad:45,laf:40},{bis_grad:50,laf:36},{bis_grad:55,laf:32},{bis_grad:90,laf:28},
      ],
    },
  },
  { id: "milano", name: "Milano", active: true, pdf_url: "/pdfs/roeben-milano.pdf",
    la_min: 357, la_max: 398, put_min: 40, put_max: 40, lat_base: 450,
    laf_tables: {
      "30x50": [
        {bis_grad:10,laf:58},{bis_grad:14,laf:58},{bis_grad:18,laf:56},{bis_grad:22,laf:56},
        {bis_grad:25,laf:56},{bis_grad:30,laf:56},{bis_grad:35,laf:54},{bis_grad:40,laf:54},
        {bis_grad:45,laf:54},{bis_grad:50,laf:54},{bis_grad:55,laf:54},{bis_grad:90,laf:54},
      ],
      "40x60": [
        {bis_grad:10,laf:56},{bis_grad:14,laf:54},{bis_grad:18,laf:52},{bis_grad:22,laf:52},
        {bis_grad:25,laf:50},{bis_grad:30,laf:48},{bis_grad:35,laf:46},{bis_grad:40,laf:46},
        {bis_grad:45,laf:46},{bis_grad:50,laf:44},{bis_grad:55,laf:44},{bis_grad:90,laf:44},
      ],
    },
  },
  { id: "monza", name: "Monza", active: true, pdf_url: "/pdfs/roeben-monza.pdf",
    la_min: 383, la_max: 403, put_min: 40, put_max: 40, lat_base: 435,
    laf_tables: {
      "30x50": [
        {bis_grad:10,laf:56},{bis_grad:14,laf:54},{bis_grad:18,laf:52},{bis_grad:22,laf:50},
        {bis_grad:25,laf:50},{bis_grad:30,laf:48},{bis_grad:35,laf:46},{bis_grad:40,laf:44},
        {bis_grad:45,laf:42},{bis_grad:50,laf:42},{bis_grad:55,laf:42},{bis_grad:90,laf:42},
      ],
      "40x60": [
        {bis_grad:10,laf:54},{bis_grad:14,laf:52},{bis_grad:18,laf:50},{bis_grad:22,laf:48},
        {bis_grad:25,laf:46},{bis_grad:30,laf:44},{bis_grad:35,laf:42},{bis_grad:40,laf:38},
        {bis_grad:45,laf:34},{bis_grad:50,laf:30},{bis_grad:55,laf:28},{bis_grad:90,laf:28},
      ],
    },
  },
  { id: "piemont", name: "Piemont", active: true, pdf_url: "/pdfs/roeben-piemont.pdf",
    la_min: 365, la_max: 403, put_min: 40, put_max: 40, lat_base: 442,
    laf_tables: {
      "30x50": [
        {bis_grad:10,laf:52},{bis_grad:14,laf:52},{bis_grad:18,laf:50},{bis_grad:22,laf:50},
        {bis_grad:25,laf:50},{bis_grad:30,laf:48},{bis_grad:35,laf:48},{bis_grad:40,laf:48},
        {bis_grad:45,laf:48},{bis_grad:50,laf:48},{bis_grad:55,laf:48},{bis_grad:90,laf:48},
      ],
      "40x60": [
        {bis_grad:10,laf:50},{bis_grad:14,laf:50},{bis_grad:18,laf:48},{bis_grad:22,laf:46},
        {bis_grad:25,laf:44},{bis_grad:30,laf:42},{bis_grad:35,laf:40},{bis_grad:40,laf:38},
        {bis_grad:45,laf:36},{bis_grad:50,laf:34},{bis_grad:55,laf:34},{bis_grad:90,laf:34},
      ],
    },
  },
  { id: "rheinland", name: "Rheinland", active: true, pdf_url: "/pdfs/roeben-rheinland.pdf",
    la_min: 340, la_max: 355, put_min: 40, put_max: 40, lat_base: 380,
    laf_tables: {
      "30x50": [
        {bis_grad:10,laf:58},{bis_grad:13,laf:56},{bis_grad:17,laf:54},{bis_grad:21,laf:54},
        {bis_grad:25,laf:54},{bis_grad:30,laf:54},{bis_grad:35,laf:54},{bis_grad:40,laf:54},
        {bis_grad:45,laf:54},{bis_grad:50,laf:58},{bis_grad:55,laf:62},{bis_grad:90,laf:64},
      ],
      "40x60": [
        {bis_grad:10,laf:54},{bis_grad:13,laf:52},{bis_grad:17,laf:50},{bis_grad:21,laf:48},
        {bis_grad:25,laf:46},{bis_grad:30,laf:44},{bis_grad:35,laf:44},{bis_grad:40,laf:44},
        {bis_grad:45,laf:44},{bis_grad:50,laf:44},{bis_grad:55,laf:46},{bis_grad:90,laf:46},
      ],
    },
  },
];

const WIENERBERGER_MODELLE: Modell[] = [
  // Flachdachziegel
  { id: "alegra-8",    name: "Alegra 8",    active: true, pdf_url: "/pdfs/wienerberger-alegra-8.pdf" },
  { id: "alegra-10-e", name: "Alegra 10 E", active: true, pdf_url: "/pdfs/wienerberger-alegra-10-e.pdf" },
  { id: "alegra-12-b", name: "Alegra 12 B", active: true, pdf_url: "/pdfs/wienerberger-alegra-12-b.pdf" },
  { id: "alegra-15",   name: "Alegra 15",   active: true, pdf_url: "/pdfs/wienerberger-alegra-15.pdf" },
  { id: "universo-10", name: "Universo 10", active: true, pdf_url: "/pdfs/wienerberger-universo-10.pdf" },
  { id: "universo-14", name: "Universo 14", active: true, pdf_url: "/pdfs/wienerberger-universo-14.pdf" },
  // Reformziegel
  { id: "cosmo-11",    name: "Cosmo 11",    active: true, pdf_url: "/pdfs/wienerberger-cosmo-11.pdf" },
  { id: "cosmo-12-s",  name: "Cosmo 12 S",  active: true, pdf_url: "/pdfs/wienerberger-cosmo-12-s.pdf" },
  // Doppelmuldenfalzziegel
  { id: "mondo-11",    name: "Mondo 11",    active: true, pdf_url: "/pdfs/wienerberger-mondo-11.pdf" },
  { id: "mondo-15-s",  name: "Mondo 15 S",  active: true, pdf_url: "/pdfs/wienerberger-mondo-15-s.pdf" },
  { id: "tradi-12",    name: "Tradi 12",    active: true, pdf_url: "/pdfs/wienerberger-tradi-12.pdf" },
  // Flachziegel / Design
  { id: "actua-10",    name: "Actua 10",    active: true, pdf_url: "/pdfs/wienerberger-actua-10.pdf" },
  { id: "plano-11",    name: "Plano 11",    active: true, pdf_url: "/pdfs/wienerberger-plano-11.pdf" },
  { id: "v11",         name: "V11",         active: true, pdf_url: "/pdfs/wienerberger-v11.pdf" },
  // Romanische Ziegel
  { id: "karthago-14", name: "Karthago 14", active: true, pdf_url: "/pdfs/wienerberger-karthago-14.pdf" },
  // Hohlfalzziegel
  { id: "cavus-13",    name: "Cavus 13",    active: true, pdf_url: "/pdfs/wienerberger-cavus-13.pdf" },
  // Biberschwanzziegel
  { id: "falzbiber",   name: "Falzbiber",   active: true, pdf_url: "/pdfs/wienerberger-falzbiber.pdf" },
];

const MODELLE: Record<string, Modell[]> = {
  braas: BRAAS_MODELLE,
  creaton: CREATON_MODELLE,
  nelskamp: NELSKAMP_MODELLE,
  jacobi: JACOBI_MODELLE,
  erlus: ERLUS_MODELLE,
  roeben: ROEBEN_MODELLE,
  wienerberger: WIENERBERGER_MODELLE,
};

const SEL =
  "h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm " +
  "focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50";

export function PfannenAuswahl({ onSelect }: { onSelect?: (modell: Modell | null) => void } = {}) {
  const [herstellerId, setHerstellerId] = useState("");
  const [modell, setModell] = useState<Modell | null>(null);

  const modelle = herstellerId
    ? [...(MODELLE[herstellerId] ?? [])].sort((a, b) => a.name.localeCompare(b.name, "de"))
    : [];

  const hersteller = [...HERSTELLER].sort((a, b) => {
    if (a.active !== b.active) return a.active ? -1 : 1;
    return a.name.localeCompare(b.name, "de");
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Dachpfanne</CardTitle>
        <CardDescription>
          Hersteller und Modell wählen – PDF öffnet das Technische Datenblatt
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap items-center gap-3">
          {/* Hersteller */}
          <select
            className={SEL}
            value={herstellerId}
            onChange={(e) => {
              setHerstellerId(e.target.value);
              setModell(null);
              onSelect?.(null);
            }}
            aria-label="Hersteller"
          >
            <option value="">Hersteller wählen</option>
            {hersteller.map((h) => (
              <option key={h.id} value={h.id} disabled={!h.active}>
                {h.name}{!h.active ? " (demnächst)" : ""}
              </option>
            ))}
          </select>

          {/* Modell */}
          <select
            className={SEL}
            value={modell?.id ?? ""}
            disabled={modelle.length === 0}
            onChange={(e) => {
              const m = modelle.find((m) => m.id === e.target.value) ?? null;
              setModell(m);
              onSelect?.(m);
            }}
            aria-label="Modell"
          >
            <option value="">Modell wählen</option>
            {modelle.map((m) => (
              <option key={m.id} value={m.id} disabled={!m.active}>
                {m.name}{!m.active ? " (demnächst)" : !m.pdf_url ? " (kein Datenblatt)" : ""}
              </option>
            ))}
          </select>

          {/* PDF-Icon */}
          {modell?.pdf_url && (
            <a
              href={modell.pdf_url}
              target="_blank"
              rel="noopener noreferrer"
              title={`Datenblatt ${modell.name} öffnen`}
              className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-input bg-background text-muted-foreground shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              <FileText className="h-4 w-4" />
            </a>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
