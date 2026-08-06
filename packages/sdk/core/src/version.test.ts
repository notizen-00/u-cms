import { describe, expect, it } from "vitest";
import { checkCompatibility, compareSemVer, parseSemVer } from "./version.js";

describe("parseSemVer", () => {
  it("parses a valid version", () => {
    const result = parseSemVer("1.4.2");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toMatchObject({ major: 1, minor: 4, patch: 2 });
    }
  });

  it("rejects an invalid version", () => {
    const result = parseSemVer("not-a-version");
    expect(result.ok).toBe(false);
  });
});

describe("compareSemVer", () => {
  it("orders by major/minor/patch", () => {
    const a = parseSemVer("1.2.3");
    const b = parseSemVer("1.3.0");
    if (a.ok && b.ok) {
      expect(compareSemVer(a.value, b.value)).toBe(-1);
      expect(compareSemVer(b.value, a.value)).toBe(1);
      expect(compareSemVer(a.value, a.value)).toBe(0);
    }
  });
});

describe("checkCompatibility", () => {
  it("accepts a host version inside the declared range", () => {
    const result = checkCompatibility("CMS", "2.1.0", { min: "2.0.0", max: "2.9.9" });
    expect(result.compatible).toBe(true);
  });

  it("rejects a host version below the declared minimum", () => {
    const result = checkCompatibility("CMS", "1.0.0", { min: "2.0.0" });
    expect(result.compatible).toBe(false);
  });

  it("rejects a host version above the declared maximum", () => {
    const result = checkCompatibility("SDK", "3.0.0", { max: "2.9.9" });
    expect(result.compatible).toBe(false);
  });
});
