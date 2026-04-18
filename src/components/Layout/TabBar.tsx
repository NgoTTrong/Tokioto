"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ListMusic, PlusCircle } from "lucide-react";

const TABS = [
  { href: "/", label: "Tokioto", logo: true },
  { href: "/playlists", label: "Playlists", Icon: ListMusic },
  { href: "/import", label: "Import", Icon: PlusCircle },
] as const;

export default function TabBar() {
  const path = usePathname();
  if (path === "/login" || path === "/setup" || path.startsWith("/player")) return null;
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-black/85 backdrop-blur-2xl border-t border-white/[0.08] flex justify-around py-2 z-20">
      {TABS.map((t) => {
        const active = t.href === "/" ? path === "/" : path.startsWith(t.href);
        return (
          <Link
            key={t.href}
            href={t.href}
            className="relative flex flex-col items-center gap-1 px-6 py-1"
          >
            {active && (
              <span className="absolute -top-2 left-1/2 -translate-x-1/2 w-10 h-[2px] rounded-full bg-gradient-to-r from-purple-400 to-pink-400" />
            )}
            {"logo" in t ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src="/logo.png"
                alt="Tokioto"
                className={`w-[22px] h-[22px] object-contain transition-all duration-200 ${
                  active ? "drop-shadow-[0_0_6px_rgba(168,85,247,0.8)]" : "opacity-40"
                }`}
              />
            ) : (
              <t.Icon
                className={`w-[22px] h-[22px] transition-all duration-200 ${
                  active
                    ? "text-purple-400 drop-shadow-[0_0_6px_rgba(168,85,247,0.8)]"
                    : "text-white/40"
                }`}
              />
            )}
            <span
              className={`text-[11px] font-medium transition-all duration-200 ${
                active
                  ? "bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent"
                  : "text-white/40"
              }`}
            >
              {t.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
