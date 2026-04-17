import type { Metadata } from "next";
import "./globals.css";
import TabBar from "@/components/Layout/TabBar";

export const metadata: Metadata = {
  title: "Tokioto",
  description: "Personal music",
  manifest: "/manifest.json",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body className="bg-black text-white min-h-screen">
        <div className="pb-20">{children}</div>
        <TabBar />
      </body>
    </html>
  );
}
