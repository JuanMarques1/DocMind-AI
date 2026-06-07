import { Link } from "react-router-dom";
import type { DocumentRead } from "../services/api";

interface DocumentTableProps {
  documents: DocumentRead[];
}

const STATUS_LABEL: Record<string, { texto: string; classe: string }> = {
  done: { texto: "Concluído", classe: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300" },
  processing: { texto: "Processando", classe: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300" },
  error: { texto: "Erro", classe: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300" },
};

function formatarData(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR");
}

/** Tabela do histórico de documentos. */
export default function DocumentTable({ documents }: DocumentTableProps) {
  if (documents.length === 0) {
    return (
      <p className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
        Nenhum documento processado ainda.
      </p>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-50 text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
          <tr>
            <th className="px-6 py-3 font-medium">Arquivo</th>
            <th className="px-6 py-3 font-medium">Tipo</th>
            <th className="px-6 py-3 font-medium">Data</th>
            <th className="px-6 py-3 font-medium">Status</th>
            <th className="px-6 py-3" />
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {documents.map((doc) => {
            const status = STATUS_LABEL[doc.status] ?? STATUS_LABEL.processing;
            return (
              <tr key={doc.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                <td className="px-6 py-4 font-medium text-slate-800 dark:text-slate-200">
                  {doc.filename}
                </td>
                <td className="px-6 py-4 text-slate-600 dark:text-slate-400">
                  {doc.doc_type ?? "—"}
                </td>
                <td className="px-6 py-4 text-slate-600 dark:text-slate-400">
                  {formatarData(doc.created_at)}
                </td>
                <td className="px-6 py-4">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${status.classe}`}>
                    {status.texto}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <Link
                    to={`/documents/${doc.id}`}
                    className="font-medium text-brand-600 hover:underline dark:text-brand-500"
                  >
                    Detalhes →
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
