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
import type { Producto } from "@/lib/types";

interface ProductoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  producto?: Producto;
}

export function ProductoDialog({ open, onOpenChange, producto }: ProductoDialogProps) {
  const { crearProducto, actualizarProducto } = useVentas();
  const [nombre, setNombre] = useState("");
  const [codigo, setCodigo] = useState("");
  const [precio, setPrecio] = useState("");
  const [tipo, setTipo] = useState("");

  useEffect(() => {
    if (open) {
      setNombre(producto?.nombre ?? "");
      setCodigo(producto?.codigo ?? "");
      setPrecio(producto ? String(producto.precio) : "");
      setTipo(producto?.tipo ?? "");
    }
  }, [open, producto]);

  const precioNumero = Number(precio);
  const precioValido = precio.trim() !== "" && !Number.isNaN(precioNumero) && precioNumero > 0;
  const puedeGuardar =
    nombre.trim() !== "" && codigo.trim() !== "" && tipo.trim() !== "" && precioValido;

  const handleSubmit = () => {
    if (!puedeGuardar) return;
    if (producto) {
      actualizarProducto(producto.id, {
        nombre: nombre.trim(),
        codigo: codigo.trim(),
        precio: precioNumero,
        tipo: tipo.trim(),
      });
      toast.success("Producto actualizado");
    } else {
      crearProducto({
        nombre: nombre.trim(),
        codigo: codigo.trim(),
        precio: precioNumero,
        tipo: tipo.trim(),
        activo: true,
      });
      toast.success("Producto creado");
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{producto ? "Editar producto" : "Nuevo producto"}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="nombre">Nombre</Label>
            <Input id="nombre" className="h-10" value={nombre} onChange={(e) => setNombre(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="codigo">Código</Label>
            <Input id="codigo" className="h-10" value={codigo} onChange={(e) => setCodigo(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="precio">Precio</Label>
            <Input
              id="precio"
              type="number"
              step="0.01"
              className="h-10"
              value={precio}
              onChange={(e) => setPrecio(e.target.value)}
            />
            {precio.trim() !== "" && !precioValido && (
              <p className="text-sm text-error-700">El precio debe ser un número mayor a 0.</p>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="tipo">Tipo</Label>
            <Input id="tipo" className="h-10" value={tipo} onChange={(e) => setTipo(e.target.value)} />
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
