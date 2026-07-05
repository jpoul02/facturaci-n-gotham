"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
import { ProductoDialog } from "@/components/catalogos/producto-dialog";
import type { Producto } from "@/lib/types";

export default function CatalogosPage() {
  const { usuarioActual } = useAuth();
  const router = useRouter();
  const { productos, toggleActivoProducto } = useVentas();
  const [dialogAbierto, setDialogAbierto] = useState(false);
  const [productoEditando, setProductoEditando] = useState<Producto | undefined>(undefined);

  useEffect(() => {
    if (usuarioActual && usuarioActual.rol !== "administrador") {
      router.replace("/");
    }
  }, [usuarioActual, router]);

  if (!usuarioActual || usuarioActual.rol !== "administrador") {
    return null;
  }

  const abrirNuevo = () => {
    setProductoEditando(undefined);
    setDialogAbierto(true);
  };

  const abrirEditar = (producto: Producto) => {
    setProductoEditando(producto);
    setDialogAbierto(true);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-ink-900">Catálogos</h1>
        <Button className="h-10" onClick={abrirNuevo}>
          + Nuevo producto
        </Button>
      </div>

      <div className="overflow-hidden rounded-lg border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead>Precio</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Activo</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {productos.map((producto) => (
              <TableRow key={producto.id}>
                <TableCell className="font-mono text-sm">{producto.codigo}</TableCell>
                <TableCell>{producto.nombre}</TableCell>
                <TableCell className="font-mono">${producto.precio.toFixed(2)}</TableCell>
                <TableCell>{producto.tipo}</TableCell>
                <TableCell>{producto.activo ? "Sí" : "No"}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button className="h-10" variant="outline" onClick={() => abrirEditar(producto)}>
                      Editar
                    </Button>
                    <Button
                      className="h-10"
                      variant="outline"
                      onClick={() => toggleActivoProducto(producto.id)}
                    >
                      {producto.activo ? "Desactivar" : "Activar"}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <ProductoDialog open={dialogAbierto} onOpenChange={setDialogAbierto} producto={productoEditando} />
    </div>
  );
}
