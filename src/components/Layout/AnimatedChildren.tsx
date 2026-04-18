"use client";
import { usePathname } from "next/navigation";
import { ReactNode } from "react";

export default function AnimatedChildren({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isPlayer = pathname.startsWith("/player");
  const isFullscreen = pathname === "/login" || pathname === "/setup";

  return (
    <div
      className={[
        !isFullscreen ? "md:ml-[var(--sidebar-w)] md:transition-[margin-left] md:duration-200 md:ease-out" : "",
        !isFullscreen ? "pb-40 md:pb-[96px]" : "",
      ].join(" ")}
    >
      <div
        key={pathname}
        className={isPlayer ? "" : "page-enter"}
        style={{ minHeight: "100%" }}
      >
        {children}
      </div>
    </div>
  );
}
