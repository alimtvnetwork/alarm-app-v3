import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { useErrorStore } from "./stores/error-store";
import "./i18n";
import "./index.css";

// Suppress known third-party forwardRef warnings (Radix Select, Recharts CartesianGrid)
if (import.meta.env.DEV) {
  const origWarn = console.error;
  console.error = (...args: unknown[]) => {
    const msg = typeof args[0] === "string" ? args[0] : "";
    if (msg.includes("Function components cannot be given refs")) return;
    origWarn.apply(console, args);
  };
}

// ─── Global JS error listeners → error store ────────────────────

window.onerror = (_message, source, lineno, colno, error) => {
  useErrorStore.getState().captureException(
    error ?? String(_message),
    { source: `${source ?? "unknown"}:${lineno}:${colno}`, triggerAction: "window.onerror" },
  );
};

window.onunhandledrejection = (event: PromiseRejectionEvent) => {
  const error = event.reason instanceof Error ? event.reason : String(event.reason);
  useErrorStore.getState().captureException(error, {
    source: "unhandledrejection",
    triggerAction: "Promise",
  });
};

createRoot(document.getElementById("root")!).render(<App />);
