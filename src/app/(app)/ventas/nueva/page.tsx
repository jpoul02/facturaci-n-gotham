"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useVentas } from "@/lib/ventas-context";
import { ClienteCombobox } from "@/components/ventas/cliente-combobox";
import { ClienteNuevoDialog } from "@/components/ventas/cliente-nuevo-dialog";
import { CarritoBuilder } from "@/components/ventas/carrito-builder";
import { MetodoPagoSelector } from "@/components/ventas/metodo-pago-selector";
import { ReciboPreview } from "@/components/ventas/recibo-preview";
import { VentaStepper } from "@/components/ventas/venta-stepper";
import { Button } from "@/components/ui/button";
import type { LineaVenta, MetodoPago } from "@/lib/types";

export default function NuevaVentaPage() {
  const router = useRouter();
  const { crearVenta, getClientePorId } = useVentas();
  const [clienteId, setClienteId] = useState("");
  const [lineas, setLineas] = useState<LineaVenta[]>([]);
  const [metodoPago, setMetodoPago] = useState<MetodoPago | undefined>(undefined);
  const [dialogClienteAbierto, setDialogClienteAbierto] = useState(false);
  const [confirmando, setConfirmando] = useState(false);

  const cliente = getClientePorId(clienteId);
  const paso = !clienteId ? 1 : lineas.length === 0 ? 2 : !metodoPago ? 3 : 4;

  const handleConfirmar = () => {
    if (!metodoPago) return;
    setConfirmando(true);
    const ventaId = crearVenta(clienteId, lineas, metodoPago);
    toast.success("Venta confirmada, emitiendo comprobante...");
    router.push(`/ventas/${ventaId}`);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-ink-900">Nueva venta</h1>
        <VentaStepper pasoActual={paso} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="flex flex-col gap-6">
          <section className="flex flex-col gap-2">
            <label className="text-sm font-medium text-ink-900">Cliente</label>
            <ClienteCombobox
              value={clienteId}
              onChange={setClienteId}
              onRegistrarNuevo={() => setDialogClienteAbierto(true)}
            />
          </section>

          <section className="flex flex-col gap-2">
            <label className="text-sm font-medium text-ink-900">Productos</label>
            <CarritoBuilder lineas={lineas} onChange={setLineas} />
          </section>

          <section className="flex flex-col gap-2">
            <label className="text-sm font-medium text-ink-900">Método de pago</label>
            <MetodoPagoSelector value={metodoPago} onChange={setMetodoPago} />
          </section>

          <Button
            className="h-10 w-fit"
            disabled={!clienteId || lineas.length === 0 || !metodoPago || confirmando}
            onClick={handleConfirmar}
          >
            Confirmar venta
          </Button>
        </div>

        <ReciboPreview cliente={cliente} lineas={lineas} metodoPago={metodoPago} />
      </div>

      <ClienteNuevoDialog
        open={dialogClienteAbierto}
        onOpenChange={setDialogClienteAbierto}
        onCreado={setClienteId}
      />
    </div>
  );
}
