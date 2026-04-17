export async function dispatchJob(payload: { job_id: string; track_id: string; source_url: string }) {
  const url = process.env.WORKER_URL!;
  const res = await fetch(`${url.replace(/\/$/, "")}/extract`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-worker-secret": process.env.WORKER_SECRET!,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok && res.status !== 202) {
    throw new Error(`worker ${res.status}`);
  }
}
