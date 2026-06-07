import axios from "axios";

// Cliente Axios apontando para a API do backend (proxy /api no dev, nginx em prod).
const api = axios.create({ baseURL: "/api" });

export interface AnalysisResult {
  tipo: string;
  resumo: string;
  informacoes: Record<string, unknown>;
}

export interface DocumentRead {
  id: number;
  filename: string;
  mime_type: string;
  doc_type: string | null;
  summary: string | null;
  status: string;
  error: string | null;
  created_at: string;
}

export interface DocumentDetail extends DocumentRead {
  analysis: AnalysisResult | null;
}

export interface TipoContagem {
  tipo: string;
  total: number;
}

export interface Stats {
  total: number;
  por_tipo: TipoContagem[];
  ultimos: DocumentRead[];
}

export async function uploadDocument(file: File): Promise<DocumentDetail> {
  const form = new FormData();
  form.append("file", file);
  const { data } = await api.post<DocumentDetail>("/documents", form);
  return data;
}

export async function getDocuments(): Promise<DocumentRead[]> {
  const { data } = await api.get<DocumentRead[]>("/documents");
  return data;
}

export async function getDocument(id: number): Promise<DocumentDetail> {
  const { data } = await api.get<DocumentDetail>(`/documents/${id}`);
  return data;
}

export async function getStats(): Promise<Stats> {
  const { data } = await api.get<Stats>("/stats");
  return data;
}

// URLs diretas para download do JSON e visualização do arquivo original.
export const downloadUrl = (id: number) => `/api/documents/${id}/download`;
export const fileUrl = (id: number) => `/api/documents/${id}/file`;

export default api;
