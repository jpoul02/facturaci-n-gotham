import { Document, Page, Text, View, Image, StyleSheet } from "@react-pdf/renderer";
import type { Cliente, Factura, Venta } from "@/lib/types";
import { METODO_PAGO_LABELS } from "@/components/ventas/metodo-pago-selector";

// Los códigos DTE son cadenas largas sin espacios; el hyphenator por defecto
// de react-pdf no las corta, y desbordan la columna. Forzamos corte por caracter.
const breakAnywhere = (word: string) => word.split("");

const EMISOR = {
  nombre: "ADVENTURE WORKS S.A. DE C.V.",
  nombreComercial: "ADVENTUREWORKS EL SALVADOR",
  nit: "0614-010126-101-3",
  nrc: "123456-7",
  actividadEconomica: "Venta de bicicletas, accesorios y artículos deportivos",
  direccion: "Parque Industrial, Distrito de San Salvador, San Salvador Centro, San Salvador",
  telefono: "2298-3000",
  correo: "facturacion@adventureworks.com",
};

const styles = StyleSheet.create({
  page: { padding: 36, fontSize: 9, fontFamily: "Helvetica", color: "#10172A" },

  band: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#145C3F",
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 18,
    marginBottom: 20,
  },
  brand: { fontSize: 17, fontWeight: 700, color: "#FFFFFF" },
  brandSub: { fontSize: 7.5, color: "#CFEAD9", marginTop: 2 },
  invoiceNo: { fontSize: 13, fontWeight: 700, color: "#FFFFFF", textAlign: "right" },
  invoiceDate: { fontSize: 7.5, color: "#CFEAD9", textAlign: "right", marginTop: 2 },

  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 18,
  },
  metaCol: { flex: 1, paddingRight: 8 },
  metaLabel: { fontSize: 7, color: "#64748B", textTransform: "uppercase", letterSpacing: 0.5 },
  metaValue: { fontSize: 8.5, marginTop: 2, marginBottom: 6 },
  metaValueMono: { fontSize: 7.5, marginTop: 2, marginBottom: 6, fontFamily: "Courier", wordBreak: "break-all" },

  partiesRow: {
    flexDirection: "row",
    gap: 24,
    paddingVertical: 14,
    marginBottom: 18,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderTopColor: "#E2E8F0",
    borderBottomColor: "#E2E8F0",
    borderTopStyle: "solid",
    borderBottomStyle: "solid",
  },
  partyCol: { flex: 1 },
  partyKicker: { fontSize: 7.5, fontWeight: 700, color: "#145C3F", letterSpacing: 0.8, marginBottom: 4 },
  partyName: { fontSize: 9.5, fontWeight: 700 },
  partyLine: { fontSize: 8, color: "#475569", marginTop: 1 },

  qrCorner: { alignItems: "center", gap: 3 },
  qrImage: { width: 62, height: 62 },
  qrCaption: { fontSize: 6, color: "#94A3B8" },

  table: { marginTop: 4 },
  tableHeaderRow: {
    flexDirection: "row",
    paddingVertical: 6,
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 6,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 6,
    paddingHorizontal: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    borderBottomStyle: "solid",
  },
  colProducto: { flex: 3 },
  colCant: { flex: 1, textAlign: "right" },
  colPrecio: { flex: 1, textAlign: "right" },
  colSubtotal: { flex: 1, textAlign: "right" },
  colLabel: { fontSize: 7, color: "#64748B", textTransform: "uppercase", letterSpacing: 0.5 },

  bottomRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 16 },
  qrBottomBlock: { flexDirection: "row", gap: 14 },
  totalsBox: { alignItems: "flex-end" },
  totalRow: { flexDirection: "row", gap: 24, marginBottom: 4 },
  totalLabel: { fontSize: 9, color: "#64748B", width: 80, textAlign: "right" },
  totalValue: { fontSize: 9, width: 70, textAlign: "right" },
  grandTotalLabel: { fontSize: 11, fontWeight: 700, width: 80, textAlign: "right" },
  grandTotalValue: { fontSize: 13, fontWeight: 700, width: 70, textAlign: "right" },

  footer: {
    marginTop: 24,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    borderTopStyle: "solid",
    fontSize: 7.5,
    color: "#94A3B8",
  },
});

interface FacturaPdfProps {
  venta: Venta;
  cliente?: Cliente;
  factura?: Factura;
  qrConsultaDataUrl?: string;
  qrJsonDataUrl?: string;
}

export function FacturaPdf({ venta, cliente, factura, qrConsultaDataUrl, qrJsonDataUrl }: FacturaPdfProps) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.band}>
          <View>
            <Text style={styles.brand}>Adventure Works</Text>
            <Text style={styles.brandSub}>Factura de venta</Text>
          </View>
          <View>
            <Text style={styles.invoiceNo}>{factura?.correlativo ?? venta.id.slice(0, 8).toUpperCase()}</Text>
            <Text style={styles.invoiceDate}>{new Date(venta.fecha).toLocaleString("es-SV")}</Text>
          </View>
        </View>

        <View style={styles.metaRow}>
          <View style={styles.metaCol}>
            <Text style={styles.metaLabel}>Método de pago</Text>
            <Text style={styles.metaValue}>{METODO_PAGO_LABELS[venta.metodoPago]}</Text>
          </View>
          {factura && (
            <>
              <View style={styles.metaCol}>
                <Text style={styles.metaLabel}>Código de generación</Text>
                <Text style={styles.metaValueMono} hyphenationCallback={breakAnywhere}>
                  {factura.codigoGeneracion}
                </Text>
              </View>
              <View style={styles.metaCol}>
                <Text style={styles.metaLabel}>Número de control</Text>
                <Text style={styles.metaValueMono} hyphenationCallback={breakAnywhere}>
                  {factura.numeroControl}
                </Text>
              </View>
              <View style={styles.metaCol}>
                <Text style={styles.metaLabel}>Sello de recepción</Text>
                <Text style={styles.metaValueMono} hyphenationCallback={breakAnywhere}>
                  {factura.selloRecepcion}
                </Text>
              </View>
            </>
          )}
        </View>

        <View style={styles.partiesRow}>
          <View style={styles.partyCol}>
            <Text style={styles.partyKicker}>DE</Text>
            <Text style={styles.partyName}>{EMISOR.nombreComercial}</Text>
            <Text style={styles.partyLine}>{EMISOR.nombre}</Text>
            <Text style={styles.partyLine}>NIT {EMISOR.nit} · NRC {EMISOR.nrc}</Text>
            <Text style={styles.partyLine}>{EMISOR.actividadEconomica}</Text>
            <Text style={styles.partyLine}>{EMISOR.direccion}</Text>
            <Text style={styles.partyLine}>{EMISOR.telefono} · {EMISOR.correo}</Text>
          </View>

          <View style={styles.partyCol}>
            <Text style={styles.partyKicker}>PARA</Text>
            <Text style={styles.partyName}>{cliente?.nombre ?? "—"}</Text>
            <Text style={styles.partyLine}>
              {cliente?.tipoDocumento ?? "—"} {cliente?.nit ?? ""}
            </Text>
            <Text style={styles.partyLine}>{cliente?.correo ?? "N/D"}</Text>
            <Text style={styles.partyLine}>{cliente?.telefono ?? "N/D"}</Text>
          </View>

          {qrConsultaDataUrl && (
            <View style={styles.qrCorner}>
              <Image src={qrConsultaDataUrl} style={styles.qrImage} />
              <Text style={styles.qrCaption}>Verificar</Text>
            </View>
          )}
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeaderRow}>
            <Text style={[styles.colProducto, styles.colLabel]}>Producto</Text>
            <Text style={[styles.colCant, styles.colLabel]}>Cant.</Text>
            <Text style={[styles.colPrecio, styles.colLabel]}>Precio</Text>
            <Text style={[styles.colSubtotal, styles.colLabel]}>Subtotal</Text>
          </View>
          {venta.lineas.map((linea) => (
            <View style={styles.tableRow} key={linea.id}>
              <Text style={styles.colProducto}>{linea.nombreProducto}</Text>
              <Text style={styles.colCant}>{linea.cantidad}</Text>
              <Text style={styles.colPrecio}>${linea.precioUnitario.toFixed(2)}</Text>
              <Text style={styles.colSubtotal}>${linea.subtotal.toFixed(2)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.bottomRow}>
          {qrJsonDataUrl ? (
            <View style={styles.qrBottomBlock}>
              <View style={styles.qrCorner}>
                <Image src={qrJsonDataUrl} style={styles.qrImage} />
                <Text style={styles.qrCaption}>Detalle</Text>
              </View>
            </View>
          ) : (
            <View />
          )}

          <View style={styles.totalsBox}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Subtotal</Text>
              <Text style={styles.totalValue}>${venta.subtotal.toFixed(2)}</Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Descuento</Text>
              <Text style={styles.totalValue}>${venta.descuento.toFixed(2)}</Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Impuesto</Text>
              <Text style={styles.totalValue}>${venta.impuesto.toFixed(2)}</Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.grandTotalLabel}>Total</Text>
              <Text style={styles.grandTotalValue}>${venta.total.toFixed(2)}</Text>
            </View>
          </View>
        </View>

        <Text style={styles.footer}>
          Adventure Works · Facturación{factura ? " — comprobante autorizado." : "."}
        </Text>
      </Page>
    </Document>
  );
}
