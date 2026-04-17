import type { Parsed } from "@/lib/url-parser";

export type Preview = { title: string; artist: string | null; thumbnail: string | null };

export async function fetchPreview(p: Parsed): Promise<Preview | null> {
  const endpoint = p.source === "youtube"
    ? `https://www.youtube.com/oembed?url=${encodeURIComponent(p.url)}&format=json`
    : `https://soundcloud.com/oembed?url=${encodeURIComponent(p.url)}&format=json`;
  const r = await fetch(endpoint);
  if (!r.ok) return null;
  const data = await r.json() as { title?: string; author_name?: string; thumbnail_url?: string };
  if (!data.title) return null;
  return {
    title: data.title,
    artist: data.author_name ?? null,
    thumbnail: data.thumbnail_url ?? null,
  };
}
