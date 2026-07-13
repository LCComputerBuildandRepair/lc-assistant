import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LC Computer Build & Repair — Assistant",
  description: "AI assistant and dashboard for LC Computer Build & Repair.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900">
        {children}
      </body>
    </html>
  );
}
