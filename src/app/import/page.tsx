"use client";
import { useState } from "react";
import ImportForm from "@/components/Import/ImportForm";
import JobHistory from "@/components/Import/JobHistory";

export default function Import() {
  const [flag, setFlag] = useState(0);
  return (
    <main className="p-4 pt-8 flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Import</h1>
      <ImportForm onImported={() => setFlag(f => f + 1)} />
      <section>
        <h2 className="text-sm uppercase tracking-wider opacity-60 mb-2">Lịch sử</h2>
        <JobHistory reloadFlag={flag} />
      </section>
    </main>
  );
}
