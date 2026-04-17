import { describe, it, expect } from "vitest";
import { parseSourceUrl } from "@/lib/url-parser";

describe("parseSourceUrl", () => {
  it.each([
    ["https://www.youtube.com/watch?v=dQw4w9WgXcQ", "youtube", "dQw4w9WgXcQ"],
    ["https://youtu.be/dQw4w9WgXcQ", "youtube", "dQw4w9WgXcQ"],
    ["https://music.youtube.com/watch?v=dQw4w9WgXcQ&si=xyz", "youtube", "dQw4w9WgXcQ"],
    ["https://soundcloud.com/artist/track-name", "soundcloud", "artist/track-name"],
  ])("%s → %s/%s", (url, source, id) => {
    expect(parseSourceUrl(url)).toEqual({ source, id, url });
  });
  it("returns null for unsupported", () => {
    expect(parseSourceUrl("https://spotify.com/track/abc")).toBeNull();
  });
});
