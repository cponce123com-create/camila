import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface ReceiptItem {
  productName: string;
  quantity: number;
  unitPrice: number;
  discount?: number;
  subtotal: number;
}

interface StoreInfo {
  name: string;
  address?: string;
  phone?: string;
  ruc?: string;
  email?: string;
}

interface ReceiptData {
  receiptCode: string;
  store: StoreInfo;
  clientName?: string | null;
  clientPhone?: string | null;
  staffName?: string | null;
  items: ReceiptItem[];
  subtotal: number;
  discount: number;
  discountPercent: number;
  tax: number;
  total: number;
  paymentMethod: string;
  notes?: string | null;
  soldAt: string;
}

const PAYMENT_LABELS: Record<string, string> = {
  cash: "Efectivo",
  card: "Tarjeta",
  transfer: "Transferencia",
  other: "Otro",
};

export function generateReceiptPDF(data: ReceiptData): jsPDF {
  const doc = new jsPDF({ unit: "mm", format: "a6", orientation: "portrait" });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 8;
  const contentW = pageW - margin * 2;
  let y = 8;

  // — Primary green colour —
  const green: [number, number, number] = [26, 92, 46];
  const lightGreen: [number, number, number] = [237, 247, 240];

  // Header band
  doc.setFillColor(...green);
  doc.rect(0, 0, pageW, 22, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(data.store.name || "Mi Tienda", pageW / 2, 10, { align: "center" });
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  if (data.store.address) {
    doc.text(data.store.address, pageW / 2, 15, { align: "center" });
  }
  const contactParts = [data.store.phone, data.store.ruc ? `RUC: ${data.store.ruc}` : null].filter(Boolean);
  if (contactParts.length) {
    doc.text(contactParts.join("  |  "), pageW / 2, 19, { align: "center" });
  }

  y = 28;
  doc.setTextColor(0, 0, 0);

  // Receipt code + date
  doc.setFillColor(...lightGreen);
  doc.roundedRect(margin, y - 3, contentW, 12, 2, 2, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...green);
  doc.text(`RECIBO Nº ${data.receiptCode}`, margin + 3, y + 2.5);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(80, 80, 80);
  const soldDate = new Date(data.soldAt);
  const dateStr = soldDate.toLocaleDateString("es-PE", { year: "numeric", month: "long", day: "numeric" });
  const timeStr = soldDate.toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" });
  doc.text(`${dateStr} ${timeStr}`, pageW - margin - 3, y + 2.5, { align: "right" });
  y += 14;

  // Client / Staff row
  if (data.clientName || data.staffName) {
    doc.setFontSize(7.5);
    doc.setTextColor(60, 60, 60);
    if (data.clientName) {
      doc.setFont("helvetica", "bold");
      doc.text("Cliente:", margin, y);
      doc.setFont("helvetica", "normal");
      doc.text(data.clientName, margin + 16, y);
      if (data.clientPhone) {
        doc.text(`Tel: ${data.clientPhone}`, pageW - margin - 3, y, { align: "right" });
      }
      y += 5;
    }
    if (data.staffName) {
      doc.setFont("helvetica", "bold");
      doc.text("Vendedor:", margin, y);
      doc.setFont("helvetica", "normal");
      doc.text(data.staffName, margin + 20, y);
      y += 5;
    }
    y += 2;
  }

  // Items table
  autoTable(doc, {
    startY: y,
    head: [["Producto", "Cant.", "P.Unit", "Total"]],
    body: data.items.map((item) => [
      item.productName,
      String(item.quantity),
      `S/ ${parseFloat(String(item.unitPrice)).toFixed(2)}`,
      `S/ ${parseFloat(String(item.subtotal)).toFixed(2)}`,
    ]),
    styles: { fontSize: 7.5, cellPadding: 2 },
    headStyles: { fillColor: green, textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [248, 252, 249] },
    columnStyles: {
      0: { cellWidth: "auto" },
      1: { cellWidth: 12, halign: "center" },
      2: { cellWidth: 20, halign: "right" },
      3: { cellWidth: 22, halign: "right" },
    },
    margin: { left: margin, right: margin },
  });

  y = (doc as any).lastAutoTable.finalY + 4;

  // Totals block
  const totalsX = pageW - margin - 52;
  const labX = totalsX;
  const valX = pageW - margin;

  doc.setFontSize(7.5);
  doc.setTextColor(60, 60, 60);

  doc.setFont("helvetica", "normal");
  doc.text("Subtotal:", labX, y);
  doc.text(`S/ ${parseFloat(String(data.subtotal)).toFixed(2)}`, valX, y, { align: "right" });
  y += 4.5;

  if (data.discount > 0 || data.discountPercent > 0) {
    const discAmt = data.discountPercent > 0
      ? data.subtotal * data.discountPercent / 100
      : data.discount;
    const label = data.discountPercent > 0 ? `Descuento (${data.discountPercent}%):` : "Descuento:";
    doc.setTextColor(200, 60, 40);
    doc.text(label, labX, y);
    doc.text(`-S/ ${discAmt.toFixed(2)}`, valX, y, { align: "right" });
    doc.setTextColor(60, 60, 60);
    y += 4.5;
  }

  if (data.tax > 0) {
    doc.text("IGV:", labX, y);
    doc.text(`S/ ${parseFloat(String(data.tax)).toFixed(2)}`, valX, y, { align: "right" });
    y += 4.5;
  }

  // Divider
  doc.setDrawColor(...green);
  doc.setLineWidth(0.4);
  doc.line(labX, y, valX, y);
  y += 3;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...green);
  doc.text("TOTAL:", labX, y);
  doc.text(`S/ ${parseFloat(String(data.total)).toFixed(2)}`, valX, y, { align: "right" });
  y += 6;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(80, 80, 80);
  const payLabel = PAYMENT_LABELS[data.paymentMethod] || data.paymentMethod;
  doc.text(`Forma de pago: ${payLabel}`, labX, y);
  y += 7;

  // Notes
  if (data.notes) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(7);
    doc.setTextColor(120, 120, 120);
    doc.text(`Nota: ${data.notes}`, margin, y, { maxWidth: contentW });
    y += 6;
  }

  // Footer
  y = Math.max(y, doc.internal.pageSize.getHeight() - 14);
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.2);
  doc.line(margin, y, pageW - margin, y);
  y += 4;
  doc.setFont("helvetica", "italic");
  doc.setFontSize(7);
  doc.setTextColor(150, 150, 150);
  doc.text("¡Gracias por tu compra!", pageW / 2, y, { align: "center" });
  y += 4;
  doc.text("Powered by Camila", pageW / 2, y, { align: "center" });

  return doc;
}
