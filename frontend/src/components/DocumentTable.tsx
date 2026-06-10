import { useNavigate } from "react-router-dom";
import type { DocumentRead } from "../services/api";
import { Icon } from "./Icon";
import { fileKind, formatDate } from "../lib/format";

interface DocumentTableProps {
  documents: DocumentRead[];
}

const STATUS: Record<string, { texto: string; classe: string }> = {
  done: { texto: "Concluído", classe: "badge-success" },
  processing: { texto: "Processando", classe: "badge-warning" },
  error: { texto: "Erro", classe: "badge-danger" },
};

/** Tabela enterprise do histórico (estilo Linear/Vercel). */
export default function DocumentTable({ documents }: DocumentTableProps) {
  const navigate = useNavigate();

  return (
    <table className="tbl">
      <thead>
        <tr>
          <th>Arquivo</th>
          <th>Tipo</th>
          <th>Data</th>
          <th>Status</th>
          <th />
        </tr>
      </thead>
      <tbody>
        {documents.map((doc) => {
          const status = STATUS[doc.status] ?? STATUS.processing;
          const kind = fileKind(doc.mime_type);
          return (
            <tr key={doc.id} onClick={() => navigate(`/documents/${doc.id}`)}>
              <td>
                <span className="file-cell">
                  <span className={`filetag ${kind}`}>{kind.toUpperCase()}</span>
                  <b>{doc.filename}</b>
                </span>
              </td>
              <td>
                <span className="badge badge-neutral">
                  {doc.doc_type ?? "—"}
                </span>
              </td>
              <td className="mono">{formatDate(doc.created_at)}</td>
              <td>
                <span className={`badge ${status.classe}`}>
                  <span className="dot" />
                  {status.texto}
                </span>
              </td>
              <td>
                <span className="row-act">
                  <Icon name="dots" />
                </span>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
