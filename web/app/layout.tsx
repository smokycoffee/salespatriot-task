import type { Metadata, Viewport } from "next";
import { Barlow, Barlow_Semi_Condensed, Geist_Mono } from "next/font/google";
import "./globals.css";

const barlow = Barlow({ variable: "--font-text", subsets: ["latin"], weight: ["400", "500", "600"] });
const condensed = Barlow_Semi_Condensed({ variable: "--font-label", subsets: ["latin"], weight: ["500", "600", "700"] });
const mono = Geist_Mono({ variable: "--font-code", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "DIBBS Solicitation Browser · SalesPatriot",
  description: "Browse, search and filter recent DLA RFQs from DIBBS, and open each one to quote.",
};

export const viewport: Viewport = { themeColor: "#e8ebee" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${barlow.variable} ${condensed.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
