"use client";

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Cliente, Factura, LineaVenta, MetodoPago, Producto, Venta } from "@/lib/types";
import { clientesSeed, facturasSeed, productosSeed, ventasSeed } from "@/lib/mock-data/seed";
import { generarFactura } from "@/lib/mock-data/factura-generator";
import { calcularTotalesVenta } from "@/lib/calculos";
import { useAuthOpcional } from "@/lib/auth-context";
import { useAuditoriaOpcional } from "@/lib/auditoria-context";

export let randomFn: () => number = Math.random;
export function __setRandomForTesting(fn: () => number) {
  randomFn = fn;
}

interface VentasContextValue {
  clientes: Cliente[];
  productos: Producto[];
  ventas: Venta[];
  facturas: Factura[];
  buscarClientes: (query: string) => Cliente[];
  buscarClientePorNit: (nit: string) => Cliente | undefined;
  registrarCliente: (data: Omit<Cliente, "id">) => Cliente;
  buscarProductos: (query: string) => Producto[];
  crearProducto: (data: Omit<Producto, "id">) => Producto;
  actualizarProducto: (id: string, data: Partial<Omit<Producto, "id">>) => void;
  toggleActivoProducto: (id: string) => void;
  crearVenta: (clienteId: string, lineas: LineaVenta[], metodoPago: MetodoPago) => string;
  solicitarAnulacion: (ventaId: string, motivo: string) => void;
  aprobarAnulacion: (ventaId: string) => void;
  rechazarAnulacion: (ventaId: string) => void;
  reintentarEmision: (ventaId: string) => void;
  getVenta: (ventaId: string) => Venta | undefined;
  getClientePorId: (clienteId: string) => Cliente | undefined;
  getFacturaByVentaId: (ventaId: string) => Factura | undefined;
}

const VentasContext = createContext<VentasContextValue | null>(null);

export function VentasProvider({ children }: { children: ReactNode }) {
  const authCtx = useAuthOpcional();
  const auditoriaCtx = useAuditoriaOpcional();
  const usuarioActual = authCtx?.usuarioActual ?? null;
  const registrarEvento = auditoriaCtx?.registrarEvento;

  const [clientes, setClientes] = useState<Cliente[]>(clientesSeed);
  const [productos, setProductos] = useState<Producto[]>(productosSeed);
  const [ventas, setVentas] = useState<Venta[]>(ventasSeed);
  const [facturas, setFacturas] = useState<Factura[]>(facturasSeed);
  const secuenciaRef = useRef(facturasSeed.length + 1);

  const buscarClientes = useCallback(
    (query: string) => {
      const q = query.trim().toLowerCase();
      if (!q) return clientes;
      return clientes.filter(
        (c) => c.nombre.toLowerCase().includes(q) || c.nit.toLowerCase().includes(q)
      );
    },
    [clientes]
  );

  const buscarClientePorNit = useCallback(
    (nit: string) => clientes.find((c) => c.nit === nit),
    [clientes]
  );

  const registrarCliente = useCallback(
    (data: Omit<Cliente, "id">) => {
      const nuevo: Cliente = { ...data, id: crypto.randomUUID() };
      setClientes((prev) => [...prev, nuevo]);
      registrarEvento?.({
        usuarioId: usuarioActual?.id ?? null,
        usuarioNombre: usuarioActual?.nombre ?? "Sistema",
        accion: "cliente_registrado",
        detalle: `Cliente "${nuevo.nombre}" registrado`,
      });
      return nuevo;
    },
    [usuarioActual, registrarEvento]
  );

  const buscarProductos = useCallback(
    (query: string) => {
      const q = query.trim().toLowerCase();
      if (!q) return [];
      return productos.filter(
        (p) => p.nombre.toLowerCase().includes(q) || p.codigo.toLowerCase().includes(q)
      );
    },
    [productos]
  );

  const crearProducto = useCallback(
    (data: Omit<Producto, "id">) => {
      const nuevo: Producto = { ...data, id: crypto.randomUUID() };
      setProductos((prev) => [...prev, nuevo]);
      registrarEvento?.({
        usuarioId: usuarioActual?.id ?? null,
        usuarioNombre: usuarioActual?.nombre ?? "Sistema",
        accion: "producto_creado",
        detalle: `Producto "${nuevo.nombre}" creado`,
      });
      return nuevo;
    },
    [usuarioActual, registrarEvento]
  );

  const actualizarProducto = useCallback(
    (id: string, data: Partial<Omit<Producto, "id">>) => {
      const producto = productos.find((p) => p.id === id);
      setProductos((prev) => prev.map((p) => (p.id === id ? { ...p, ...data } : p)));
      if (producto) {
        registrarEvento?.({
          usuarioId: usuarioActual?.id ?? null,
          usuarioNombre: usuarioActual?.nombre ?? "Sistema",
          accion: "producto_actualizado",
          detalle: `Producto "${producto.nombre}" actualizado`,
        });
      }
    },
    [productos, usuarioActual, registrarEvento]
  );

  const toggleActivoProducto = useCallback(
    (id: string) => {
      const producto = productos.find((p) => p.id === id);
      if (!producto) return;
      const nuevoActivo = !producto.activo;
      setProductos((prev) => prev.map((p) => (p.id === id ? { ...p, activo: nuevoActivo } : p)));
      registrarEvento?.({
        usuarioId: usuarioActual?.id ?? null,
        usuarioNombre: usuarioActual?.nombre ?? "Sistema",
        accion: nuevoActivo ? "producto_activado" : "producto_desactivado",
        detalle: `Producto "${producto.nombre}" ${nuevoActivo ? "activado" : "desactivado"}`,
      });
    },
    [productos, usuarioActual, registrarEvento]
  );

  const resolverEmision = useCallback((ventaId: string) => {
    setVentas((prev) =>
      prev.map((v) => (v.id === ventaId ? { ...v, estado: "procesando_dte" } : v))
    );
    setTimeout(() => {
      const exito = randomFn() > 0.05;
      if (exito) {
        const secuencia = secuenciaRef.current++;
        const factura = generarFactura(ventaId, secuencia);
        setFacturas((prev) => [...prev, factura]);
        setVentas((prev) =>
          prev.map((v) => (v.id === ventaId ? { ...v, estado: "autorizada" } : v))
        );
      } else {
        setVentas((prev) =>
          prev.map((v) => (v.id === ventaId ? { ...v, estado: "error_dte" } : v))
        );
      }
    }, 1200);
  }, []);

  const crearVenta = useCallback(
    (clienteId: string, lineas: LineaVenta[], metodoPago: MetodoPago) => {
      const totales = calcularTotalesVenta(
        lineas.map((l) => ({
          cantidad: l.cantidad,
          precioUnitario: l.precioUnitario,
          descuentoPct: l.descuentoPct,
          impuestoPct: l.impuestoPct,
        }))
      );
      const id = crypto.randomUUID();
      const nuevaVenta: Venta = {
        id,
        clienteId,
        lineas,
        ...totales,
        estado: "confirmada",
        metodoPago,
        fecha: new Date().toISOString(),
      };
      setVentas((prev) => [nuevaVenta, ...prev]);
      registrarEvento?.({
        usuarioId: usuarioActual?.id ?? null,
        usuarioNombre: usuarioActual?.nombre ?? "Sistema",
        accion: "venta_creada",
        detalle: `Venta ${id.slice(0, 8)} creada`,
      });
      setTimeout(() => resolverEmision(id), 400);
      return id;
    },
    [resolverEmision, usuarioActual, registrarEvento]
  );

  const solicitarAnulacion = useCallback(
    (ventaId: string, motivo: string) => {
      setVentas((prev) =>
        prev.map((v) =>
          v.id === ventaId ? { ...v, estado: "anulacion_solicitada", motivoAnulacion: motivo } : v
        )
      );
      registrarEvento?.({
        usuarioId: usuarioActual?.id ?? null,
        usuarioNombre: usuarioActual?.nombre ?? "Sistema",
        accion: "anulacion_solicitada",
        detalle: `Anulación solicitada para venta ${ventaId.slice(0, 8)}: ${motivo}`,
      });
    },
    [usuarioActual, registrarEvento]
  );

  const aprobarAnulacion = useCallback(
    (ventaId: string) => {
      setVentas((prev) =>
        prev.map((v) => (v.id === ventaId ? { ...v, estado: "anulada" } : v))
      );
      registrarEvento?.({
        usuarioId: usuarioActual?.id ?? null,
        usuarioNombre: usuarioActual?.nombre ?? "Sistema",
        accion: "anulacion_aprobada",
        detalle: `Anulación aprobada para venta ${ventaId.slice(0, 8)}`,
      });
    },
    [usuarioActual, registrarEvento]
  );

  const rechazarAnulacion = useCallback(
    (ventaId: string) => {
      setVentas((prev) =>
        prev.map((v) =>
          v.id === ventaId ? { ...v, estado: "autorizada", motivoAnulacion: undefined } : v
        )
      );
      registrarEvento?.({
        usuarioId: usuarioActual?.id ?? null,
        usuarioNombre: usuarioActual?.nombre ?? "Sistema",
        accion: "anulacion_rechazada",
        detalle: `Anulación rechazada para venta ${ventaId.slice(0, 8)}`,
      });
    },
    [usuarioActual, registrarEvento]
  );

  const reintentarEmision = useCallback(
    (ventaId: string) => {
      registrarEvento?.({
        usuarioId: usuarioActual?.id ?? null,
        usuarioNombre: usuarioActual?.nombre ?? "Sistema",
        accion: "emision_reintentada",
        detalle: `Reintento de emisión para venta ${ventaId.slice(0, 8)}`,
      });
      resolverEmision(ventaId);
    },
    [resolverEmision, usuarioActual, registrarEvento]
  );

  const getVenta = useCallback(
    (ventaId: string) => ventas.find((v) => v.id === ventaId),
    [ventas]
  );
  const getClientePorId = useCallback(
    (clienteId: string) => clientes.find((c) => c.id === clienteId),
    [clientes]
  );
  const getFacturaByVentaId = useCallback(
    (ventaId: string) => facturas.find((f) => f.ventaId === ventaId),
    [facturas]
  );

  return (
    <VentasContext.Provider
      value={{
        clientes,
        productos,
        ventas,
        facturas,
        buscarClientes,
        buscarClientePorNit,
        registrarCliente,
        buscarProductos,
        crearProducto,
        actualizarProducto,
        toggleActivoProducto,
        crearVenta,
        solicitarAnulacion,
        aprobarAnulacion,
        rechazarAnulacion,
        reintentarEmision,
        getVenta,
        getClientePorId,
        getFacturaByVentaId,
      }}
    >
      {children}
    </VentasContext.Provider>
  );
}

export function useVentas() {
  const ctx = useContext(VentasContext);
  if (!ctx) throw new Error("useVentas debe usarse dentro de VentasProvider");
  return ctx;
}
