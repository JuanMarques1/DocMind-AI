import axios from "axios";

// Em produção (Vercel) defina VITE_API_URL com a URL do backend no Render
// (ex.: https://docmind-api.onrender.com). Em desenvolvimento, fica vazio e o
// Vite faz proxy de /api para o backend local.
const API_ROOT = import.meta.env.VITE_API_URL ?? "";

// Cliente Axios apontando para a API do backend.
const api = axios.create({ baseURL: `${API_ROOT}/api` });

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
export const downloadUrl = (id: number) =>
  `${API_ROOT}/api/documents/${id}/download`;
export const fileUrl = (id: number) => `${API_ROOT}/api/documents/${id}/file`;

export default api;
