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
  icons: {
    icon: "/logo.png",
    apple: "/logo.png",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body className="bg-[#09090b] text-white min-h-screen">
        <PlayerProvider>
          <Sidebar />
          {/* Content area — shifts right on desktop to make room for sidebar */}
          <div className="md:ml-[220px] pb-40 md:pb-[96px]">
            <AnimatedChildren>{children}</AnimatedChildren>
          </div>
          <MiniPlayer />
          <TabBar />
        </PlayerProvider>
        <script dangerouslySetInnerHTML={{ __html: `if ("serviceWorker" in navigator) { navigator.serviceWorker.register("/sw.js").catch(() => {}); }` }} />
      </body>
    </html>
  );
}
