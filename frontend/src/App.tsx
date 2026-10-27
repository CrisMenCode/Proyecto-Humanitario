import { useState } from "react";
import { Link, NavLink, Route, Routes, useLocation } from "react-router";
import {
  ArrowUpRight,
  Boxes,
  ChevronRight,
  HeartHandshake,
  LayoutDashboard,
  MapPin,
  Menu,
  Megaphone,
  Users,
  X,
} from "lucide-react";
import Dashboard from "./views/Dashboard";
import ResourcePage from "./views/ResourcePage";
import CampaignDetail from "./views/CampaignDetail";
import { SWAGGER_URL } from "./services/api";
import type { ResourceKey } from "./types";

const navigation = [
  { to: "/", label: "Vista general", icon: LayoutDashboard },
  { to: "/campanas", label: "Campañas", icon: Megaphone },
  { to: "/voluntarios", label: "Voluntarios", icon: Users },
  { to: "/insumos", label: "Insumos", icon: Boxes },
  { to: "/puntos-acopio", label: "Puntos de acopio", icon: MapPin },
];

export default function App() {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const current =
    navigation.find(
      (item) => item.to !== "/" && location.pathname.startsWith(item.to),
    )?.label || "Vista general";
  return (
    <div className="app-shell">
      {menuOpen && (
        <button
          className="sidebar-backdrop"
          aria-label="Cerrar navegación"
          onClick={() => setMenuOpen(false)}
        />
      )}
      <aside className={`sidebar ${menuOpen ? "open" : ""}`}>
        <Link to="/" className="brand" onClick={() => setMenuOpen(false)}>
          <span className="brand-mark">
            <HeartHandshake size={25} strokeWidth={1.6} />
          </span>
          <span>
            nexo<span className="brand-sub">solidario</span>
          </span>
        </Link>
        <button
          className="icon-button mobile-close"
          aria-label="Cerrar menú"
          onClick={() => setMenuOpen(false)}
        >
          <X size={20} />
        </button>
        <span className="nav-label">ESPACIO DE TRABAJO</span>
        <nav aria-label="Navegación principal">
          {navigation.map(({ to, label, icon: Icon }) => (
            <NavLink
              to={to}
              end={to === "/"}
              key={to}
              onClick={() => setMenuOpen(false)}
              className={({ isActive }) =>
                `nav-item ${isActive ? "active" : ""}`
              }
            >
              <Icon size={19} strokeWidth={1.6} />
              <span>{label}</span>
              <ChevronRight size={14} />
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-note">
          <span className="note-heart">
            <HeartHandshake size={23} />
          </span>
          <h3>
            Juntos llegamos
            <br />
            más lejos.
          </h3>
          <p>Organizar la ayuda también es una forma de ayudar.</p>
          <Link to="/campanas?crear=1" onClick={() => setMenuOpen(false)}>
            Iniciar una campaña <ArrowUpRight size={15} />
          </Link>
        </div>
        <div className="sidebar-bottom">
          <span className="avatar small-avatar">CM</span>
          <div>
            <strong>Cristian & Jimmy</strong>
            <span>Equipo de coordinación</span>
          </div>
          <span className="online-dot" />
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="icon-button mobile-menu"
              aria-label="Abrir menú"
              onClick={() => setMenuOpen(true)}
            >
              <Menu size={22} />
            </button>
            <span>Centro de coordinación</span>
            <ChevronRight size={13} />
            <strong>{current}</strong>
          </div>
          <div className="topbar-actions">
            <span className="workspace-badge">
              <span />
              Espacio local
            </span>
            <span className="avatar">NS</span>
          </div>
        </header>
        <main id="main-content" className="main-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            {(
              [
                "campanas",
                "voluntarios",
                "insumos",
                "puntos-acopio",
              ] as ResourceKey[]
            ).map((kind) => (
              <Route
                key={kind}
                path={`/${kind}`}
                element={<ResourcePage key={kind} kind={kind} />}
              />
            ))}
            <Route path="/campanas/:id" element={<CampaignDetail />} />
            <Route
              path="*"
              element={
                <div className="empty">
                  <h1>No encontramos esta página.</h1>
                  <Link className="button primary" to="/">
                    Ir a la vista general
                  </Link>
                </div>
              }
            />
          </Routes>
          <footer className="footer">
            <span>
              Nexo Solidario <span>·</span> Cada conexión cuenta.
            </span>
            <a href={SWAGGER_URL} target="_blank" rel="noreferrer">
              Documentación de la API <ArrowUpRight size={13} />
            </a>
          </footer>
        </main>
      </div>
    </div>
  );
}
