export function normalizePattern(seq: number[]): string {
  if (seq.length < 4) throw new Error("Pattern must connect at least 4 dots");
  const set = new Set<number>();
  for (const n of seq) {
    if (!Number.isInteger(n) || n < 0 || n > 8) throw new Error("Invalid dot");
    if (set.has(n)) throw new Error("Duplicate dot");
    set.add(n);
  }
  return seq.join("-");
}

const MIDDLE: Record<string, number> = {
  "0-2": 1, "2-0": 1,
  "3-5": 4, "5-3": 4,
  "6-8": 7, "8-6": 7,
  "0-6": 3, "6-0": 3,
  "1-7": 4, "7-1": 4,
  "2-8": 5, "8-2": 5,
  "0-8": 4, "8-0": 4,
  "2-6": 4, "6-2": 4,
};

export function isValidPattern(seq: number[]): boolean {
  try { normalizePattern(seq); } catch { return false; }
  const seen = new Set<number>();
  for (let i = 0; i < seq.length; i++) {
    const curr = seq[i];
    if (i > 0) {
      const mid = MIDDLE[`${seq[i - 1]}-${curr}`];
      if (mid !== undefined && !seen.has(mid)) return false;
    }
    seen.add(curr);
  }
  return true;
}

import bcrypt from "bcryptjs";

export async function hashPattern(seq: number[]): Promise<string> {
  return bcrypt.hash(normalizePattern(seq), 12);
}

export async function verifyPattern(seq: number[], hash: string): Promise<boolean> {
  try {
    const normalized = normalizePattern(seq);
    return await bcrypt.compare(normalized, hash);
  } catch {
    return false;
  }
}
