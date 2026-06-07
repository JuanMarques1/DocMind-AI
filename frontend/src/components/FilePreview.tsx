import { useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

// Configura o worker do PDF.js (necessário para renderizar PDFs).
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

interface FilePreviewProps {
  url: string;
  mimeType: string;
}

/** Visualizador do arquivo: PDF.js (com paginação e zoom) ou imagem. */
export default function FilePreview({ url, mimeType }: FilePreviewProps) {
  const [numPages, setNumPages] = useState(0);
  const [pagina, setPagina] = useState(1);
  const [escala, setEscala] = useState(1.0);

  if (mimeType !== "application/pdf") {
    return (
      <img
        src={url}
        alt="Documento enviado"
        className="mx-auto max-h-[36rem] rounded-lg object-contain"
      />
    );
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex flex-wrap items-center justify-center gap-2 text-sm">
        <button
          onClick={() => setPagina((p) => Math.max(1, p - 1))}
          disabled={pagina <= 1}
          className="rounded-lg border border-slate-300 px-3 py-1 disabled:opacity-40 dark:border-slate-700"
        >
          ‹ Anterior
        </button>
        <span className="px-2 text-slate-600 dark:text-slate-300">
          Página {pagina} de {numPages || "…"}
        </span>
        <button
          onClick={() => setPagina((p) => Math.min(numPages, p + 1))}
          disabled={pagina >= numPages}
          className="rounded-lg border border-slate-300 px-3 py-1 disabled:opacity-40 dark:border-slate-700"
        >
          Próxima ›
        </button>
        <button
          onClick={() => setEscala((e) => Math.max(0.5, e - 0.2))}
          className="ml-2 rounded-lg border border-slate-300 px-3 py-1 dark:border-slate-700"
        >
          −
        </button>
        <span className="text-slate-600 dark:text-slate-300">
          {Math.round(escala * 100)}%
        </span>
        <button
          onClick={() => setEscala((e) => Math.min(3, e + 0.2))}
          className="rounded-lg border border-slate-300 px-3 py-1 dark:border-slate-700"
        >
          +
        </button>
      </div>

      <div className="max-h-[36rem] overflow-auto rounded-lg border border-slate-200 dark:border-slate-800">
        <Document
          file={url}
          onLoadSuccess={({ numPages }) => setNumPages(numPages)}
          loading={<p className="p-8 text-slate-500">Carregando PDF…</p>}
          error={<p className="p-8 text-red-500">Não foi possível exibir o PDF.</p>}
        >
          <Page
            pageNumber={pagina}
            scale={escala}
            renderTextLayer
            renderAnnotationLayer
          />
        </Document>
      </div>
    </div>
  );
}
