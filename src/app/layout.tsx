import type { Metadata, Viewport } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin", "latin-ext"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Kviz prve pomoći — Crveni krst Mionica",
  description:
    "Interaktivni trening kviz za takmičare i volontere u pružanju prve pomoći. Nasumična pitanja, više režima igre i praćenje napretka.",
};

export const viewport: Viewport = {
  themeColor: "#05070f",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="sr" className={manrope.variable}>
      <body className="antialiased">
        <div className="aurora" aria-hidden />
        <div className="grid-veil" aria-hidden />
        {children}
      </body>
    </html>
  );
}
