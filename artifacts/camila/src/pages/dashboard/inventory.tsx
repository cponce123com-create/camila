import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { useGetInventoryMovements } from "@workspace/api-client-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowDownRight, ArrowUpRight, MinusSquare, Loader2 } from "lucide-react";
import { format } from "date-fns";

export default function InventoryPage() {
  const { data: movements, isLoading } = useGetInventoryMovements();

  return (
    <DashboardLayout>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Kárdex / Inventario</h1>
          <p className="text-muted-foreground">Historial de movimientos de stock.</p>
        </div>
      </div>

      <div className="bg-card rounded-2xl shadow-sm border border-border/50 overflow-hidden">
        {isLoading ? (
           <div className="p-12 text-center text-muted-foreground"><Loader2 className="animate-spin h-8 w-8 mx-auto" /></div>
        ) : !movements?.data.length ? (
          <div className="p-16 text-center">
            <h3 className="text-xl font-bold mb-1">Sin movimientos</h3>
            <p className="text-muted-foreground">Realiza ventas o ajustes para ver el historial.</p>
          </div>
        ) : (
          <Table>
            <TableHeader className="bg-secondary/30">
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Cantidad</TableHead>
                <TableHead>Stock Anterior</TableHead>
                <TableHead>Nuevo Stock</TableHead>
                <TableHead>Motivo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {movements.data.map((m) => {
                const isOut = m.type === 'out';
                const isIn = m.type === 'in';
                return (
                  <TableRow key={m.id} className="hover:bg-secondary/10">
                    <TableCell className="font-medium text-muted-foreground">
                      {format(new Date(m.createdAt), 'dd/MM/yyyy HH:mm')}
                    </TableCell>
                    <TableCell>
                      <span className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-bold w-max
                        ${isOut ? 'bg-destructive/10 text-destructive' : 
                          isIn ? 'bg-emerald-500/10 text-emerald-600' : 
                          'bg-accent/10 text-accent-foreground'}`}>
                        {isOut && <ArrowDownRight className="h-3 w-3" />}
                        {isIn && <ArrowUpRight className="h-3 w-3" />}
                        {!isOut && !isIn && <MinusSquare className="h-3 w-3" />}
                        {m.type.toUpperCase()}
                      </span>
                    </TableCell>
                    <TableCell className={`font-bold ${isOut ? 'text-destructive' : isIn ? 'text-emerald-600' : ''}`}>
                      {isOut ? '-' : '+'}{m.quantity}
                    </TableCell>
                    <TableCell>{m.previousStock}</TableCell>
                    <TableCell className="font-bold">{m.newStock}</TableCell>
                    <TableCell className="text-muted-foreground">{m.reason || '-'}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>
    </DashboardLayout>
  );
}
