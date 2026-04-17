"use client";
import { useEffect, useState } from "react";

type Job = { id: string; status: string; error_message: string | null; created_at: string; track: { title: string; thumbnail_url: string | null } | null };

export default function JobHistory({ reloadFlag }: { reloadFlag: number }) {
  const [jobs, setJobs] = useState<Job[]>([]);
  useEffect(() => {
    const load = () => fetch("/api/import-jobs")
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.jobs) setJobs(d.jobs); });
    load();
    const t = setInterval(load, 3000);
    return () => clearInterval(t);
  }, [reloadFlag]);
  const retry = async (id: string) => { await fetch(`/api/import-jobs/${id}/retry`, { method: "POST" }); };
  return (
    <ul className="flex flex-col gap-2">
      {jobs.map(j => (
        <li key={j.id} className="flex items-center gap-3 p-2 rounded bg-white/5">
          <div className="flex-1 min-w-0">
            <div className="truncate">{j.track?.title ?? j.id}</div>
            <div className={`text-xs ${j.status === "failed" ? "text-red-400" : "text-white/60"}`}>{j.status}{j.error_message ? ` — ${j.error_message}` : ""}</div>
          </div>
          {j.status === "failed" && <button onClick={() => retry(j.id)} className="text-xs px-3 py-1 rounded bg-white text-black">Retry</button>}
        </li>
      ))}
    </ul>
  );
}
