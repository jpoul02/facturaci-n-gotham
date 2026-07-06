"use client";

import { Banknote, CreditCard, Landmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { MetodoPago } from "@/lib/types";

export const METODO_PAGO_LABELS: Record<MetodoPago, string> = {
  efectivo: "Efectivo",
  tarjeta: "Tarjeta",
  transferencia: "Transferencia",
};

const OPCIONES: { valor: MetodoPago; icono: typeof Banknote }[] = [
  { valor: "efectivo", icono: Banknote },
  { valor: "tarjeta", icono: CreditCard },
  { valor: "transferencia", icono: Landmark },
];

interface MetodoPagoSelectorProps {
  value: MetodoPago | undefined;
  onChange: (metodo: MetodoPago) => void;
}

export function MetodoPagoSelector({ value, onChange }: MetodoPagoSelectorProps) {
  return (
    <div className="flex gap-2">
      {OPCIONES.map(({ valor, icono: Icono }) => (
        <Button
          key={valor}
          type="button"
          variant={value === valor ? "default" : "outline"}
          className="h-10 flex-1 gap-2"
          onClick={() => onChange(valor)}
        >
          <Icono className="h-4 w-4" />
          {METODO_PAGO_LABELS[valor]}
        </Button>
      ))}
    </div>
  );
}
