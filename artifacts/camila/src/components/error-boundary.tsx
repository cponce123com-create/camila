import { ErrorBoundary as ReactErrorBoundary } from "react-error-boundary";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw } from "lucide-react";

function ErrorFallback({
  error,
  resetErrorBoundary,
}: {
  error: Error;
  resetErrorBoundary: () => void;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="flex justify-center">
          <div className="p-5 rounded-2xl bg-destructive/10">
            <AlertTriangle className="h-12 w-12 text-destructive" />
          </div>
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground">
            Algo salió mal
          </h1>
          <p className="text-muted-foreground">
            Ha ocurrido un error inesperado. Puedes intentar recargar la página.
          </p>
          {import.meta.env.DEV && (
            <pre className="mt-4 p-3 bg-muted rounded-lg text-left text-xs overflow-auto max-h-40 text-muted-foreground">
              {error.message}
            </pre>
          )}
        </div>
        <div className="flex gap-3 justify-center">
          <Button onClick={resetErrorBoundary} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Intentar de nuevo
          </Button>
          <Button
            variant="outline"
            onClick={() => (window.location.href = "/")}
          >
            Ir al inicio
          </Button>
        </div>
      </div>
    </div>
  );
}

export function AppErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <ReactErrorBoundary
      FallbackComponent={ErrorFallback}
      onReset={() => window.location.reload()}
    >
      {children}
    </ReactErrorBoundary>
  );
}

export { ReactErrorBoundary as ErrorBoundary };
