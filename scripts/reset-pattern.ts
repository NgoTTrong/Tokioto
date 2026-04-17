import readline from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { createClient } from "@supabase/supabase-js";
import { hashPattern, isValidPattern } from "../src/lib/pattern.js";

async function main() {
  const rl = readline.createInterface({ input: stdin, output: stdout });
  const raw = await rl.question("New pattern (digits 0-8, no spaces, e.g. 01258): ");
  rl.close();
  const seq = [...raw.trim()].map((c) => parseInt(c, 10));
  if (!isValidPattern(seq)) { console.error("Invalid pattern"); process.exit(1); }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const db = createClient(url, key, { auth: { persistSession: false } });
  const hash = await hashPattern(seq);
  const { data: user } = await db.from("users").select("id").limit(1).maybeSingle();
  if (user) {
    await db.from("users").update({ pattern_hash: hash, failed_attempts: 0, locked_until: null }).eq("id", user.id);
  } else {
    await db.from("users").insert({ pattern_hash: hash });
  }
  // Supabase requires a filter for delete; this dummy UUID matches no real session
  await db.from("sessions").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  console.log("Pattern updated. All sessions revoked.");
}
main().catch((e) => { console.error(e); process.exit(1); });
