import axios from "axios";

// Em produção (Vercel) defina VITE_API_URL com a URL do backend no Render
// (ex.: https://docmind-api.onrender.com). Em desenvolvimento, fica vazio e o
// Vite faz proxy de /api para o backend local.
const API_ROOT = import.meta.env.VITE_API_URL ?? "";

const TOKEN_KEY = "docmind_token";

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (t: string) => localStorage.setItem(TOKEN_KEY, t),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

// Cliente Axios apontando para a API do backend.
const api = axios.create({ baseURL: `${API_ROOT}/api` });

// Anexa o token Bearer em toda request, se houver.
api.interceptors.request.use((config) => {
  const token = tokenStore.get();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// 401 → sessão expirou/inválida: limpa o token e manda para o login.
api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      tokenStore.clear();
      if (!location.pathname.startsWith("/login")) {
        location.href = "/login";
      }
    }
    return Promise.reject(error);
  },
);

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

export interface User {
  id: number;
  email: string;
  created_at: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export async function register(
  email: string,
  password: string,
): Promise<AuthResponse> {
  const { data } = await api.post<AuthResponse>("/auth/register", {
    email,
    password,
  });
  return data;
}

export async function login(
  email: string,
  password: string,
): Promise<AuthResponse> {
  const { data } = await api.post<AuthResponse>("/auth/login", {
    email,
    password,
  });
  return data;
}

export async function getMe(): Promise<User> {
  const { data } = await api.get<User>("/auth/me");
  return data;
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

// Baixa o arquivo original (autenticado) como object URL para o visualizador.
export async function fetchFileObjectUrl(id: number): Promise<string> {
  const { data } = await api.get(`/documents/${id}/file`, {
    responseType: "blob",
  });
  return URL.createObjectURL(data);
}

// Baixa o JSON da análise (autenticado) e dispara o download no navegador.
export async function downloadAnalysis(
  id: number,
  filename = `analise_${id}.json`,
): Promise<void> {
  const { data } = await api.get(`/documents/${id}/download`, {
    responseType: "blob",
  });
  const url = URL.createObjectURL(data);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default api;
