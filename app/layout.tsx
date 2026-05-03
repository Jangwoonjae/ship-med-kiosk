import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "선내 의약품 관리 키오스크",
  description: "선박 내 의약품 재고관리 시스템",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className="h-full">
      <body className="min-h-full flex flex-col font-sans antialiased bg-gray-50">{children}</body>
    </html>
  );
}
