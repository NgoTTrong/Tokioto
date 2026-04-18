"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Library, ListMusic, PlusCircle } from "lucide-react";

const TABS = [
  { href: "/", label: "Tokioto", Icon: Library },
  { href: "/playlists", label: "Playlists", Icon: ListMusic },
  { href: "/import", label: "Import", Icon: PlusCircle },
];

export default function Sidebar() {
  const path = usePathname();
  if (path === "/login" || path === "/setup") return null;

  return (
    <aside
      className="hidden md:flex fixed left-0 top-0 bottom-0 w-[220px] flex-col z-20 border-r border-white/[0.06]"
      style={{ background: "rgba(8,8,10,0.98)", backdropFilter: "blur(24px)" }}
    >
      {/* Logo */}
      <div className="px-5 py-5 flex items-center gap-2.5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="Tokioto" width={34} height={34} className="flex-shrink-0" />
        <span className="font-bold text-[17px] tracking-tight bg-gradient-to-r from-purple-300 to-pink-300 bg-clip-text text-transparent">
          Tokioto
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 flex flex-col gap-0.5 pt-1">
        {TABS.map(t => {
          const active = t.href === "/" ? path === "/" : path.startsWith(t.href);
          return (
            <Link
              key={t.href}
              href={t.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 ${
                active
                  ? "bg-white/[0.08] text-white"
                  : "text-white/40 hover:text-white/80 hover:bg-white/[0.04]"
              }`}
            >
              <t.Icon
                size={18}
                className={`flex-shrink-0 transition-colors ${active ? "text-purple-400" : ""}`}
              />
              <span className="text-sm font-medium">{t.label}</span>
              {active && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-purple-400 flex-shrink-0" />
              )}
            </Link>
          );
        })}
      </nav>

      <div className="px-5 py-4 border-t border-white/[0.05]">
        <p className="text-[10px] text-white/15 tracking-widest uppercase">v1.0</p>
      </div>
    </aside>
  );
}
