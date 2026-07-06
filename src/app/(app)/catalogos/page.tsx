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
import { TipoImpuestoDialog } from "@/components/catalogos/tipo-impuesto-dialog";
import type { Producto, TipoImpuesto } from "@/lib/types";

type Tab = "productos" | "impuestos";

export default function CatalogosPage() {
  const { usuarioActual } = useAuth();
  const router = useRouter();
  const { productos, toggleActivoProducto, tiposImpuesto, toggleActivoTipoImpuesto } = useVentas();
  const [tab, setTab] = useState<Tab>("productos");
  const [dialogProductoAbierto, setDialogProductoAbierto] = useState(false);
  const [productoEditando, setProductoEditando] = useState<Producto | undefined>(undefined);
  const [dialogImpuestoAbierto, setDialogImpuestoAbierto] = useState(false);
  const [tipoEditando, setTipoEditando] = useState<TipoImpuesto | undefined>(undefined);

  useEffect(() => {
    if (usuarioActual && usuarioActual.rol !== "administrador") {
      router.replace("/");
    }
  }, [usuarioActual, router]);

  if (!usuarioActual || usuarioActual.rol !== "administrador") {
    return null;
  }

  const abrirNuevoProducto = () => {
    setProductoEditando(undefined);
    setDialogProductoAbierto(true);
  };

  const abrirEditarProducto = (producto: Producto) => {
    setProductoEditando(producto);
    setDialogProductoAbierto(true);
  };

  const abrirNuevoTipo = () => {
    setTipoEditando(undefined);
    setDialogImpuestoAbierto(true);
  };

  const abrirEditarTipo = (tipo: TipoImpuesto) => {
    setTipoEditando(tipo);
    setDialogImpuestoAbierto(true);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-ink-900">Catálogos</h1>
        {tab === "productos" ? (
          <Button className="h-10" onClick={abrirNuevoProducto}>
            + Nuevo producto
          </Button>
        ) : (
          <Button className="h-10" onClick={abrirNuevoTipo}>
            + Nuevo tipo de impuesto
          </Button>
        )}
      </div>

      <div className="flex gap-2">
        <Button
          className="h-10"
          variant={tab === "productos" ? "default" : "outline"}
          onClick={() => setTab("productos")}
        >
          Productos
        </Button>
        <Button
          className="h-10"
          variant={tab === "impuestos" ? "default" : "outline"}
          onClick={() => setTab("impuestos")}
        >
          Tipos de impuesto
        </Button>
      </div>

      {tab === "productos" ? (
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
                      <Button className="h-10" variant="outline" onClick={() => abrirEditarProducto(producto)}>
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
      ) : (
        <div className="overflow-hidden rounded-lg border bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Porcentaje</TableHead>
                <TableHead>Activo</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tiposImpuesto.map((tipo) => (
                <TableRow key={tipo.id}>
                  <TableCell>{tipo.nombre}</TableCell>
                  <TableCell className="font-mono">{tipo.porcentaje}%</TableCell>
                  <TableCell>{tipo.activo ? "Sí" : "No"}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button className="h-10" variant="outline" onClick={() => abrirEditarTipo(tipo)}>
                        Editar
                      </Button>
                      <Button
                        className="h-10"
                        variant="outline"
                        onClick={() => toggleActivoTipoImpuesto(tipo.id)}
                      >
                        {tipo.activo ? "Desactivar" : "Activar"}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <ProductoDialog open={dialogProductoAbierto} onOpenChange={setDialogProductoAbierto} producto={productoEditando} />
      <TipoImpuestoDialog open={dialogImpuestoAbierto} onOpenChange={setDialogImpuestoAbierto} tipoImpuesto={tipoEditando} />
    </div>
  );
}
