import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export function downloadCSV(filename: string, headers: string[], rows: (string | number)[][]) {
  const csvContent = [
    headers.join(","),
    ...rows.map((row) =>
      row.map((cell) => {
        const val = String(cell ?? "");
        return val.includes(",") || val.includes('"') || val.includes("\n")
          ? `"${val.replace(/"/g, '""')}"`
          : val;
      }).join(",")
    ),
  ].join("\n");

  const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function downloadPDF(
  filename: string,
  title: string,
  subtitle: string,
  sections: Array<{
    heading: string;
    headers: string[];
    rows: (string | number)[][];
  }>
) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text(title, pageWidth / 2, 18, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(subtitle, pageWidth / 2, 26, { align: "center" });

  let startY = 34;
  doc.setTextColor(0);

  for (const section of sections) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(section.heading, 14, startY);
    startY += 4;

    autoTable(doc, {
      startY,
      head: [section.headers],
      body: section.rows.map((r) => r.map(String)),
      theme: "striped",
      headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: "bold" },
      styles: { fontSize: 9, cellPadding: 2 },
      margin: { left: 14, right: 14 },
    });

    startY = (doc as any).lastAutoTable.finalY + 10;
  }

  doc.save(filename);
}

export function formatCurrency(amount: number): string {
  return `S/ ${amount.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatDateForInput(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function getDefaultDateRange(): { from: string; to: string } {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 29);
  return { from: formatDateForInput(from), to: formatDateForInput(to) };
}
