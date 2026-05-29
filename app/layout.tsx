import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Text till ljud",
  description: "Konvertera text till ljudfiler för elever",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="sv">
      <body className="bg-slate-50 min-h-screen">{children}</body>
    </html>
  );
}
