import type { Metadata } from "next";
import "./globals.css";
import { PlayerProvider } from "@/contexts/PlayerContext";
import TabBar from "@/components/Layout/TabBar";
import Sidebar from "@/components/Layout/Sidebar";
import MiniPlayer from "@/components/Player/MiniPlayer";
import AnimatedChildren from "@/components/Layout/AnimatedChildren";

export const metadata: Metadata = {
  title: "Tokioto",
  description: "Personal music",
  manifest: "/manifest.json",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `try { var c = localStorage.getItem("tokioto:sidebar-collapsed") === "1"; document.documentElement.style.setProperty("--sidebar-w", c ? "72px" : "220px"); } catch(e) {}`,
          }}
        />
      </head>
      <body className="bg-[#09090b] text-white min-h-screen">
        <PlayerProvider>
          <Sidebar />
          {/* Content area — shifts right on desktop to make room for sidebar */}
          <AnimatedChildren>{children}</AnimatedChildren>
          <MiniPlayer />
          <TabBar />
        </PlayerProvider>
        <script dangerouslySetInnerHTML={{ __html: `if ("serviceWorker" in navigator) { navigator.serviceWorker.register("/sw.js").catch(() => {}); }` }} />
      </body>
    </html>
  );
}
