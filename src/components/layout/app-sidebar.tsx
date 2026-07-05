"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3,
  ClipboardCheck,
  LayoutDashboard,
  LogOut,
  Receipt,
  Settings,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import type { Rol } from "@/lib/mock-data/usuarios";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  enabled: boolean;
  roles: Rol[];
}

const TODOS_LOS_ROLES: Rol[] = ["vendedor", "supervisor", "administrador"];

const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard, enabled: true, roles: TODOS_LOS_ROLES },
  { href: "/ventas", label: "Ventas", icon: Receipt, enabled: true, roles: TODOS_LOS_ROLES },
  { href: "/aprobaciones", label: "Aprobaciones", icon: ClipboardCheck, enabled: true, roles: ["supervisor", "administrador"] },
  { href: "/reportes", label: "Reportes", icon: BarChart3, enabled: true, roles: ["supervisor", "administrador"] },
  { href: "/catalogos", label: "Catálogos", icon: Settings, enabled: true, roles: ["administrador"] },
  { href: "/seguridad", label: "Seguridad", icon: ShieldCheck, enabled: false, roles: ["administrador"] },
];

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { usuarioActual, logout } = useAuth();

  const itemsVisibles = usuarioActual
    ? NAV_ITEMS.filter((item) => item.roles.includes(usuarioActual.rol))
    : [];

  const handleLogout = () => {
    logout();
    router.replace("/login");
  };

  return (
    <aside className="flex h-full w-60 shrink-0 flex-col bg-ink-900 px-3 py-6 text-slate-200">
      <div className="mb-8 px-3 text-lg font-semibold tracking-tight text-white">
        GOTHAM<span className="text-brand-600">·</span>Facturación
      </div>
      <nav className="flex flex-1 flex-col gap-1">
        {itemsVisibles.map(({ href, label, icon: Icon, enabled }) => {
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

      {usuarioActual && (
        <div className="mt-4 border-t border-white/10 pt-4">
          <div className="px-3">
            <p className="truncate text-sm font-medium text-white">{usuarioActual.nombre}</p>
            <p className="text-xs capitalize text-slate-400">{usuarioActual.rol}</p>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="mt-3 flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-slate-300 transition-colors hover:bg-white/5"
          >
            <LogOut className="h-4 w-4" />
            Cerrar sesión
          </button>
        </div>
      )}
    </aside>
  );
}
