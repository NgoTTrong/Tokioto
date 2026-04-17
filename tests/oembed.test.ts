import { describe, it, expect, vi, afterEach } from "vitest";
import { fetchPreview } from "@/lib/oembed";

afterEach(() => vi.restoreAllMocks());

describe("fetchPreview", () => {
  it("parses YouTube oEmbed", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue(new Response(JSON.stringify({
      title: "Never Gonna Give You Up", author_name: "Rick Astley", thumbnail_url: "https://img/yt.jpg",
    }), { headers: { "content-type": "application/json" } }));
    const r = await fetchPreview({ source: "youtube", id: "dQw4w9WgXcQ", url: "https://youtu.be/dQw4w9WgXcQ" });
    expect(r).toEqual({ title: "Never Gonna Give You Up", artist: "Rick Astley", thumbnail: "https://img/yt.jpg" });
  });
  it("parses SoundCloud oEmbed", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue(new Response(JSON.stringify({
      title: "Lofi Beat", author_name: "ChillHop", thumbnail_url: "https://img/sc.jpg",
    }), { headers: { "content-type": "application/json" } }));
    const r = await fetchPreview({ source: "soundcloud", id: "x/y", url: "https://soundcloud.com/x/y" });
    expect(r?.title).toBe("Lofi Beat");
  });
});
