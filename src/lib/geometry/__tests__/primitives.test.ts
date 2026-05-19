import { describe, it, expect } from "vitest";
import {
  v,
  add,
  sub,
  dot,
  cross,
  length,
  normalize,
  perpLeft,
  perpRight,
  distance,
  signedArea,
  isCCW,
  isConvex,
  intersectParametric,
  inwardNormalCCW,
  deg2rad,
  rad2deg,
} from "../primitives";

describe("Vektor-Arithmetik", () => {
  it("add / sub / dot / cross", () => {
    expect(add(v(1, 2), v(3, 4))).toEqual({ x: 4, y: 6 });
    expect(sub(v(5, 7), v(2, 3))).toEqual({ x: 3, y: 4 });
    expect(dot(v(1, 2), v(3, 4))).toBe(11);
    expect(cross(v(1, 0), v(0, 1))).toBe(1);
    expect(cross(v(0, 1), v(1, 0))).toBe(-1);
  });

  it("length / normalize / distance", () => {
    expect(length(v(3, 4))).toBe(5);
    expect(normalize(v(3, 4))).toEqual({ x: 0.6, y: 0.8 });
    expect(distance(v(0, 0), v(3, 4))).toBe(5);
  });

  it("perpLeft dreht 90 Grad gegen den Uhrzeigersinn", () => {
    const a = perpLeft(v(1, 0));
    expect(a.x).toBeCloseTo(0, 10);
    expect(a.y).toBeCloseTo(1, 10);
    const b = perpLeft(v(0, 1));
    expect(b.x).toBeCloseTo(-1, 10);
    expect(b.y).toBeCloseTo(0, 10);
  });

  it("perpRight dreht 90 Grad im Uhrzeigersinn", () => {
    const a = perpRight(v(1, 0));
    expect(a.x).toBeCloseTo(0, 10);
    expect(a.y).toBeCloseTo(-1, 10);
  });

  it("deg2rad / rad2deg sind invers", () => {
    expect(rad2deg(deg2rad(45))).toBeCloseTo(45, 10);
    expect(deg2rad(180)).toBeCloseTo(Math.PI, 10);
  });
});

describe("Polygon-Eigenschaften", () => {
  const rect = [v(0, 0), v(12000, 0), v(12000, 8000), v(0, 8000)];

  it("signedArea ist positiv fuer CCW-Polygon", () => {
    expect(signedArea(rect)).toBe(96_000_000);
  });

  it("isCCW erkennt Wickelung", () => {
    expect(isCCW(rect)).toBe(true);
    expect(isCCW([...rect].reverse())).toBe(false);
  });

  it("isConvex erkennt konvexe und konkave Polygone", () => {
    expect(isConvex(rect)).toBe(true);
    const lShape = [
      v(0, 0), v(8000, 0), v(8000, 4000),
      v(4000, 4000), v(4000, 8000), v(0, 8000),
    ];
    expect(isConvex(lShape)).toBe(false);
  });
});

describe("Geradenschnitt", () => {
  it("zwei Geraden schneiden sich im erwarteten Punkt", () => {
    const r = intersectParametric(v(0, 0), v(1, 0), v(5, -3), v(0, 1));
    expect(r).not.toBeNull();
    if (r) {
      expect(r.t).toBe(5);
      expect(r.s).toBe(3);
    }
  });

  it("parallele Geraden liefern null", () => {
    expect(intersectParametric(v(0, 0), v(1, 0), v(0, 5), v(2, 0))).toBeNull();
  });
});

describe("inwardNormalCCW", () => {
  it("zeigt fuer CCW-Polygon nach innen", () => {
    const n = inwardNormalCCW(v(0, 0), v(1, 0));
    expect(n.x).toBeCloseTo(0, 10);
    expect(n.y).toBeCloseTo(1, 10);
  });
});
