"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3,
  ClipboardCheck,
  History,
  LayoutDashboard,
  LogOut,
  Receipt,
  Settings,
  ShieldCheck,
  X,
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
  { href: "/seguridad", label: "Seguridad", icon: ShieldCheck, enabled: true, roles: ["administrador"] },
  { href: "/auditoria", label: "Auditoría", icon: History, enabled: true, roles: ["administrador"] },
];

interface AppSidebarProps {
  open: boolean;
  onClose: () => void;
}

export function AppSidebar({ open, onClose }: AppSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { usuarioActual, logout } = useAuth();

  const itemsVisibles = usuarioActual
    ? NAV_ITEMS.filter((item) => item.roles.includes(usuarioActual.rol))
    : [];

  const handleLogout = () => {
    onClose();
    logout();
    router.replace("/login");
  };

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-30 bg-ink-900/40 lg:hidden"
          aria-hidden
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex h-full w-60 shrink-0 flex-col border-r bg-white px-3 py-6 text-ink-900 transition-transform duration-200 ease-out",
          "lg:static lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="mb-8 flex items-center justify-between px-3">
          <span className="text-lg font-semibold tracking-tight text-ink-900">
            Adventure Works<span className="text-brand-600">·</span>Facturación
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar menú"
            className="rounded-md p-1 text-ink-900/60 hover:bg-slate-100 lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="flex flex-1 flex-col gap-1">
          {itemsVisibles.map(({ href, label, icon: Icon, enabled }) => {
            const active = enabled && (pathname === href || (href !== "/" && pathname.startsWith(href)));
            return (
              <Link
                key={href}
                href={enabled ? href : "#"}
                aria-disabled={!enabled}
                data-active={active}
                onClick={(e) => {
                  if (!enabled) {
                    e.preventDefault();
                    return;
                  }
                  onClose();
                }}
                className={cn(
                  "nav-glass-hover flex items-center gap-3 rounded-md border border-transparent px-3 py-2 text-sm text-ink-900/75",
                  !enabled && "cursor-not-allowed text-slate-400",
                  active && "font-medium text-ink-900"
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
          <div className="mt-4 border-t pt-4">
            <div className="px-3">
              <p className="truncate text-sm font-medium text-ink-900">{usuarioActual.nombre}</p>
              <p className="text-xs capitalize text-slate-500">{usuarioActual.rol}</p>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="mt-3 flex w-full items-center gap-3 rounded-md border border-transparent px-3 py-2 text-sm text-error-700 transition-colors hover:border-error-700/20 hover:bg-error-700/10"
            >
              <LogOut className="h-4 w-4" />
              Cerrar sesión
            </button>
          </div>
        )}
      </aside>
    </>
  );
}
