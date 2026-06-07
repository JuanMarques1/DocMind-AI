import { Link } from "react-router-dom";
import StatCard from "../components/StatCard";
import Loader from "../components/Loader";
import { useStats } from "../hooks/useStats";

/** Página inicial com estatísticas agregadas. */
export default function Dashboard() {
  const { stats, loading, error } = useStats();

  if (loading) return <Loader label="Carregando estatísticas…" />;
  if (error || !stats)
    return <p className="text-red-500">{error ?? "Erro ao carregar."}</p>;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
          Dashboard
        </h2>
        <p className="text-slate-500 dark:text-slate-400">
          Visão geral dos documentos processados.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="Documentos processados" value={stats.total} icon="📄" />
        <StatCard
          label="Tipos identificados"
          value={stats.por_tipo.length}
          icon="🏷️"
        />
        <StatCard
          label="Últimos uploads"
          value={stats.ultimos.length}
          icon="🕒"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
          <h3 className="mb-4 font-semibold text-slate-800 dark:text-slate-100">
            Tipos de documentos
          </h3>
          {stats.por_tipo.length === 0 ? (
            <p className="text-sm text-slate-500">Nenhum dado ainda.</p>
          ) : (
            <ul className="space-y-2">
              {stats.por_tipo.map((t) => (
                <li
                  key={t.tipo}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="text-slate-700 dark:text-slate-300">
                    {t.tipo}
                  </span>
                  <span className="rounded-full bg-brand-50 px-2.5 py-0.5 font-medium text-brand-700 dark:bg-brand-600/20 dark:text-brand-400">
                    {t.total}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
          <h3 className="mb-4 font-semibold text-slate-800 dark:text-slate-100">
            Últimos uploads
          </h3>
          {stats.ultimos.length === 0 ? (
            <p className="text-sm text-slate-500">
              Nenhum documento ainda.{" "}
              <Link to="/upload" className="text-brand-600 hover:underline">
                Enviar o primeiro →
              </Link>
            </p>
          ) : (
            <ul className="space-y-2">
              {stats.ultimos.map((doc) => (
                <li key={doc.id}>
                  <Link
                    to={`/documents/${doc.id}`}
                    className="flex items-center justify-between rounded-lg px-2 py-1.5 text-sm hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    <span className="truncate text-slate-700 dark:text-slate-300">
                      {doc.filename}
                    </span>
                    <span className="ml-2 shrink-0 text-slate-400">
                      {doc.doc_type ?? "—"}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
