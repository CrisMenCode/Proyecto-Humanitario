import type { ReactNode } from "react";
import {
  AlertCircle,
  ArrowUpRight,
  LoaderCircle,
  RefreshCw,
} from "lucide-react";

export function Loading({
  label = "Cargando información…",
}: {
  label?: string;
}) {
  return (
    <div className="state" role="status">
      <LoaderCircle className="spin" size={24} />
      <span>{label}</span>
    </div>
  );
}
export function ErrorState({
  error,
  retry,
}: {
  error: Error;
  retry?: () => void;
}) {
  return (
    <div className="error-box" role="alert">
      <AlertCircle size={20} />
      <div>
        <strong>No pudimos completar la solicitud</strong>
        <p>{error.message}</p>
        {retry && (
          <button className="button small secondary" onClick={retry}>
            <RefreshCw size={14} />
            Reintentar
          </button>
        )}
      </div>
    </div>
  );
}
export function Empty({
  title = "Todavía no hay registros",
  children,
}: {
  title?: string;
  children?: ReactNode;
}) {
  return (
    <div className="empty">
      <span className="empty-symbol">＋</span>
      <h3>{title}</h3>
      <p>
        {children ||
          "Agrega el primer registro para empezar a coordinar la ayuda."}
      </p>
    </div>
  );
}
export function Badge({ value }: { value: string | boolean | undefined }) {
  const text =
    typeof value === "boolean"
      ? value
        ? "Disponible"
        : "Inactivo"
      : value || "Sin definir";
  const cls = ["activa", "baja", "completado", "Disponible"].includes(text)
    ? "green"
    : ["alta", "fallido", "Inactivo"].includes(text)
      ? "red"
      : "amber";
  return (
    <span className={`badge ${cls}`}>
      <i />
      {text}
    </span>
  );
}
export function Progress({ value = 0 }: { value?: number }) {
  return (
    <div className="progress-wrap">
      <div className="progress-track">
        <div style={{ width: `${Math.min(100, value)}%` }} />
      </div>
      <span>{value}%</span>
    </div>
  );
}
export const ExternalArrow = () => <ArrowUpRight size={16} />;
