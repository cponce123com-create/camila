import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import { AppErrorBoundary } from "@/components/error-boundary";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <HelmetProvider>
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  </HelmetProvider>
);
