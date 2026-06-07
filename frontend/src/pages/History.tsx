import DocumentTable from "../components/DocumentTable";
import Loader from "../components/Loader";
import { useDocuments } from "../hooks/useDocuments";

/** Página com o histórico de documentos analisados. */
export default function History() {
  const { documents, loading, error } = useDocuments();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
          Histórico
        </h2>
        <p className="text-slate-500 dark:text-slate-400">
          Todos os documentos já processados.
        </p>
      </div>

      {loading ? (
        <Loader label="Carregando documentos…" />
      ) : error ? (
        <p className="text-red-500">{error}</p>
      ) : (
        <DocumentTable documents={documents} />
      )}
    </div>
  );
}
