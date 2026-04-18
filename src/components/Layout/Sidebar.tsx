"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";
import { Library, ListMusic, PlusCircle, PanelLeftClose, PanelLeftOpen, Settings } from "lucide-react";
import logoImg from "@/../public/logo.png";

const TABS = [
  { href: "/", label: "Tokioto", Icon: Library },
  { href: "/playlists", label: "Playlists", Icon: ListMusic },
  { href: "/import", label: "Import", Icon: PlusCircle },
];

const STORAGE_KEY = "tokioto:sidebar-collapsed";
const EXPANDED_W = "220px";
const COLLAPSED_W = "72px";

const listeners = new Set<() => void>();
function readCollapsed(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}
function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => { listeners.delete(cb); };
}
function setCollapsed(v: boolean) {
  try { localStorage.setItem(STORAGE_KEY, v ? "1" : "0"); } catch {}
  document.documentElement.style.setProperty("--sidebar-w", v ? COLLAPSED_W : EXPANDED_W);
  listeners.forEach(l => l());
}

export default function Sidebar() {
  const path = usePathname();
  const collapsed = useSyncExternalStore(subscribe, readCollapsed, () => false);

  if (path === "/login" || path === "/setup") return null;

  return (
    <aside
      className="hidden md:flex fixed left-0 top-0 bottom-0 flex-col z-20 border-r border-white/[0.06] transition-[width] duration-200 ease-out overflow-hidden"
      style={{
        width: collapsed ? COLLAPSED_W : EXPANDED_W,
        background: "rgba(8,8,10,0.98)",
        backdropFilter: "blur(24px)",
      }}
    >
      {/* Header */}
      <div className="h-[64px] flex items-center flex-shrink-0">
        {collapsed ? (
          <button
            onClick={() => setCollapsed(false)}
            className="mx-auto w-10 h-10 flex items-center justify-center rounded-lg text-white/50 hover:text-white hover:bg-white/[0.08] transition-colors"
            title="Mở rộng"
          >
            <PanelLeftOpen size={18} />
          </button>
        ) : (
          <div className="w-full px-5 flex items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logoImg.src} alt="Tokioto" width={34} height={34} className="flex-shrink-0" />
            <span className="font-bold text-[17px] tracking-tight bg-gradient-to-r from-purple-300 to-pink-300 bg-clip-text text-transparent">
              Tokioto
            </span>
            <button
              onClick={() => setCollapsed(true)}
              className="ml-auto w-8 h-8 flex items-center justify-center rounded-lg text-white/40 hover:text-white hover:bg-white/[0.08] transition-colors"
              title="Thu gọn"
            >
              <PanelLeftClose size={18} />
            </button>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 flex flex-col gap-0.5 pt-1">
        {TABS.map(t => {
          const active = t.href === "/" ? path === "/" : path.startsWith(t.href);
          return (
            <Link
              key={t.href}
              href={t.href}
              title={collapsed ? t.label : undefined}
              className={`flex items-center rounded-xl transition-all duration-150 ${
                collapsed ? "justify-center h-10" : "gap-3 px-3 py-2.5"
              } ${
                active
                  ? "bg-white/[0.08] text-white"
                  : "text-white/40 hover:text-white/80 hover:bg-white/[0.04]"
              }`}
            >
              <t.Icon
                size={18}
                className={`flex-shrink-0 transition-colors ${active ? "text-purple-400" : ""}`}
              />
              {!collapsed && (
                <>
                  <span className="text-sm font-medium whitespace-nowrap">{t.label}</span>
                  {active && (
                    <span className="ml-auto w-1.5 h-1.5 rounded-full bg-purple-400 flex-shrink-0" />
                  )}
                </>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Settings at bottom */}
      <div className="px-3 pb-3 flex-shrink-0 border-t border-white/[0.05] pt-2">
        <Link
          href="/setup"
          title={collapsed ? "Cài đặt" : undefined}
          className={`flex items-center rounded-xl transition-all duration-150 ${
            collapsed ? "justify-center h-10" : "gap-3 px-3 py-2.5"
          } ${
            path === "/setup"
              ? "bg-white/[0.08] text-white"
              : "text-white/30 hover:text-white/70 hover:bg-white/[0.04]"
          }`}
        >
          <Settings size={16} className={`flex-shrink-0 ${path === "/setup" ? "text-purple-400" : ""}`} />
          {!collapsed && <span className="text-xs font-medium whitespace-nowrap">Cài đặt</span>}
        </Link>
        {!collapsed && <p className="text-[10px] text-white/10 tracking-widest uppercase mt-2 px-3">v1.0</p>}
      </div>
    </aside>
  );
}
