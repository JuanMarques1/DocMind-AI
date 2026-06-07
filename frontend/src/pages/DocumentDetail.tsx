import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import FilePreview from "../components/FilePreview";
import JsonViewer from "../components/JsonViewer";
import Loader from "../components/Loader";
import {
  downloadUrl,
  fileUrl,
  getDocument,
  type DocumentDetail as Detail,
} from "../services/api";

/** Página de detalhes: visualizador do arquivo + resultado da análise. */
export default function DocumentDetail() {
  const { id } = useParams<{ id: string }>();
  const [doc, setDoc] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    getDocument(Number(id))
      .then(setDoc)
      .catch(() => setErro("Documento não encontrado."))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <Loader label="Carregando documento…" />;
  if (erro || !doc) return <p className="text-red-500">{erro ?? "Erro."}</p>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            to="/history"
            className="text-sm text-brand-600 hover:underline dark:text-brand-500"
          >
            ← Voltar ao histórico
          </Link>
          <h2 className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
            {doc.filename}
          </h2>
        </div>
        {doc.analysis && (
          <a
            href={downloadUrl(doc.id)}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-700"
          >
            ⬇️ Baixar JSON
          </a>
        )}
      </div>

      {doc.status === "error" && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">
          Erro no processamento: {doc.error}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
          <h3 className="mb-4 font-semibold text-slate-800 dark:text-slate-100">
            Visualização
          </h3>
          <FilePreview url={fileUrl(doc.id)} mimeType={doc.mime_type} />
        </section>

        <section className="space-y-4">
          {doc.analysis && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
              <span className="inline-block rounded-full bg-brand-50 px-3 py-1 text-sm font-medium text-brand-700 dark:bg-brand-600/20 dark:text-brand-400">
                {doc.analysis.tipo}
              </span>
              <h3 className="mt-4 font-semibold text-slate-800 dark:text-slate-100">
                Resumo
              </h3>
              <p className="mt-1 text-slate-600 dark:text-slate-300">
                {doc.analysis.resumo}
              </p>
            </div>
          )}

          <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
            <h3 className="mb-3 font-semibold text-slate-800 dark:text-slate-100">
              Resultado da extração
            </h3>
            <JsonViewer data={doc.analysis ?? { status: doc.status }} />
          </div>
        </section>
      </div>
    </div>
  );
}
