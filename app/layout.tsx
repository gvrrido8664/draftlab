import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Draftlab — Sala de draft",
  description: "Picks, bans y scouting para equipos amateurs de League of Legends.",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className="antialiased">{children}</body>
    </html>
  );
}
