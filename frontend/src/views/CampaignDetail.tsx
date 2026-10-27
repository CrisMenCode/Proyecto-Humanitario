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
} from "lucide-react";
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
      <Link className="back-link" to="/campanas">
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
        <Badge value={data.estado} />
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
                      <strong>
                        {item.faltante
                          ? `Faltan ${item.faltante}`
                          : "Meta cubierta"}
                      </strong>
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
            <span className="ai-icon">
              <Sparkles size={23} />
            </span>
            <span className="badge neutral">
              {analysis?.proveedor === "demo"
                ? "SIMULACIÓN"
                : analysis?.proveedor === "openai"
                  ? "OPENAI"
                  : "ASISTENTE"}
            </span>
          </div>
          <h2>
            Una perspectiva para
            <br />
            el próximo paso.
          </h2>
          <p className="muted">
            Prioridades explicadas y un resumen de tu campaña, basados en la
            información registrada.
          </p>
          {analysis?.desactualizado && (
            <div className="warning-box">
              Los datos cambiaron desde este análisis. Genera uno nuevo para
              actualizar las recomendaciones.
            </div>
          )}
          {loading ? (
            <Loading label="Consultando análisis…" />
          ) : busy ? (
            <div className="analysis-progress" role="status">
              <LoaderCircle size={22} className="spin" />
              <strong>
                {analysis?.estado === "pendiente"
                  ? "Análisis en espera"
                  : "Analizando la campaña"}
              </strong>
              <p>
                Puedes seguir trabajando. El resultado aparecerá aquí cuando
                esté listo.
              </p>
            </div>
          ) : analysis?.estado === "fallido" ? (
            <ErrorState error={new Error(analysis.error)} />
          ) : analysis?.resultado ? (
            <div className="analysis-result">
              <p className="analysis-summary">{analysis.resultado.resumen}</p>
              {analysis.resultado.prioridades.length ? (
                <ol className="priorities">
                  {analysis.resultado.prioridades.map((priority, index) => (
                    <li key={priority.insumo_id}>
                      <span className="priority-number">{index + 1}</span>
                      <div>
                        <Badge value={priority.nivel} />
                        <p>{priority.motivo}</p>
                        <small>{priority.accion}</small>
                      </div>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="covered">
                  <CheckCircle2 size={17} />
                  Todas las metas registradas están cubiertas.
                </p>
              )}
              {analysis.resultado.recomendaciones.map((text, index) => (
                <p className="recommendation" key={index}>
                  {text}
                </p>
              ))}
              {analysis.resultado.datos_faltantes.map((text, index) => (
                <p className="warning-box" key={index}>
                  {text}
                </p>
              ))}
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
            onClick={() => start.mutate()}
            disabled={
              start.isPending ||
              Boolean(busy) ||
              loading ||
              Boolean(
                analysis?.estado === "completado" && !analysis.desactualizado,
              )
            }
          >
            {start.isPending || busy ? (
              <LoaderCircle size={17} className="spin" />
            ) : (
              <Sparkles size={17} />
            )}
            {busy
              ? "Análisis en curso"
              : analysis?.estado === "completado" && !analysis.desactualizado
                ? "Análisis actualizado"
                : analysis?.estado === "fallido"
                  ? "Reintentar análisis"
                  : "Analizar campaña"}
          </button>
          {analysis && (
            <span className="analysis-date">
              <Clock3 size={13} />
              Solicitado{" "}
              {new Date(analysis.creado_en).toLocaleString("es-CO", {
                timeZone: "America/Bogota",
              })}
            </span>
          )}
          <p className="ai-note">
            {analysis?.proveedor === "demo"
              ? "Modo de demostración: reglas locales, sin llamadas a IA. "
              : ""}
            Revisa las sugerencias antes de coordinar acciones.
          </p>
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
