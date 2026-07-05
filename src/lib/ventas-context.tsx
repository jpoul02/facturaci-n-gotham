"use client";

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Cliente, Factura, LineaVenta, Producto, Venta } from "@/lib/types";
import { clientesSeed, facturasSeed, productosSeed, ventasSeed } from "@/lib/mock-data/seed";
import { generarFactura } from "@/lib/mock-data/factura-generator";
import { calcularTotalesVenta } from "@/lib/calculos";

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
  crearVenta: (clienteId: string, lineas: LineaVenta[]) => string;
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
  const [clientes, setClientes] = useState<Cliente[]>(clientesSeed);
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

  const registrarCliente = useCallback((data: Omit<Cliente, "id">) => {
    const nuevo: Cliente = { ...data, id: crypto.randomUUID() };
    setClientes((prev) => [...prev, nuevo]);
    return nuevo;
  }, []);

  const buscarProductos = useCallback((query: string) => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return productosSeed.filter(
      (p) => p.nombre.toLowerCase().includes(q) || p.codigo.toLowerCase().includes(q)
    );
  }, []);

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
    (clienteId: string, lineas: LineaVenta[]) => {
      const totales = calcularTotalesVenta(
        lineas.map((l) => ({
          cantidad: l.cantidad,
          precioUnitario: l.precioUnitario,
          descuentoPct: l.descuentoPct,
        }))
      );
      const id = crypto.randomUUID();
      const nuevaVenta: Venta = {
        id,
        clienteId,
        lineas,
        ...totales,
        estado: "confirmada",
        fecha: new Date().toISOString(),
      };
      setVentas((prev) => [nuevaVenta, ...prev]);
      setTimeout(() => resolverEmision(id), 400);
      return id;
    },
    [resolverEmision]
  );

  const solicitarAnulacion = useCallback((ventaId: string, motivo: string) => {
    setVentas((prev) =>
      prev.map((v) =>
        v.id === ventaId ? { ...v, estado: "anulacion_solicitada", motivoAnulacion: motivo } : v
      )
    );
  }, []);

  const aprobarAnulacion = useCallback((ventaId: string) => {
    setVentas((prev) =>
      prev.map((v) => (v.id === ventaId ? { ...v, estado: "anulada" } : v))
    );
  }, []);

  const rechazarAnulacion = useCallback((ventaId: string) => {
    setVentas((prev) =>
      prev.map((v) =>
        v.id === ventaId ? { ...v, estado: "autorizada", motivoAnulacion: undefined } : v
      )
    );
  }, []);

  const reintentarEmision = useCallback(
    (ventaId: string) => resolverEmision(ventaId),
    [resolverEmision]
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
        productos: productosSeed,
        ventas,
        facturas,
        buscarClientes,
        buscarClientePorNit,
        registrarCliente,
        buscarProductos,
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
