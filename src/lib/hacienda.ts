import { EMISOR } from "@/lib/emisor";
import type { Cliente, Factura, MetodoPago, Venta } from "@/lib/types";

// Simulated signer + MH API: https://github.com/jpoul02/facturacin-gotham-api
// Without this variable the app keeps the local simulation.
export const HACIENDA_URL = process.env.NEXT_PUBLIC_HACIENDA_URL?.replace(/\/$/, "");
const PASSWORD_PRI = process.env.NEXT_PUBLIC_HACIENDA_PASSWORD_PRI ?? "gotham-firma";
const MH_PWD = process.env.NEXT_PUBLIC_HACIENDA_PWD ?? "gotham-mh";

const NIT = EMISOR.nit.replace(/-/g, "");
const TIPO_DOCUMENTO: Record<Cliente["tipoDocumento"], string> = { NIT: "36", DUI: "13", Pasaporte: "03" };
const FORMA_PAGO: Record<MetodoPago, string> = { efectivo: "01", tarjeta: "02", transferencia: "05" };

let token: string | null = null;

async function post(path: string, body: unknown, form = false) {
  const res = await fetch(`${HACIENDA_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": form ? "application/x-www-form-urlencoded" : "application/json",
      ...(token && { Authorization: token }),
    },
    body: form ? new URLSearchParams(body as Record<string, string>) : JSON.stringify(body),
  });
  return { status: res.status, data: await res.json() };
}

async function autenticar() {
  const { status, data } = await post("/seguridad/auth", { user: NIT, pwd: MH_PWD }, true);
  if (status !== 200) throw new Error("Hacienda rechazó las credenciales del emisor");
  token = data.body.token;
}

async function firmar(dteJson: object): Promise<string> {
  const { data } = await post("/firmardocumento/", { nit: NIT, activo: true, passwordPri: PASSWORD_PRI, dteJson });
  if (data.status !== "OK") throw new Error(`Firmador: ${data.body.mensaje}`);
  return data.body;
}

async function enviarMh(path: string, body: object) {
  if (!token) await autenticar();
  let r = await post(path, body);
  if (r.status === 401) {
    await autenticar();
    r = await post(path, body);
  }
  if (r.data.estado !== "PROCESADO") {
    const obs = (r.data.observaciones ?? []).join("; ");
    throw new Error(`Hacienda: ${r.data.descripcionMsg}${obs ? ` (${obs})` : ""}`);
  }
  return r.data as { selloRecibido: string; fhProcesamiento: string };
}

function fechaHora(d = new Date()) {
  const iso = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString();
  return { fecha: iso.slice(0, 10), hora: iso.slice(11, 19) };
}

const r2 = (n: number) => Math.round(n * 100) / 100;

export async function emitirDte(venta: Venta, cliente: Cliente | undefined, numeroControl: string, codigoGeneracion: string) {
  const { fecha, hora } = fechaHora();
  const cuerpoDocumento = venta.lineas.map((l, i) => ({
    numItem: i + 1,
    codigo: l.productoId,
    descripcion: l.nombreProducto,
    cantidad: l.cantidad,
    precioUni: l.precioUnitario,
    montoDescu: r2(l.cantidad * l.precioUnitario - l.subtotal),
    ventaNoSuj: 0,
    ventaExenta: l.impuestoPct > 0 ? 0 : l.subtotal,
    ventaGravada: l.impuestoPct > 0 ? l.subtotal : 0,
    ivaItem: r2(l.subtotal * (l.impuestoPct / 100)),
  }));
  const dte = {
    identificacion: {
      version: 1, ambiente: "00", tipoDte: "01", numeroControl, codigoGeneracion,
      tipoModelo: 1, tipoOperacion: 1, fecEmi: fecha, horEmi: hora, tipoMoneda: "USD",
    },
    emisor: { nit: NIT, nrc: EMISOR.nrc.replace(/-/g, ""), nombre: EMISOR.nombre, nombreComercial: EMISOR.nombreComercial, telefono: EMISOR.telefono, correo: EMISOR.correo },
    receptor: cliente
      ? { tipoDocumento: TIPO_DOCUMENTO[cliente.tipoDocumento], numDocumento: cliente.nit, nombre: cliente.nombre, correo: cliente.correo ?? null }
      : null,
    cuerpoDocumento,
    resumen: {
      subTotalVentas: r2(cuerpoDocumento.reduce((a, l) => a + l.ventaGravada + l.ventaExenta, 0)),
      totalDescu: venta.descuento,
      totalIva: venta.impuesto,
      totalPagar: venta.total,
      condicionOperacion: 1,
      pagos: [{ codigo: FORMA_PAGO[venta.metodoPago], montoPago: venta.total }],
    },
  };
  const documento = await firmar(dte);
  return enviarMh("/fesv/recepciondte", { ambiente: "00", idEnvio: Date.now(), version: 1, tipoDte: "01", documento, codigoGeneracion });
}

export async function anularDte(factura: Factura, venta: Venta, cliente: Cliente | undefined, motivo: string) {
  const { fecha, hora } = fechaHora();
  const evento = {
    identificacion: { version: 2, ambiente: "00", codigoGeneracion: crypto.randomUUID().toUpperCase(), fecAnula: fecha, horAnula: hora },
    emisor: { nit: NIT, nombre: EMISOR.nombre },
    documento: {
      tipoDte: "01",
      codigoGeneracion: factura.codigoGeneracion,
      selloRecibido: factura.selloRecepcion,
      numeroControl: factura.numeroControl,
      fecEmi: factura.fechaEmision.slice(0, 10),
      montoIva: venta.impuesto,
      tipoDocumento: cliente ? TIPO_DOCUMENTO[cliente.tipoDocumento] : null,
      numDocumento: cliente?.nit ?? null,
      nombre: cliente?.nombre ?? null,
    },
    motivo: { tipoAnulacion: 2, motivoAnulacion: motivo },
  };
  const documento = await firmar(evento);
  return enviarMh("/fesv/anulardte", { ambiente: "00", idEnvio: Date.now(), version: 2, documento });
}
