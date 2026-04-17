"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", label: "Library", icon: "♪" },
  { href: "/playlists", label: "Playlists", icon: "☰" },
  { href: "/import", label: "Import", icon: "+" },
];

export default function TabBar() {
  const path = usePathname();
  if (path === "/login" || path === "/setup") return null;
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-black/90 backdrop-blur border-t border-white/10 flex justify-around py-2 z-20">
      {TABS.map((t) => {
        const active = t.href === "/" ? path === "/" : path.startsWith(t.href);
        return (
          <Link key={t.href} href={t.href} className={`flex flex-col items-center gap-1 px-4 py-1 ${active ? "text-white" : "text-white/50"}`}>
            <span className="text-lg">{t.icon}</span>
            <span className="text-xs">{t.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
