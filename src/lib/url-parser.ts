export type Parsed = { source: "youtube" | "soundcloud"; id: string; url: string };

export function parseSourceUrl(raw: string): Parsed | null {
  let u: URL;
  try { u = new URL(raw.trim()); } catch { return null; }
  const host = u.hostname.replace(/^www\./, "");

  if (host === "youtube.com" || host === "m.youtube.com" || host === "music.youtube.com") {
    const id = u.searchParams.get("v");
    if (id) return { source: "youtube", id, url: raw };
  }
  if (host === "youtu.be") {
    const id = u.pathname.slice(1).split("/")[0];
    if (id) return { source: "youtube", id, url: raw };
  }
  if (host === "soundcloud.com") {
    const parts = u.pathname.split("/").filter(Boolean);
    if (parts.length >= 2) return { source: "soundcloud", id: `${parts[0]}/${parts[1]}`, url: raw };
  }
  return null;
}
