import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Plantilla de Ventas · Sistema integral",
  description: "Sistema web de registro de ventas con autenticación, reporte cruzado y exportación automática al libro Excel PLANTILLA DE VENTAS.",
  keywords: ["Ventas", "Plantilla", "Excel", "xlsm", "BCV", "Monitor", "Zelle", "Binance", "Bio Pago"],
  authors: [{ name: "Plantilla de Ventas" }],
  openGraph: {
    title: "Plantilla de Ventas",
    description: "Sistema integral de registro y reporte de ventas",
    siteName: "Plantilla de Ventas",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
        suppressHydrationWarning
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
