"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { AppShell } from "@/components/layout/app-shell";

export default function AppGroupLayout({ children }: { children: React.ReactNode }) {
  const { usuarioActual, cargando } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!cargando && !usuarioActual) {
      router.replace("/login");
    }
  }, [cargando, usuarioActual, router]);

  if (cargando || !usuarioActual) {
    return null;
  }

  return <AppShell>{children}</AppShell>;
}
