"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, LayoutDashboard, Receipt, Settings, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard, enabled: true },
  { href: "/ventas", label: "Ventas", icon: Receipt, enabled: true },
  { href: "/reportes", label: "Reportes", icon: BarChart3, enabled: false },
  { href: "/catalogos", label: "Catálogos", icon: Settings, enabled: false },
  { href: "/seguridad", label: "Seguridad", icon: ShieldCheck, enabled: false },
] as const;

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-60 shrink-0 flex-col bg-ink-900 px-3 py-6 text-slate-200">
      <div className="mb-8 px-3 text-lg font-semibold tracking-tight text-white">
        GOTHAM<span className="text-brand-600">·</span>Facturación
      </div>
      <nav className="flex flex-1 flex-col gap-1">
        {NAV_ITEMS.map(({ href, label, icon: Icon, enabled }) => {
          const active = enabled && (pathname === href || (href !== "/" && pathname.startsWith(href)));
          return (
            <Link
              key={href}
              href={enabled ? href : "#"}
              aria-disabled={!enabled}
              onClick={(e) => {
                if (!enabled) e.preventDefault();
              }}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                enabled ? "hover:bg-white/5" : "cursor-not-allowed text-slate-500",
                active && "bg-brand-600/15 text-white"
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
              {!enabled && <span className="ml-auto text-[10px] uppercase tracking-wide">Pronto</span>}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
