import { useState } from "react";
import { Link, useParams } from "react-router";
import {
  ArrowLeft,
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  LoaderCircle,
  MapPin,
  Plus,
  Sparkles,
  Users,
  Zap,
  Layers,
  AlertTriangle,
  Printer,
  HeartHandshake,
} from "lucide-react";
import { QuickDonationModal } from "../components/QuickDonationModal";
import type { Resource } from "../types";
import { AiArchitectureModal } from "../components/AiArchitectureModal";
import {
  useAllResources,
  useCampaignAnalysis,
  useResource,
} from "../hooks/useResources";
import {
  Badge,
  Empty,
  ErrorState,
  Loading,
  Progress,
} from "../components/common";

export default function CampaignDetail() {
  const id = Number(useParams().id);
  if (!Number.isInteger(id) || id <= 0)
    return (
      <ErrorState
        error={new Error("El identificador de campaña no es válido.")}
      />
    );
  return <CampaignContent id={id} />;
}

function CampaignContent({ id }: { id: number }) {
  const campaign = useResource("campanas", id);
  const supplies = useAllResources("insumos", { campana: id });
  const { analysis, loading, error, start } = useCampaignAnalysis(id);
  const [showArchModal, setShowArchModal] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<string>("gemini");
  const [donatingSupply, setDonatingSupply] = useState<Resource | null>(null);
  const busy =
    analysis && ["pendiente", "procesando"].includes(analysis.estado);
  if (campaign.isPending) return <Loading />;
  if (campaign.error)
    return (
      <ErrorState
        error={campaign.error}
        retry={() => void campaign.refetch()}
      />
    );
  const data = campaign.data!;
  return (
    <>
      <div className="print-header">
        <h2>NEXO SOLIDARIO · REPORTE EJECUTIVO DE CAMPAÑA</h2>
        <p>Centro de Coordinación Humanitaria · Generado con Asistencia de IA</p>
      </div>
      <Link className="back-link print-hide" to="/campanas">
        <ArrowLeft size={16} />
        Todas las campañas
      </Link>
      <div className="page-heading">
        <div>
          <span className="eyebrow">
            CAMPAÑA · #{String(id).padStart(3, "0")}
          </span>
          <h1>{data.nombre}</h1>
          <p>{data.descripcion}</p>
        </div>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }} className="print-hide">
          <Badge value={data.estado} />
          <button
            type="button"
            className="button secondary small"
            onClick={() => window.print()}
            title="Exportar reporte en PDF o imprimir"
          >
            <Printer size={15} />
            Exportar PDF / Imprimir
          </button>
        </div>
      </div>
      <div className="detail-meta">
        <span>
          <MapPin size={16} />
          {data.municipio}
        </span>
        <span>
          <Users size={16} />
          {data.familias_objetivo} familias objetivo
        </span>
        <span>
          <CalendarDays size={16} />
          {data.fecha_inicio} → {data.fecha_fin}
        </span>
      </div>
      <div className="detail-grid">
        <section className="panel needs-panel">
          <div className="section-heading">
            <div>
              <span className="eyebrow">CADA APORTE NOS ACERCA</span>
              <h2>Qué ayuda necesitamos</h2>
            </div>
            <Link
              to={`/insumos?campana=${id}&crear=1`}
              className="icon-button"
              aria-label="Agregar insumo"
            >
              <Plus size={20} />
            </Link>
          </div>
          {supplies.isPending ? (
            <Loading />
          ) : supplies.error ? (
            <ErrorState
              error={supplies.error}
              retry={() => void supplies.refetch()}
            />
          ) : !supplies.data?.length ? (
            <Empty title="Definamos las primeras necesidades">
              Registra insumos y cantidades para conocer el avance de esta
              campaña.
            </Empty>
          ) : (
            <div className="needs-list">
              {[...supplies.data]
                .sort((a, b) => (a.cobertura || 0) - (b.cobertura || 0))
                .map((item) => (
                  <article className="need-item" key={item.id}>
                    <div className="need-heading">
                      <div>
                        <h3>{item.nombre}</h3>
                        <span>{item.punto_nombre}</span>
                      </div>
                      <Badge value={item.urgencia} />
                    </div>
                    <Progress value={item.cobertura} />
                    <div className="need-footer">
                      <span>
                        {item.cantidad_recibida} de {item.cantidad_requerida}{" "}
                        {item.unidad}
                      </span>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <strong>
                          {item.faltante
                            ? `Faltan ${item.faltante}`
                            : "Meta cubierta"}
                        </strong>
                        {Number(item.faltante) > 0 && (
                          <button
                            type="button"
                            className="quick-donate-btn print-hide"
                            onClick={() => setDonatingSupply(item)}
                            title="Registrar aporte rápido"
                          >
                            <HeartHandshake size={13} />
                            + Aporte
                          </button>
                        )}
                      </div>
                    </div>
                  </article>
                ))}
            </div>
          )}
          <Link className="text-link" to={`/insumos?campana=${id}`}>
            Administrar insumos <ArrowUpRight size={15} />
          </Link>
        </section>
        <section className="panel analysis-panel">
          <div className="analysis-top">
            <span className="ai-brand-badge">
              <Sparkles size={14} />
              NEXO AI COPILOT
            </span>
            <span
              className={`ai-provider-badge ${
                analysis?.proveedor === "gemini"
                  ? "gemini"
                  : analysis?.proveedor === "openai"
                    ? "openai"
                    : "demo"
              }`}
            >
              {analysis?.proveedor === "gemini"
                ? "GOOGLE GEMINI 2.0"
                : analysis?.proveedor === "openai"
                  ? "OPENAI GPT-4O"
                  : analysis?.proveedor === "deepseek"
                    ? "DEEPSEEK"
                    : analysis?.proveedor === "groq"
                      ? "GROQ LLAMA 3"
                      : "MODO SIMULACIÓN"}
            </span>
          </div>

          <h2>
            Diagnóstico inteligente
            <br />
            para la toma de decisiones.
          </h2>

          <p className="muted">
            Priorización automática de insumos, cálculo de brechas humanitarias
            y plan táctico generado por IA vía Proxy Server-to-Server.
          </p>

          <button
            type="button"
            className="arch-trigger-btn"
            onClick={() => setShowArchModal(true)}
          >
            <Layers size={14} />
            <span>📐 Ver Arquitectura del Proxy de IA (5 Pasos)</span>
          </button>

          <div className="ai-provider-selector">
            <label>Motor de IA para la prueba en vivo:</label>
            <div className="ai-provider-pills">
              <button
                type="button"
                className={`ai-provider-pill ${selectedProvider === "gemini" ? "active" : ""}`}
                onClick={() => setSelectedProvider("gemini")}
              >
                ✨ Gemini 2.0
              </button>
              <button
                type="button"
                className={`ai-provider-pill ${selectedProvider === "openai" ? "active" : ""}`}
                onClick={() => setSelectedProvider("openai")}
              >
                🤖 OpenAI
              </button>
              <button
                type="button"
                className={`ai-provider-pill ${selectedProvider === "demo" ? "active" : ""}`}
                onClick={() => setSelectedProvider("demo")}
              >
                🧪 Modo Demo
              </button>
            </div>
          </div>

          {analysis?.desactualizado && (
            <div className="warning-box">
              ⚠️ Se registraron nuevos datos desde el último reporte. Vuelve a
              analizar para actualizar las prioridades.
            </div>
          )}

          {loading ? (
            <Loading label="Consultando telemetría de IA…" />
          ) : busy ? (
            <div className="analysis-progress" role="status">
              <LoaderCircle size={24} className="spin" />
              <strong>Procesando con {selectedProvider.toUpperCase()}...</strong>
              <p>
                El servidor está enviando el snapshot al proxy y validando el
                esquema de respuesta.
              </p>
            </div>
          ) : analysis?.estado === "fallido" ? (
            <ErrorState error={new Error(analysis.error)} />
          ) : analysis?.resultado ? (
            <div className="analysis-result">
              <div className="analysis-summary-card">
                <h4>
                  <Sparkles size={14} />
                  Resumen Ejecutivo
                </h4>
                <p>{analysis.resultado.resumen}</p>
              </div>

              {analysis.resultado.prioridades.length ? (
                <div>
                  <h4 style={{ fontSize: "11px", textTransform: "uppercase", color: "#4b5563", margin: "14px 0 8px 0" }}>
                    🎯 Necesidades Prioritarias Calculadas:
                  </h4>
                  {analysis.resultado.prioridades.map((priority, index) => (
                    <div className="priority-card" key={priority.insumo_id}>
                      <div className="priority-card-top">
                        <span className="priority-card-num">Prioridad #{index + 1}</span>
                        <Badge value={priority.nivel} />
                      </div>
                      <p className="priority-card-reason">{priority.motivo}</p>
                      <div className="priority-card-action">
                        <Zap size={14} style={{ flexShrink: 0, marginTop: "2px" }} />
                        <span><strong>Acción táctica:</strong> {priority.accion}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="covered">
                  <CheckCircle2 size={17} />
                  Todas las metas registradas están cubiertas.
                </p>
              )}

              {analysis.resultado.recomendaciones.length > 0 && (
                <div className="recs-box">
                  <h4 style={{ fontSize: "11px", textTransform: "uppercase", color: "#4b5563", margin: "14px 0 8px 0" }}>
                    💡 Recomendaciones Estratégicas:
                  </h4>
                  {analysis.resultado.recomendaciones.map((text, index) => (
                    <div className="rec-item" key={index}>
                      <CheckCircle2 size={14} color="#059669" style={{ flexShrink: 0, marginTop: "2px" }} />
                      <span>{text}</span>
                    </div>
                  ))}
                </div>
              )}

              {analysis.resultado.datos_faltantes.length > 0 && (
                <div style={{ marginTop: "12px" }}>
                  {analysis.resultado.datos_faltantes.map((text, index) => (
                    <div className="warning-box" key={index} style={{ display: "flex", gap: "8px", alignItems: "flex-start" }}>
                      <AlertTriangle size={15} style={{ flexShrink: 0, marginTop: "2px" }} />
                      <span>{text}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="analysis-empty">
              <Sparkles size={25} />
              <p>Convierte los datos de esta campaña en un plan de acción.</p>
            </div>
          )}

          {error && <ErrorState error={error} />}

          <button
            className="button primary full-width"
            onClick={() =>
              start.mutate({ force: true, provider: selectedProvider })
            }
            disabled={start.isPending || Boolean(busy) || loading}
          >
            {start.isPending || busy ? (
              <LoaderCircle size={17} className="spin" />
            ) : (
              <Zap size={17} />
            )}
            {start.isPending || busy
              ? "Consultando IA en tiempo real..."
              : analysis?.resultado
                ? `⚡ Re-analizar con ${selectedProvider.toUpperCase()}`
                : `⚡ Iniciar Análisis con ${selectedProvider.toUpperCase()}`}
          </button>

          {analysis && (
            <span className="analysis-date">
              <Clock3 size={13} />
              Última ejecución:{" "}
              {new Date(analysis.creado_en).toLocaleString("es-CO", {
                timeZone: "America/Bogota",
              })}
            </span>
          )}

          <p className="ai-note">
            Proxy Server-to-Server validado. Toda comunicación externa está
            encriptada y protegida en el backend.
          </p>

          {showArchModal && (
            <AiArchitectureModal
              analysis={analysis}
              close={() => setShowArchModal(false)}
            />
          )}

          {donatingSupply && (
            <QuickDonationModal
              supply={donatingSupply}
              close={() => setDonatingSupply(null)}
              saved={() => supplies.refetch()}
            />
          )}
        </section>
      </div>
      <div className="related-links">
        <Link to={`/voluntarios?campana=${id}`}>
          <Users size={20} />
          <span>Voluntarios de la campaña</span>
          <ArrowUpRight size={17} />
        </Link>
        <Link to={`/puntos-acopio?campana=${id}`}>
          <MapPin size={20} />
          <span>Puntos de acopio</span>
          <ArrowUpRight size={17} />
        </Link>
      </div>
    </>
  );
}
