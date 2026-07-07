import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import type { Cliente, Factura, Venta } from "@/lib/types";
import { METODO_PAGO_LABELS } from "@/components/ventas/metodo-pago-selector";

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 10, fontFamily: "Helvetica", color: "#10172A" },
  header: {
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: "#145C3F",
    borderBottomStyle: "solid",
  },
  brand: { fontSize: 16, fontWeight: 700, color: "#145C3F" },
  subtitle: { fontSize: 9, color: "#64748B", marginTop: 2 },
  section: { marginBottom: 12 },
  row: { flexDirection: "row", justifyContent: "space-between" },
  label: { fontSize: 8, color: "#64748B", textTransform: "uppercase", letterSpacing: 0.5 },
  value: { fontSize: 10, marginTop: 2 },
  table: {
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    borderTopStyle: "solid",
  },
  tableHeaderRow: {
    flexDirection: "row",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    borderBottomStyle: "solid",
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    borderBottomStyle: "solid",
  },
  colProducto: { flex: 3 },
  colCant: { flex: 1, textAlign: "right" },
  colPrecio: { flex: 1, textAlign: "right" },
  colSubtotal: { flex: 1, textAlign: "right" },
  totalsBox: { marginTop: 12, alignItems: "flex-end" },
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
    fontSize: 8,
    color: "#94A3B8",
  },
});

interface FacturaPdfProps {
  venta: Venta;
  cliente?: Cliente;
  factura?: Factura;
}

export function FacturaPdf({ venta, cliente, factura }: FacturaPdfProps) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.brand}>Adventure Works · Facturación</Text>
          <Text style={styles.subtitle}>
            {factura ? `Comprobante ${factura.correlativo}` : `Venta ${venta.id.slice(0, 8)}`}
          </Text>
        </View>

        <View style={[styles.section, styles.row]}>
          <View>
            <Text style={styles.label}>Cliente</Text>
            <Text style={styles.value}>{cliente?.nombre ?? "—"}</Text>
            {cliente && <Text style={styles.subtitle}>{cliente.nit}</Text>}
          </View>
          <View>
            <Text style={styles.label}>Fecha</Text>
            <Text style={styles.value}>{new Date(venta.fecha).toLocaleString("es-SV")}</Text>
          </View>
          <View>
            <Text style={styles.label}>Método de pago</Text>
            <Text style={styles.value}>{METODO_PAGO_LABELS[venta.metodoPago]}</Text>
          </View>
        </View>

        {factura && (
          <View style={[styles.section, styles.row]}>
            <View>
              <Text style={styles.label}>Código de generación</Text>
              <Text style={styles.value}>{factura.codigoGeneracion}</Text>
            </View>
            <View>
              <Text style={styles.label}>Número de control</Text>
              <Text style={styles.value}>{factura.numeroControl}</Text>
            </View>
            <View>
              <Text style={styles.label}>Sello de recepción</Text>
              <Text style={styles.value}>{factura.selloRecepcion}</Text>
            </View>
          </View>
        )}

        <View style={styles.table}>
          <View style={styles.tableHeaderRow}>
            <Text style={[styles.colProducto, styles.label]}>Producto</Text>
            <Text style={[styles.colCant, styles.label]}>Cant.</Text>
            <Text style={[styles.colPrecio, styles.label]}>Precio</Text>
            <Text style={[styles.colSubtotal, styles.label]}>Subtotal</Text>
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

        <Text style={styles.footer}>
          Documento generado por Adventure Works · Facturación
          {factura ? " — comprobante autorizado." : "."}
        </Text>
      </Page>
    </Document>
  );
}
