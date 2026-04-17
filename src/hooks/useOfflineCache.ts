"use client";

const CACHE = "tokioto-audio-v1";
const key = (id: string) => `offline://audio/${id}`;

export async function cacheTrack(id: string) {
  const cache = await caches.open(CACHE);
  const resp = await fetch(`/api/tracks/${id}/stream`, { redirect: "follow" });
  if (!resp.ok) throw new Error("fetch failed");
  await cache.put(key(id), resp);
}

export async function uncacheTrack(id: string) {
  const cache = await caches.open(CACHE);
  await cache.delete(key(id));
}

export async function hasCached(id: string): Promise<boolean> {
  const cache = await caches.open(CACHE);
  return !!(await cache.match(key(id)));
}

export async function getCached(id: string): Promise<Response | null> {
  const cache = await caches.open(CACHE);
  return (await cache.match(key(id))) ?? null;
}

export async function clearAll() {
  await caches.delete(CACHE);
}

export async function totalSize(): Promise<number> {
  const cache = await caches.open(CACHE);
  const keys = await cache.keys();
  let total = 0;
  for (const k of keys) {
    const r = await cache.match(k);
    if (r) total += Number(r.headers.get("content-length") || 0);
  }
  return total;
}
