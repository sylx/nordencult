import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nordencult - Character Editor",
  description: "Character data editor",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" data-theme="dark">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
