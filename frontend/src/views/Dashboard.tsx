import { Link } from "react-router";
import {
  ArrowRight,
  ArrowUpRight,
  Boxes,
  HeartHandshake,
  MapPin,
  Megaphone,
  Plus,
  Users,
} from "lucide-react";
import { useDashboard, useResources } from "../hooks/useResources";
import { CampaignCard } from "../components/CampaignCard";
import { Empty, ErrorState, Loading } from "../components/common";

export default function Dashboard() {
  const dashboard = useDashboard();
  const campaigns = useResources("campanas", { page_size: 3 });
  const stats = [
    {
      label: "Campañas activas",
      value: dashboard.data?.campanas_activas,
      icon: Megaphone,
      cls: "sage",
      detail: "Iniciativas en marcha",
    },
    {
      label: "Voluntarios disponibles",
      value: dashboard.data?.voluntarios_activos,
      icon: Users,
      cls: "blue",
      detail: "En campañas activas",
    },
    {
      label: "Necesidades pendientes",
      value: dashboard.data?.necesidades_pendientes,
      icon: Boxes,
      cls: "peach",
      detail: "Metas por completar",
    },
    {
      label: "Puntos habilitados",
      value: dashboard.data?.puntos_activos,
      icon: MapPin,
      cls: "lilac",
      detail: "Listos para recibir ayuda",
    },
  ];
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">PANORAMA GENERAL</span>
          <h1>
            La ayuda empieza con una conexión
            <span className="title-dot">.</span>
          </h1>
          <p>Todo lo que necesitas para coordinar el próximo paso.</p>
        </div>
        <Link className="button primary" to="/campanas?crear=1">
          <Plus size={17} />
          Crear campaña
        </Link>
      </div>
      <section className="welcome-banner">
        <div className="welcome-copy">
          <span className="banner-tag">
            <span />
            CADA APORTE CUENTA
          </span>
          <h2>
            Conectamos personas.
            <br />
            Multiplicamos la ayuda.
          </h2>
          <p>
            Un lugar para organizar esfuerzos y transformar
            <br className="desktop-break" /> la solidaridad en acciones
            concretas.
          </p>
          <Link to="/insumos" className="banner-link">
            Explorar necesidades <ArrowUpRight size={17} />
          </Link>
        </div>
        <div className="connection-art" aria-hidden="true">
          <div className="orbit orbit-one" />
          <div className="orbit orbit-two" />
          <div className="art-center">
            <HeartHandshake size={57} strokeWidth={1.3} />
          </div>
          <span className="art-node node-one">
            <Users size={24} />
          </span>
          <span className="art-node node-two">
            <Boxes size={24} />
          </span>
          <span className="art-node node-three">
            <MapPin size={24} />
          </span>
          <span className="art-spark spark-one">+</span>
          <span className="art-spark spark-two">+</span>
          <span className="art-dot dot-one" />
          <span className="art-dot dot-two" />
        </div>
      </section>
      {dashboard.isPending ? (
        <Loading />
      ) : dashboard.error ? (
        <ErrorState
          error={dashboard.error}
          retry={() => void dashboard.refetch()}
        />
      ) : (
        <section className="stats-grid" aria-label="Indicadores">
          {stats.map(({ label, value, icon: Icon, cls, detail }) => (
            <article className="stat-card" key={label}>
              <span className={`stat-icon ${cls}`}>
                <Icon size={20} />
              </span>
              <span className="stat-label">{label}</span>
              <strong>{value}</strong>
              <span className="stat-detail">{detail}</span>
            </article>
          ))}
        </section>
      )}
      <section>
        <div className="section-heading">
          <div>
            <h2>
              Campañas recientes{" "}
              <span className="count-pill">{campaigns.data?.count ?? "—"}</span>
            </h2>
            <p>Pequeños esfuerzos, un impacto compartido.</p>
          </div>
          <Link to="/campanas" className="text-link">
            Ver todas <ArrowRight size={16} />
          </Link>
        </div>
        {campaigns.isPending ? (
          <Loading />
        ) : campaigns.error ? (
          <ErrorState
            error={campaigns.error}
            retry={() => void campaigns.refetch()}
          />
        ) : campaigns.data?.results.length ? (
          <div className="campaign-grid">
            {campaigns.data.results.map((campaign) => (
              <CampaignCard key={campaign.id} campaign={campaign} />
            ))}
          </div>
        ) : (
          <div className="panel">
            <Empty title="Tu primera campaña empieza aquí">
              Crea una iniciativa y conecta voluntarios, puntos de acopio e
              insumos.
            </Empty>
          </div>
        )}
      </section>
      <section className="next-step">
        <span className="next-icon">
          <HeartHandshake size={25} />
        </span>
        <div>
          <h3>La solidaridad también se organiza.</h3>
          <p>
            Mantén las cantidades actualizadas para saber dónde hace falta el
            próximo aporte.
          </p>
        </div>
        <Link to="/insumos" className="text-link">
          Revisar insumos <ArrowUpRight size={16} />
        </Link>
      </section>
    </>
  );
}
