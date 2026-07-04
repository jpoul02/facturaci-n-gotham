export const IVA_PCT = 13;

export interface LineaCalculada {
  cantidad: number;
  precioUnitario: number;
  descuentoPct: number;
}

export interface TotalesVenta {
  subtotal: number;
  descuento: number;
  impuesto: number;
  total: number;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function calcularSubtotalLinea(linea: LineaCalculada): number {
  const bruto = linea.cantidad * linea.precioUnitario;
  const descuento = bruto * (linea.descuentoPct / 100);
  return round2(bruto - descuento);
}

export function calcularTotalesVenta(lineas: LineaCalculada[]): TotalesVenta {
  const bruto = lineas.reduce((acc, l) => acc + l.cantidad * l.precioUnitario, 0);
  const descuento = lineas.reduce(
    (acc, l) => acc + l.cantidad * l.precioUnitario * (l.descuentoPct / 100),
    0
  );
  const subtotal = round2(bruto - descuento);
  const impuesto = round2(subtotal * (IVA_PCT / 100));
  const total = round2(subtotal + impuesto);
  return { subtotal, descuento: round2(descuento), impuesto, total };
}
