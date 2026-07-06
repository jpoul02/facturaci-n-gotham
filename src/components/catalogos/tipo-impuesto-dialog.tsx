"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useVentas } from "@/lib/ventas-context";
import type { TipoImpuesto } from "@/lib/types";

interface TipoImpuestoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tipoImpuesto?: TipoImpuesto;
}

export function TipoImpuestoDialog({ open, onOpenChange, tipoImpuesto }: TipoImpuestoDialogProps) {
  const { crearTipoImpuesto, actualizarTipoImpuesto } = useVentas();
  const [nombre, setNombre] = useState("");
  const [porcentaje, setPorcentaje] = useState("");

  useEffect(() => {
    if (open) {
      setNombre(tipoImpuesto?.nombre ?? "");
      setPorcentaje(tipoImpuesto ? String(tipoImpuesto.porcentaje) : "");
    }
  }, [open, tipoImpuesto]);

  const porcentajeNumero = Number(porcentaje);
  const porcentajeValido =
    porcentaje.trim() !== "" &&
    !Number.isNaN(porcentajeNumero) &&
    porcentajeNumero >= 0 &&
    porcentajeNumero <= 100;
  const puedeGuardar = nombre.trim() !== "" && porcentajeValido;

  const handleSubmit = () => {
    if (!puedeGuardar) return;
    if (tipoImpuesto) {
      actualizarTipoImpuesto(tipoImpuesto.id, {
        nombre: nombre.trim(),
        porcentaje: porcentajeNumero,
      });
      toast.success("Tipo de impuesto actualizado");
    } else {
      crearTipoImpuesto({
        nombre: nombre.trim(),
        porcentaje: porcentajeNumero,
      });
      toast.success("Tipo de impuesto creado");
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{tipoImpuesto ? "Editar tipo de impuesto" : "Nuevo tipo de impuesto"}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="nombre">Nombre</Label>
            <Input id="nombre" className="h-10" value={nombre} onChange={(e) => setNombre(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="porcentaje">Porcentaje</Label>
            <Input
              id="porcentaje"
              type="number"
              step="0.01"
              min={0}
              max={100}
              className="h-10"
              value={porcentaje}
              onChange={(e) => setPorcentaje(e.target.value)}
            />
            {porcentaje.trim() !== "" && !porcentajeValido && (
              <p className="text-sm text-error-700">El porcentaje debe estar entre 0 y 100.</p>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button className="h-10" onClick={handleSubmit} disabled={!puedeGuardar}>
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
