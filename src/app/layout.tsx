import type { Metadata, Viewport } from "next";
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
  title: {
    default: "Adventure Works · Facturación",
    template: "%s — Adventure Works · Facturación",
  },
  description:
    "Sistema interno de ventas y facturación electrónica (DTE) de Adventure Works.",
  applicationName: "Adventure Works · Facturación",
};

export const viewport: Viewport = {
  themeColor: "#145C3F",
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
