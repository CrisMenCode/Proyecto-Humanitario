import { useRef, useEffect } from "react";
import {
  ShieldCheck,
  Server,
  Cpu,
  Layers,
  ArrowRight,
  X,
  Sparkles,
  Lock,
  Database,
  CheckCircle2,
} from "lucide-react";
import type { Analysis } from "../types";

export function AiArchitectureModal({
  analysis,
  close,
}: {
  analysis?: Analysis | null;
  close: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    dialog.current?.showModal();
  }, []);

  const steps = [
    {
      step: 1,
      title: "Frontend (Cliente React)",
      icon: Layers,
      color: "#2563eb",
      badge: "Cero Claves Expuestas",
      desc: "El navegador envía POST a /api/v1/campanas/{id}/analisis/. Nunca se comunica directamente con OpenAI o Gemini ni almacena credenciales API.",
    },
    {
      step: 2,
      title: "Backend Django (Seguridad & Contexto)",
      icon: Server,
      color: "#059669",
      badge: "Prompt Seguro en Servidor",
      desc: "Django valida la solicitud, extrae el snapshot de la base de datos (campaña, faltantes, puntos) y arma el SYSTEM_PROMPT en el servidor anonimizando información sensible.",
    },
    {
      step: 3,
      title: "Invocación Externa (Proxy Seguro)",
      icon: Cpu,
      color: "#7c3aed",
      badge: analysis?.proveedor ? `API ${analysis.proveedor.toUpperCase()}` : "API Externa",
      desc: "El servidor llama a la API externa autenticada con tokens privados (GEMINI_API_KEY / OPENAI_API_KEY) configurados únicamente en el archivo .env del backend.",
    },
    {
      step: 4,
      title: "Validación Estricta de Esquema",
      icon: ShieldCheck,
      color: "#d97706",
      badge: "Pydantic Schema JSON",
      desc: "Se procesa el JSON recibido, garantizando tipos exactos (resumen, prioridades con insumo_id numérico, motivo y acción recomendada) y se guarda en SQLite.",
    },
    {
      step: 5,
      title: "Entrega al Cliente en Formato Propio",
      icon: Database,
      color: "#0284c7",
      badge: "REST 200 OK",
      desc: "Nexo Solidario devuelve el resultado validado en el contrato estándar de su propia API REST, listo para renderizarse en la interfaz visual.",
    },
  ];

  return (
    <dialog
      ref={dialog}
      className="modal ai-arch-modal"
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
    >
      <div className="modal-heading">
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span className="ai-icon-small">
            <Sparkles size={20} />
          </span>
          <div>
            <span className="eyebrow">ARQUITECTURA DE SOFTWARE · SUSTENTACIÓN</span>
            <h2 style={{ fontSize: "1.3rem", margin: 0 }}>
              Flujo del Proxy de Inteligencia Artificial (5 Pasos)
            </h2>
          </div>
        </div>
        <button className="icon-button" onClick={close} aria-label="Cerrar modal">
          <X size={20} />
        </button>
      </div>

      <div className="ai-arch-body">
        <div className="ai-arch-security-banner">
          <Lock size={16} />
          <div>
            <strong>Principio de Seguridad Zero-Leakage:</strong> El frontend nunca contiene API keys de IA ni consume modelos externos en el cliente. Todo pasa por el Gateway / Proxy del Backend.
          </div>
        </div>

        <div className="ai-steps-container">
          {steps.map((s, index) => {
            const Icon = s.icon;
            return (
              <div className="ai-step-card" key={s.step}>
                <div className="ai-step-header">
                  <div
                    className="ai-step-badge"
                    style={{ backgroundColor: s.color }}
                  >
                    <span>{s.step}</span>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div className="ai-step-title">{s.title}</div>
                    <span className="ai-step-tag">{s.badge}</span>
                  </div>
                  <Icon size={20} color={s.color} />
                </div>
                <p className="ai-step-desc">{s.desc}</p>
                {index < steps.length - 1 && (
                  <div className="ai-step-arrow">
                    <ArrowRight size={14} />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {analysis && (
          <div className="ai-live-telemetry">
            <h4>
              <CheckCircle2 size={16} color="#059669" />
              Telemetría del último análisis ejecutado
            </h4>
            <div className="telemetry-grid">
              <div>
                <span className="t-label">Identificador:</span>
                <span className="t-val">{analysis.id.slice(0, 18)}...</span>
              </div>
              <div>
                <span className="t-label">Proveedor activo:</span>
                <span className="t-val t-badge">
                  {analysis.proveedor ? analysis.proveedor.toUpperCase() : "DEMO"}
                </span>
              </div>
              <div>
                <span className="t-label">Estado en BD:</span>
                <span className="t-val" style={{ color: "#059669" }}>
                  {analysis.estado}
                </span>
              </div>
              <div>
                <span className="t-label">Revisión Campaña:</span>
                <span className="t-val">v{analysis.revision}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="modal-footer">
        <button className="button primary" onClick={close}>
          Entendido
        </button>
      </div>
    </dialog>
  );
}

