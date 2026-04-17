import { describe, it, expect, beforeAll } from "vitest";
import { buildR2Key, presignUrl } from "@/lib/r2";

beforeAll(() => {
  process.env.R2_ACCOUNT_ID = "acc";
  process.env.R2_ACCESS_KEY_ID = "key";
  process.env.R2_SECRET_ACCESS_KEY = "secret";
  process.env.R2_BUCKET = "bkt";
});

describe("r2", () => {
  it("builds audio key", () => {
    expect(buildR2Key("audio", "abc-123")).toBe("audio/abc-123.mp3");
  });
  it("builds thumbnail key", () => {
    expect(buildR2Key("thumbnail", "abc-123")).toBe("thumbnails/abc-123.jpg");
  });
  it("produces a URL with signature parts", async () => {
    const url = await presignUrl("audio/x.mp3", 60);
    expect(url).toMatch(/X-Amz-Signature=/);
    expect(url).toMatch(/X-Amz-Expires=60/);
  });
});
