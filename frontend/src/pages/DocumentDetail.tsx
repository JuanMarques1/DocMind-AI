import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import FilePreview from "../components/FilePreview";
import JsonViewer from "../components/JsonViewer";
import Loader from "../components/Loader";
import { Icon } from "../components/Icon";
import {
  downloadAnalysis,
  fetchFileObjectUrl,
  getDocument,
  type DocumentDetail as Detail,
} from "../services/api";

/** Página de detalhes: visualizador do arquivo + resultado da análise. */
export default function DocumentDetail() {
  const { id } = useParams<{ id: string }>();
  const [doc, setDoc] = useState<Detail | null>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    getDocument(Number(id))
      .then(setDoc)
      .catch(() => setErro("Documento não encontrado."))
      .finally(() => setLoading(false));
  }, [id]);

  // Carrega o arquivo original (autenticado) como object URL e revoga ao sair.
  useEffect(() => {
    if (!id) return;
    let url: string | null = null;
    fetchFileObjectUrl(Number(id))
      .then((u) => {
        url = u;
        setFileUrl(u);
      })
      .catch(() => setFileUrl(null));
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [id]);

  if (loading) return <Loader label="Carregando documento…" />;
  if (erro || !doc) return <p className="alert">{erro ?? "Erro."}</p>;

  return (
    <>
      <div className="page-head">
        <div>
          <Link to="/history" className="link">
            <Icon name="arrow-left" size={14} />
            Voltar ao histórico
          </Link>
          <h3 style={{ marginTop: 4 }}>{doc.filename}</h3>
        </div>
        {doc.analysis && (
          <button
            className="btn btn-primary btn-sm"
            onClick={() => downloadAnalysis(doc.id, `analise_${doc.id}.json`)}
          >
            <Icon name="download" />
            Baixar JSON
          </button>
        )}
      </div>

      {doc.status === "error" && (
        <p className="alert mt-4" style={{ marginBottom: "var(--space-6)" }}>
          Erro no processamento: {doc.error}
        </p>
      )}

      <div className="grid cols-2" style={{ alignItems: "start" }}>
        <div className="card">
          <div className="card-head">
            <h4>Visualização</h4>
          </div>
          <div className="card-body">
            {fileUrl ? (
              <FilePreview url={fileUrl} mimeType={doc.mime_type} />
            ) : (
              <Loader label="Carregando arquivo…" />
            )}
          </div>
        </div>

        <div className="grid" style={{ gap: "var(--space-4)" }}>
          {doc.analysis && (
            <div className="card">
              <div className="card-body">
                <span className="badge badge-accent">{doc.analysis.tipo}</span>
                <h4
                  style={{
                    margin: "var(--space-4) 0 4px",
                    fontSize: "var(--text-base)",
                  }}
                >
                  Resumo
                </h4>
                <p
                  className="muted"
                  style={{ margin: 0, fontSize: "var(--text-sm)" }}
                >
                  {doc.analysis.resumo}
                </p>
              </div>
            </div>
          )}

          <div className="card">
            <div className="card-head">
              <h4>Resultado da extração</h4>
            </div>
            <div className="card-body">
              <JsonViewer data={doc.analysis ?? { status: doc.status }} />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
