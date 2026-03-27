import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export function StatCardSkeleton() {
  return (
    <Card className="border-border/50 shadow-sm rounded-2xl">
      <CardContent className="p-6 flex items-center gap-4">
        <Skeleton className="h-14 w-14 rounded-xl shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-7 w-20" />
          <Skeleton className="h-3 w-16" />
        </div>
      </CardContent>
    </Card>
  );
}

export function StatCardGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <StatCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function TableRowSkeleton({ cols = 5 }: { cols?: number }) {
  return (
    <TableRow>
      {Array.from({ length: cols }).map((_, i) => (
        <TableCell key={i}>
          <Skeleton className="h-4 w-full" />
        </TableCell>
      ))}
    </TableRow>
  );
}

export function TableSkeleton({
  rows = 8,
  cols = 5,
  headers,
}: {
  rows?: number;
  cols?: number;
  headers?: string[];
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          {(headers ?? Array.from({ length: cols })).map((h, i) => (
            <TableHead key={i}>
              {h ? (
                <span className="text-xs font-medium text-muted-foreground">{h}</span>
              ) : (
                <Skeleton className="h-3 w-16" />
              )}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {Array.from({ length: rows }).map((_, i) => (
          <TableRowSkeleton key={i} cols={cols} />
        ))}
      </TableBody>
    </Table>
  );
}

export function CardListSkeleton({ rows = 6, className = "" }: { rows?: number; className?: string }) {
  return (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: rows }).map((_, i) => (
        <Card key={i} className="border-border/50">
          <CardContent className="p-4 flex items-center gap-4">
            <Skeleton className="h-10 w-10 rounded-xl shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-3 w-1/2" />
            </div>
            <Skeleton className="h-6 w-16 rounded-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function ChartSkeleton({ height = 300 }: { height?: number }) {
  return (
    <Card className="border-border/50">
      <CardHeader>
        <Skeleton className="h-5 w-36" />
        <Skeleton className="h-3 w-52 mt-1" />
      </CardHeader>
      <CardContent>
        <Skeleton className="w-full rounded-xl" style={{ height }} />
      </CardContent>
    </Card>
  );
}

export function PageHeaderSkeleton() {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-4">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-64" />
      </div>
      <Skeleton className="h-9 w-32 rounded-xl" />
    </div>
  );
}
