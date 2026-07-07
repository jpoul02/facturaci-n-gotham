"use client";

import { useState, type ReactNode } from "react";
import { Menu } from "lucide-react";
import { AppSidebar } from "./app-sidebar";

export function AppShell({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-canvas">
      <AppSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-3 border-b bg-white px-4 py-3 lg:hidden">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            aria-label="Abrir menú"
            className="rounded-md p-2 text-ink-900 hover:bg-slate-100"
          >
            <Menu className="h-5 w-5" />
          </button>
          <span className="text-sm font-semibold tracking-tight text-ink-900">
            Adventure Works<span className="text-brand-600">·</span>Facturación
          </span>
        </div>
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
