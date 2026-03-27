import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
      <h1 className="text-9xl font-display font-extrabold text-primary/20 mb-4">404</h1>
      <h2 className="text-3xl font-bold text-foreground mb-2">Página no encontrada</h2>
      <p className="text-muted-foreground text-center max-w-md mb-8">
        La ruta que intentas visitar no existe o fue movida.
      </p>
      <Link href="/">
        <Button size="lg" className="rounded-full shadow-lg shadow-primary/20 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-8">
          Volver al Inicio
        </Button>
      </Link>
    </div>
  );
}
