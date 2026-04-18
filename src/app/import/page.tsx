"use client";
import { useState } from "react";
import ImportForm from "@/components/Import/ImportForm";
import JobHistory from "@/components/Import/JobHistory";

export default function Import() {
  const [flag, setFlag] = useState(0);
  return (
    <main className="p-4 pt-10 pb-24 md:px-8 md:pt-12 md:pb-10 min-h-screen bg-[#09090b] flex flex-col gap-6 max-w-3xl mx-auto w-full">
      <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
        Import
      </h1>
      <ImportForm onImported={() => setFlag((f) => f + 1)} />
      <section>
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 h-px bg-gradient-to-r from-purple-500/20 to-transparent" />
          <h2 className="text-[11px] uppercase tracking-[0.15em] text-white/35 font-medium">Lịch sử</h2>
          <div className="flex-1 h-px bg-gradient-to-l from-pink-500/20 to-transparent" />
        </div>
        <JobHistory reloadFlag={flag} />
      </section>
    </main>
  );
}
