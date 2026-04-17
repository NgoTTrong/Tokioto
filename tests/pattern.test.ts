import { describe, it, expect } from "vitest";
import { normalizePattern, isValidPattern, hashPattern, verifyPattern } from "@/lib/pattern";

describe("normalizePattern", () => {
  it("joins indices with dashes", () => {
    expect(normalizePattern([0, 1, 2, 5, 8])).toBe("0-1-2-5-8");
  });
  it("throws if fewer than 4 dots", () => {
    expect(() => normalizePattern([0, 1, 2])).toThrow();
  });
  it("throws on duplicate dots", () => {
    expect(() => normalizePattern([0, 1, 1, 2])).toThrow();
  });
  it("throws on out-of-range index", () => {
    expect(() => normalizePattern([0, 1, 2, 9])).toThrow();
  });
});

describe("isValidPattern", () => {
  it("rejects sequences that skip a dot in a straight line", () => {
    expect(isValidPattern([0, 2, 4, 6])).toBe(false);
  });
  it("accepts when middle dot already consumed", () => {
    expect(isValidPattern([1, 0, 2, 4])).toBe(true);
  });
  it("accepts diagonal skip (0→4) because 2 is not between linearly", () => {
    expect(isValidPattern([0, 4, 8, 3])).toBe(true);
  });
});

describe("pattern hash", () => {
  it("hashes a pattern and verifies it", async () => {
    const hash = await hashPattern([0, 1, 2, 5, 8]);
    expect(await verifyPattern([0, 1, 2, 5, 8], hash)).toBe(true);
    expect(await verifyPattern([0, 1, 2, 5], hash)).toBe(false);
  });
});
