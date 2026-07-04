"use client";

import { useState } from "react";
import Link from "next/link";
import { useVentas } from "@/lib/ventas-context";
import { StatusBadge } from "@/components/ventas/status-badge";
import { ReciboPreview } from "@/components/ventas/recibo-preview";
import { AnulacionDialog } from "@/components/ventas/anulacion-dialog";
import { Button } from "@/components/ui/button";

export function VentaDetailClient({ ventaId }: { ventaId: string }) {
  const { getVenta, getClientePorId, getFacturaByVentaId, reintentarEmision } = useVentas();
  const [dialogAnulacionAbierto, setDialogAnulacionAbierto] = useState(false);

  const venta = getVenta(ventaId);
  if (!venta) {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-slate-500">No se encontró la venta.</p>
        <Link href="/ventas" className="text-brand-600 underline">
          Volver a ventas
        </Link>
      </div>
    );
  }

  const cliente = getClientePorId(venta.clienteId);
  const factura = getFacturaByVentaId(ventaId);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold text-ink-900">
            Venta {factura?.correlativo ?? ventaId.slice(0, 8)}
          </h1>
          <StatusBadge estado={venta.estado} />
        </div>
        <Link href="/ventas" className="text-sm text-brand-600 underline">
          Volver a ventas
        </Link>
      </div>

      {venta.estado === "error_dte" && (
        <div className="flex items-center justify-between rounded-md border border-error-700/30 bg-error-700/5 px-4 py-3">
          <p className="text-sm text-error-700">El Nodo Fiscal rechazó la emisión de este comprobante.</p>
          <Button className="h-10" variant="outline" onClick={() => reintentarEmision(ventaId)}>
            Reintentar emisión
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_0.8fr]">
        <div className="flex flex-col gap-4">
          {factura && (
            <dl className="grid grid-cols-2 gap-3 rounded-lg border p-4 text-sm">
              <div>
                <dt className="text-slate-500">Código de generación</dt>
                <dd className="font-mono text-xs">{factura.codigoGeneracion}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Número de control</dt>
                <dd className="font-mono text-xs">{factura.numeroControl}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Sello de recepción</dt>
                <dd className="font-mono text-xs">{factura.selloRecepcion}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Fecha de emisión</dt>
                <dd className="text-xs">{new Date(factura.fechaEmision).toLocaleString("es-SV")}</dd>
              </div>
            </dl>
          )}

          {venta.estado === "autorizada" && (
            <div className="flex gap-3">
              <Button className="h-10" onClick={() => window.print()}>
                Descargar / Imprimir
              </Button>
              <Button className="h-10" variant="outline" onClick={() => setDialogAnulacionAbierto(true)}>
                Solicitar anulación
              </Button>
            </div>
          )}

          {venta.estado === "anulada" && venta.motivoAnulacion && (
            <p className="text-sm text-slate-500">Motivo de anulación: {venta.motivoAnulacion}</p>
          )}
        </div>

        <ReciboPreview cliente={cliente} lineas={venta.lineas} />
      </div>

      <AnulacionDialog
        open={dialogAnulacionAbierto}
        onOpenChange={setDialogAnulacionAbierto}
        ventaId={ventaId}
      />
    </div>
  );
}
