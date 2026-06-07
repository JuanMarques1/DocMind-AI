import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Dropzone from "../components/Dropzone";
import Loader from "../components/Loader";
import { uploadDocument } from "../services/api";

/** Página de upload com drag-and-drop e loading durante o processamento. */
export default function Upload() {
  const navigate = useNavigate();
  const [processando, setProcessando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function handleFile(file: File) {
    setErro(null);
    setProcessando(true);
    try {
      const doc = await uploadDocument(file);
      navigate(`/documents/${doc.id}`);
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail ?? "Falha ao processar o documento.";
      setErro(msg);
    } finally {
      setProcessando(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
          Enviar documento
        </h2>
        <p className="text-slate-500 dark:text-slate-400">
          A IA vai extrair o texto e identificar as informações importantes.
        </p>
      </div>

      {processando ? (
        <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <Loader label="Processando documento com IA…" />
        </div>
      ) : (
        <Dropzone onFile={handleFile} />
      )}

      {erro && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">
          {erro}
        </p>
      )}
    </div>
  );
}
