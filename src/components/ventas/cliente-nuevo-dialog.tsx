"use client";

import { useState } from "react";
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

interface ClienteNuevoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreado: (clienteId: string) => void;
}

export function ClienteNuevoDialog({ open, onOpenChange, onCreado }: ClienteNuevoDialogProps) {
  const { registrarCliente, buscarClientePorNit } = useVentas();
  const [nombre, setNombre] = useState("");
  const [nit, setNit] = useState("");

  const handleSubmit = () => {
    if (!nombre.trim() || !nit.trim()) return;

    const existente = buscarClientePorNit(nit.trim());
    if (existente) {
      toast.error("Ya existe un cliente con ese NIT/DUI", { description: existente.nombre });
      onCreado(existente.id);
      onOpenChange(false);
      return;
    }

    const nuevo = registrarCliente({ nombre: nombre.trim(), tipoDocumento: "NIT", nit: nit.trim() });
    toast.success("Cliente registrado");
    onCreado(nuevo.id);
    setNombre("");
    setNit("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar cliente nuevo</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="nombre">Nombre completo / Razón social</Label>
            <Input id="nombre" className="h-10" value={nombre} onChange={(e) => setNombre(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="nit">NIT / DUI</Label>
            <Input id="nit" className="h-10" value={nit} onChange={(e) => setNit(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button className="h-10" onClick={handleSubmit} disabled={!nombre.trim() || !nit.trim()}>
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
