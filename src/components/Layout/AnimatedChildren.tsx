"use client";
import { usePathname } from "next/navigation";
import { ReactNode } from "react";

export default function AnimatedChildren({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isPlayer = pathname.startsWith("/player");

  return (
    <div
      key={pathname}
      className={isPlayer ? "" : "page-enter"}
      style={{ minHeight: "100%" }}
    >
      {children}
    </div>
  );
}
