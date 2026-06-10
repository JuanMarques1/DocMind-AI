/** Helpers de formatação compartilhados entre as telas. */

/** "PDF" ou "IMG" a partir do mime type, para o badge de arquivo. */
export function fileKind(mimeType: string | null | undefined): "pdf" | "img" {
  return mimeType === "application/pdf" ? "pdf" : "img";
}

/** Data absoluta no formato pt-BR (dd/mm/aaaa hh:mm). */
export function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Tempo relativo curto: "há 4 min", "há 3 h", "ontem", "08/06". */
export function relativeTime(iso: string): string {
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const min = Math.round(diffMs / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `há ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `há ${h} h`;
  const d = Math.round(h / 24);
  if (d === 1) return "ontem";
  if (d < 7) return `há ${d} d`;
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}
