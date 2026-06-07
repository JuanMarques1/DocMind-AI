import { useEffect, useState } from "react";
import { getDocuments, type DocumentRead } from "../services/api";

/** Carrega a lista de documentos do histórico. */
export function useDocuments() {
  const [documents, setDocuments] = useState<DocumentRead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getDocuments()
      .then(setDocuments)
      .catch(() => setError("Não foi possível carregar os documentos."))
      .finally(() => setLoading(false));
  }, []);

  return { documents, loading, error };
}
