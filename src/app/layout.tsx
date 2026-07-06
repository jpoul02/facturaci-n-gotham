import type { Metadata } from "next";
import { Geist, Geist_Mono, Fraunces } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import { AuditoriaProvider } from "@/lib/auditoria-context";
import { VentasProvider } from "@/lib/ventas-context";
import { Toaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  weight: ["600"],
});

export const metadata: Metadata = {
  title: "Facturación Electrónica — GOTHAM",
  description: "Prototipo de sistema de ventas y facturación electrónica (DTE)",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <AuditoriaProvider>
          <AuthProvider>
            <VentasProvider>{children}</VentasProvider>
          </AuthProvider>
        </AuditoriaProvider>
        <Toaster />
      </body>
    </html>
  );
}
