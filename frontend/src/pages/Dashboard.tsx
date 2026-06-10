import { Link } from "react-router-dom";
import StatCard from "../components/StatCard";
import Loader from "../components/Loader";
import { Icon } from "../components/Icon";
import { useStats } from "../hooks/useStats";
import { fileKind, relativeTime } from "../lib/format";

// Paleta para as barras de distribuição (1ª usa o accent do tema).
const BAR_COLORS = [
  "var(--accent)",
  "#7c5cff",
  "#2f6bff",
  "#10a371",
  "#e0a83c",
  "var(--fg-faint)",
];

/** Página inicial com métricas, distribuição por tipo e últimos uploads. */
export default function Dashboard() {
  const { stats, loading, error } = useStats();

  if (loading) return <Loader label="Carregando estatísticas…" />;
  if (error || !stats)
    return <p className="alert">{error ?? "Erro ao carregar."}</p>;

  const maxTipo = Math.max(1, ...stats.por_tipo.map((t) => t.total));

  return (
    <>
      <div className="page-head">
        <div>
          <h3>Dashboard</h3>
          <p>Visão geral dos documentos processados.</p>
        </div>
        <Link to="/upload" className="btn btn-secondary btn-sm">
          <Icon name="plus" />
          Novo documento
        </Link>
      </div>

      <div className="grid cols-3">
        <StatCard
          label="Documentos processados"
          value={stats.total}
          icon="file"
        />
        <StatCard
          label="Tipos identificados"
          value={stats.por_tipo.length}
          icon="grid"
        />
        <StatCard
          label="Últimos uploads"
          value={stats.ultimos.length}
          icon="history"
        />
      </div>

      <div className="grid cols-2 mt-6" style={{ alignItems: "start" }}>
        {/* Distribuição por tipo */}
        <div className="card">
          <div className="card-head">
            <h4>Tipos de documentos</h4>
            <span className="muted" style={{ fontSize: "var(--text-xs)" }}>
              distribuição
            </span>
          </div>
          <div className="card-body">
            {stats.por_tipo.length === 0 ? (
              <p className="muted" style={{ fontSize: "var(--text-sm)" }}>
                Nenhum dado ainda.
              </p>
            ) : (
              <div className="dist">
                {stats.por_tipo.map((t, i) => {
                  const color = BAR_COLORS[i % BAR_COLORS.length];
                  return (
                    <div className="row" key={t.tipo}>
                      <span className="nm">
                        <span className="sq" style={{ background: color }} />
                        {t.tipo}
                      </span>
                      <div className="track">
                        <div
                          className="fill"
                          style={{
                            width: `${Math.round((t.total / maxTipo) * 100)}%`,
                            background: color,
                          }}
                        />
                      </div>
                      <span className="ct">{t.total}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Últimos uploads */}
        <div className="card">
          <div className="card-head">
            <h4>Últimos uploads</h4>
            <Link to="/history" className="link">
              Ver tudo
              <Icon name="chev-r" size={13} />
            </Link>
          </div>
          <div className="card-body flush">
            {stats.ultimos.length === 0 ? (
              <div className="empty">
                <div className="ei">
                  <Icon name="upload" />
                </div>
                <h4>Nenhum documento ainda</h4>
                <p>Envie o primeiro para vê-lo aqui.</p>
                <Link to="/upload" className="btn btn-primary btn-sm">
                  <Icon name="plus" />
                  Enviar documento
                </Link>
              </div>
            ) : (
              <div className="reclist">
                {stats.ultimos.map((doc) => {
                  const kind = fileKind(doc.mime_type);
                  return (
                    <Link key={doc.id} to={`/documents/${doc.id}`}>
                      <span className={`filetag ${kind}`}>
                        {kind.toUpperCase()}
                      </span>
                      <span className="nm">
                        <b>{doc.filename}</b>
                        <small>{doc.doc_type ?? "Processando"}</small>
                      </span>
                      <span className="when">
                        {relativeTime(doc.created_at)}
                      </span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
