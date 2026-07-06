"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useAuditoria, ACCION_LABELS } from "@/lib/auditoria-context";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function AuditoriaPage() {
  const { usuarioActual } = useAuth();
  const router = useRouter();
  const { eventos } = useAuditoria();

  useEffect(() => {
    if (usuarioActual && usuarioActual.rol !== "administrador") {
      router.replace("/");
    }
  }, [usuarioActual, router]);

  if (!usuarioActual || usuarioActual.rol !== "administrador") {
    return null;
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold text-ink-900">Auditoría</h1>

      {eventos.length === 0 ? (
        <p className="rounded-md border border-dashed p-6 text-center text-sm text-slate-500">
          Sin eventos todavía.
        </p>
      ) : (
        <div className="overflow-hidden rounded-lg border bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Usuario</TableHead>
                <TableHead>Acción</TableHead>
                <TableHead>Detalle</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {eventos.map((evento) => (
                <TableRow key={evento.id}>
                  <TableCell className="text-xs">
                    {new Date(evento.fecha).toLocaleString("es-SV")}
                  </TableCell>
                  <TableCell>{evento.usuarioNombre}</TableCell>
                  <TableCell>{ACCION_LABELS[evento.accion]}</TableCell>
                  <TableCell className="text-sm text-slate-600">{evento.detalle}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
