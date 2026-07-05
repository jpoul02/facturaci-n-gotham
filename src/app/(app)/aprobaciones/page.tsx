"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import { useVentas } from "@/lib/ventas-context";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function AprobacionesPage() {
  const { usuarioActual } = useAuth();
  const router = useRouter();
  const { ventas, getClientePorId, aprobarAnulacion, rechazarAnulacion } = useVentas();

  useEffect(() => {
    if (usuarioActual && usuarioActual.rol === "vendedor") {
      router.replace("/");
    }
  }, [usuarioActual, router]);

  if (!usuarioActual || usuarioActual.rol === "vendedor") {
    return null;
  }

  const solicitudes = ventas.filter((v) => v.estado === "anulacion_solicitada");

  const handleAprobar = (ventaId: string) => {
    aprobarAnulacion(ventaId);
    toast.success("Anulación aprobada");
  };

  const handleRechazar = (ventaId: string) => {
    rechazarAnulacion(ventaId);
    toast.success("Anulación rechazada");
  };

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold text-ink-900">Aprobaciones</h1>

      <div className="overflow-hidden rounded-lg border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cliente</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Motivo</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {solicitudes.map((venta) => {
              const cliente = getClientePorId(venta.clienteId);
              return (
                <TableRow key={venta.id}>
                  <TableCell>{cliente?.nombre ?? "—"}</TableCell>
                  <TableCell className="font-mono">${venta.total.toFixed(2)}</TableCell>
                  <TableCell className="max-w-xs truncate">{venta.motivoAnulacion}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button className="h-10" variant="outline" onClick={() => handleRechazar(venta.id)}>
                        Rechazar
                      </Button>
                      <Button className="h-10" onClick={() => handleAprobar(venta.id)}>
                        Aprobar
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
            {solicitudes.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="py-10 text-center text-slate-500">
                  No hay solicitudes pendientes.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
