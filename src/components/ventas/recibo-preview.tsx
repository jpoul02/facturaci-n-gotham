import { calcularTotalesVenta } from "@/lib/calculos";
import type { Cliente, LineaVenta, MetodoPago } from "@/lib/types";
import { METODO_PAGO_LABELS } from "@/components/ventas/metodo-pago-selector";

interface ReciboPreviewProps {
  cliente?: Cliente;
  lineas: LineaVenta[];
  metodoPago?: MetodoPago;
}

export function ReciboPreview({ cliente, lineas, metodoPago }: ReciboPreviewProps) {
  const totales = calcularTotalesVenta(
    lineas.map((l) => ({ cantidad: l.cantidad, precioUnitario: l.precioUnitario, descuentoPct: l.descuentoPct }))
  );

  return (
    <div className="recibo-perforado rounded-b-lg border bg-white p-6 pt-8 shadow-sm">
      <div className="mb-4 border-b border-dashed pb-4">
        <p className="text-xs uppercase tracking-widest text-slate-400">Comprobante</p>
        <p className="font-mono text-sm text-slate-500">Pendiente de emisión</p>
      </div>

      {metodoPago && (
        <p className="mb-4 text-sm text-slate-500">
          Método de pago:{" "}
          <span className="font-medium text-ink-900">{METODO_PAGO_LABELS[metodoPago]}</span>
        </p>
      )}

      <div className="mb-4 text-sm">
        <p className="text-slate-500">Cliente</p>
        <p className="font-medium text-ink-900">{cliente?.nombre ?? "Sin seleccionar"}</p>
        {cliente && <p className="font-mono text-xs text-slate-500">{cliente.nit}</p>}
      </div>

      <ul className="mb-4 flex flex-col gap-1 text-sm">
        {lineas.map((linea) => (
          <li key={linea.id} className="flex justify-between gap-2">
            <span className="text-slate-600">
              {linea.cantidad}× {linea.nombreProducto}
            </span>
            <span className="font-mono">${linea.subtotal.toFixed(2)}</span>
          </li>
        ))}
        {lineas.length === 0 && <li className="text-slate-400">Sin productos todavía</li>}
      </ul>

      <div className="flex flex-col gap-1 border-t pt-3 text-sm">
        <div className="flex justify-between text-slate-500">
          <span>Subtotal</span>
          <span className="font-mono">${totales.subtotal.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-slate-500">
          <span>IVA (13%)</span>
          <span className="font-mono">${totales.impuesto.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-lg font-[family-name:var(--font-fraunces)]">
          <span className="font-semibold text-ink-900">Total</span>
          <span className="font-semibold text-ink-900">${totales.total.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
}
