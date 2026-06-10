import { useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Icon } from "./Icon";
import { IconSprite } from "./Icon";
import ThemeToggle from "./ThemeToggle";
import AccentPicker from "./AccentPicker";

const NAV = [
  { to: "/", label: "Dashboard", icon: "grid", end: true },
  { to: "/upload", label: "Upload", icon: "upload", end: false },
  { to: "/history", label: "Histórico", icon: "history", end: false },
] as const;

/** Rótulo do breadcrumb a partir da rota atual. */
function crumbFor(pathname: string): string {
  if (pathname.startsWith("/upload")) return "Enviar documento";
  if (pathname.startsWith("/history")) return "Histórico";
  if (pathname.startsWith("/documents")) return "Documento";
  return "Dashboard";
}

/** App shell: sidebar refinada + topbar + conteúdo roteado. */
export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [busca, setBusca] = useState("");

  function submitBusca(e: React.FormEvent) {
    e.preventDefault();
    navigate("/history", { state: { q: busca } });
  }

  return (
    <div className="app-root">
      <IconSprite />

      {/* Sidebar */}
      <aside className="side">
        <div className="org">
          <span className="logo">
            <Icon name="logo" />
          </span>
          <span className="name">
            DocMind
            <small>Inteligência documental</small>
          </span>
          <Icon name="chev-d" size={14} className="chev" />
        </div>

        <div>
          <div className="group-label">Workspace</div>
          <nav>
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `nav-item${isActive ? " active" : ""}`
                }
              >
                <Icon name={item.icon} />
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="bottom">
          <div className="user">
            <span className="av">DM</span>
            <span className="who">
              <b>DocMind AI</b>
              <small>Analista de dados</small>
            </span>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="main">
        <div className="topbar">
          <div className="crumb">
            <span className="crumb-root">DocMind</span>
            <Icon name="chev-r" />
            <b>{crumbFor(location.pathname)}</b>
          </div>
          <span className="spacer" />
          <form
            className="input-group search-box"
            style={{ height: 34, maxWidth: 240 }}
            onSubmit={submitBusca}
          >
            <Icon name="search" />
            <input
              placeholder="Buscar documentos…"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </form>
          <AccentPicker />
          <ThemeToggle />
          <NavLink to="/upload" className="btn btn-primary btn-sm">
            <Icon name="plus" />
            Novo
          </NavLink>
        </div>

        <div className="content">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
