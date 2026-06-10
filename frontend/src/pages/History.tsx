import { useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import DocumentTable from "../components/DocumentTable";
import Loader from "../components/Loader";
import { Icon } from "../components/Icon";
import { useDocuments } from "../hooks/useDocuments";

const PAGE_SIZE = 8;

/** Histórico de documentos com busca e paginação no cliente. */
export default function History() {
  const { documents, loading, error } = useDocuments();
  const location = useLocation();
  const initialQuery =
    (location.state as { q?: string } | null)?.q ?? "";

  const [query, setQuery] = useState(initialQuery);
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return documents;
    return documents.filter(
      (d) =>
        d.filename.toLowerCase().includes(q) ||
        (d.doc_type ?? "").toLowerCase().includes(q),
    );
  }, [documents, query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * PAGE_SIZE;
  const pageItems = filtered.slice(start, start + PAGE_SIZE);

  return (
    <>
      <div className="page-head">
        <div>
          <h3>Histórico</h3>
          <p>Todos os documentos já processados.</p>
        </div>
        <Link to="/upload" className="btn btn-primary btn-sm">
          <Icon name="plus" />
          Novo documento
        </Link>
      </div>

      {loading ? (
        <Loader label="Carregando documentos…" />
      ) : error ? (
        <p className="alert">{error}</p>
      ) : documents.length === 0 ? (
        <div className="table-wrap">
          <div className="empty">
            <div className="ei">
              <Icon name="history" />
            </div>
            <h4>Nenhum documento processado ainda</h4>
            <p>Envie um arquivo para começar a montar seu histórico.</p>
            <Link to="/upload" className="btn btn-primary btn-sm">
              <Icon name="plus" />
              Enviar documento
            </Link>
          </div>
        </div>
      ) : (
        <div className="table-wrap">
          <div className="table-toolbar">
            <div className="input-group">
              <Icon name="search" />
              <input
                placeholder="Filtrar por arquivo ou tipo…"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(1);
                }}
              />
            </div>
            <span className="spacer" style={{ flex: 1 }} />
            <span className="muted" style={{ fontSize: "var(--text-sm)" }}>
              {filtered.length}{" "}
              {filtered.length === 1 ? "documento" : "documentos"}
            </span>
          </div>

          {pageItems.length === 0 ? (
            <div className="empty">
              <h4>Nenhum resultado</h4>
              <p>Tente outro termo de busca.</p>
            </div>
          ) : (
            <DocumentTable documents={pageItems} />
          )}

          {filtered.length > 0 && (
            <div className="pager">
              <span>
                Mostrando{" "}
                <b className="mono" style={{ color: "var(--fg)" }}>
                  {start + 1}–{start + pageItems.length}
                </b>{" "}
                de{" "}
                <b className="mono" style={{ color: "var(--fg)" }}>
                  {filtered.length}
                </b>
              </span>
              {totalPages > 1 && (
                <div className="pages">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                    (p) => (
                      <span
                        key={p}
                        className={`pg${p === safePage ? " active" : ""}`}
                        onClick={() => setPage(p)}
                      >
                        {p}
                      </span>
                    ),
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </>
  );
}
