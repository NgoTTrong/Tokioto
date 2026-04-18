"use client";
import { useEffect, useState } from "react";
import { X, RefreshCw, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

type Job = {
  id: string;
  status: string;
  error_message: string | null;
  created_at: string;
  track: { title: string; thumbnail_url: string | null } | null;
};

function StatusIcon({ status }: { status: string }) {
  if (status === "queued") return <Loader2 className="w-4 h-4 animate-spin text-purple-400" />;
  if (status === "running") return <Loader2 className="w-4 h-4 animate-spin text-pink-400" />;
  if (status === "done") return <CheckCircle2 className="w-4 h-4 text-green-400" />;
  if (status === "failed") return <AlertCircle className="w-4 h-4 text-red-400" />;
  return null;
}

function statusLabel(status: string): string {
  if (status === "queued") return "Đang chờ";
  if (status === "running") return "Đang xử lý";
  if (status === "done") return "Hoàn thành";
  if (status === "failed") return "Thất bại";
  return status;
}

function statusColor(status: string): string {
  if (status === "queued") return "text-purple-300";
  if (status === "running") return "text-pink-300";
  if (status === "done") return "text-green-400";
  if (status === "failed") return "text-red-400";
  return "text-white/60";
}

function JobSkeleton() {
  return (
    <li className="rounded-xl bg-white/[0.04] border border-white/[0.07] p-3 flex items-center gap-3">
      <div className="w-10 h-10 rounded-lg flex-shrink-0 bg-white/[0.07] animate-pulse" />
      <div className="flex-1 space-y-2">
        <div className="h-3.5 rounded-full bg-white/[0.07] animate-pulse w-2/3" />
        <div className="h-3 rounded-full bg-white/[0.05] animate-pulse w-1/3" />
      </div>
    </li>
  );
}

export default function JobHistory({ reloadFlag }: { reloadFlag: number }) {
  const [jobs, setJobs] = useState<Job[] | null>(null);
  const [retrying, setRetrying] = useState<Set<string>>(new Set());

  useEffect(() => {
    setJobs(null);
    const load = () =>
      fetch("/api/import-jobs")
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (d?.jobs) setJobs(d.jobs);
        });
    load();
    const t = setInterval(load, 3000);
    return () => clearInterval(t);
  }, [reloadFlag]);

  const deleteJob = async (id: string) => {
    setJobs((prev) => prev ? prev.filter((j) => j.id !== id) : prev);
    await fetch(`/api/import-jobs/${id}`, { method: "DELETE" });
  };

  const retry = async (id: string) => {
    setRetrying((prev) => new Set(prev).add(id));
    // Optimistically update status so UI feels instant
    setJobs((prev) => prev
      ? prev.map((j) => j.id === id ? { ...j, status: "queued", error_message: null } : j)
      : prev
    );
    await fetch(`/api/import-jobs/${id}/retry`, { method: "POST" });
    setRetrying((prev) => { const s = new Set(prev); s.delete(id); return s; });
  };

  if (jobs === null) {
    return (
      <ul className="flex flex-col gap-2">
        {[0, 1, 2].map((i) => <JobSkeleton key={i} />)}
      </ul>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {jobs.map((j) => {
        const thumbSrc = j.track?.thumbnail_url?.startsWith("http")
          ? j.track.thumbnail_url
          : j.track?.thumbnail_url
          ? `/api/r2/${j.track.thumbnail_url}`
          : null;

        return (
          <li
            key={j.id}
            className="rounded-xl bg-white/[0.04] border border-white/[0.07] p-3 flex items-center gap-3"
          >
            <div className="w-10 h-10 rounded-lg flex-shrink-0 overflow-hidden bg-gradient-to-br from-purple-900/40 to-pink-900/40">
              {thumbSrc && (
                <img
                  src={thumbSrc}
                  alt=""
                  className="w-10 h-10 rounded-lg object-cover bg-white/10"
                />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="truncate text-sm text-white font-medium">
                {j.track?.title ?? j.id}
              </div>
              <div className={`text-xs flex items-center gap-1 mt-0.5 ${statusColor(j.status)}`}>
                <StatusIcon status={j.status} />
                {statusLabel(j.status)}
                {j.error_message ? ` — ${j.error_message}` : ""}
              </div>
            </div>
            {j.status === "failed" && (
              <button
                onClick={() => retry(j.id)}
                disabled={retrying.has(j.id)}
                className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-purple-600/30 text-purple-300 border border-purple-500/30 hover:bg-purple-600/50 transition-colors flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RefreshCw className={`w-3 h-3 ${retrying.has(j.id) ? "animate-spin" : ""}`} />
                {retrying.has(j.id) ? "Đang gửi…" : "Thử lại"}
              </button>
            )}
            <button
              onClick={() => deleteJob(j.id)}
              className="ml-auto p-1.5 rounded-lg hover:bg-white/10 text-white/30 hover:text-white/70 transition-colors flex-shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </li>
        );
      })}
    </ul>
  );
}
