"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

export type AccionAuditoria =
  | "login"
  | "logout"
  | "cliente_registrado"
  | "producto_creado"
  | "producto_actualizado"
  | "producto_activado"
  | "producto_desactivado"
  | "venta_creada"
  | "anulacion_solicitada"
  | "anulacion_aprobada"
  | "anulacion_rechazada"
  | "emision_reintentada"
  | "usuario_creado"
  | "usuario_actualizado"
  | "usuario_activado"
  | "usuario_desactivado";

export const ACCION_LABELS: Record<AccionAuditoria, string> = {
  login: "Inicio de sesión",
  logout: "Cierre de sesión",
  cliente_registrado: "Cliente registrado",
  producto_creado: "Producto creado",
  producto_actualizado: "Producto actualizado",
  producto_activado: "Producto activado",
  producto_desactivado: "Producto desactivado",
  venta_creada: "Venta creada",
  anulacion_solicitada: "Anulación solicitada",
  anulacion_aprobada: "Anulación aprobada",
  anulacion_rechazada: "Anulación rechazada",
  emision_reintentada: "Reintento de emisión",
  usuario_creado: "Usuario creado",
  usuario_actualizado: "Usuario actualizado",
  usuario_activado: "Usuario activado",
  usuario_desactivado: "Usuario desactivado",
};

export interface EventoAuditoria {
  id: string;
  fecha: string;
  usuarioId: string | null;
  usuarioNombre: string;
  accion: AccionAuditoria;
  detalle: string;
}

interface AuditoriaContextValue {
  eventos: EventoAuditoria[];
  registrarEvento: (data: Omit<EventoAuditoria, "id" | "fecha">) => void;
}

const AuditoriaContext = createContext<AuditoriaContextValue | null>(null);

export function AuditoriaProvider({ children }: { children: ReactNode }) {
  const [eventos, setEventos] = useState<EventoAuditoria[]>([]);

  const registrarEvento = useCallback((data: Omit<EventoAuditoria, "id" | "fecha">) => {
    const evento: EventoAuditoria = {
      ...data,
      id: crypto.randomUUID(),
      fecha: new Date().toISOString(),
    };
    setEventos((prev) => [evento, ...prev]);
  }, []);

  return (
    <AuditoriaContext.Provider value={{ eventos, registrarEvento }}>
      {children}
    </AuditoriaContext.Provider>
  );
}

export function useAuditoria() {
  const ctx = useContext(AuditoriaContext);
  if (!ctx) throw new Error("useAuditoria debe usarse dentro de AuditoriaProvider");
  return ctx;
}

export function useAuditoriaOpcional() {
  return useContext(AuditoriaContext);
}
