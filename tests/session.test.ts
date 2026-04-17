import { describe, it, expect, beforeAll } from "vitest";
import { signSession, verifySession, sessionHash } from "@/lib/session";

beforeAll(() => {
  process.env.SESSION_SECRET = "test-secret-test-secret-test-secret-test-secret";
});

describe("session", () => {
  it("signs and verifies a token", async () => {
    const token = await signSession("sid-123", 60 * 60);
    const payload = await verifySession(token);
    expect(payload?.sid).toBe("sid-123");
  });
  it("rejects tampered token", async () => {
    const token = await signSession("sid-123", 60);
    const bad = token.slice(0, -2) + "xx";
    expect(await verifySession(bad)).toBeNull();
  });
  it("rejects expired token", async () => {
    const token = await signSession("sid-exp", 1);
    await new Promise((r) => setTimeout(r, 1100));
    expect(await verifySession(token)).toBeNull();
  });
  it("produces stable sha256 hash", () => {
    expect(sessionHash("abc")).toBe(sessionHash("abc"));
    expect(sessionHash("abc")).not.toBe(sessionHash("abd"));
  });
});
