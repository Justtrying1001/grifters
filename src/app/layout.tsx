import type { Metadata } from "next";
import "./globals.css";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { DisclaimerBanner } from "@/components/shared/disclaimer-banner";
import { Providers } from "@/components/providers";

export const metadata: Metadata = {
  title: "Grifter — Crypto Incident Database",
  description:
    "Evidence-based documentation of crypto scams, rug pulls, and grift incidents. All claims sourced and presented neutrally.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="font-sans antialiased bg-zinc-50 text-zinc-900">
        <Providers>
          <Navbar />
          <DisclaimerBanner />
          <main className="min-h-screen">{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
