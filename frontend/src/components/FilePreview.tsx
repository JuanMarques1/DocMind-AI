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

/** Visualizador do arquivo: PDF.js (paginação e zoom) ou imagem. */
export default function FilePreview({ url, mimeType }: FilePreviewProps) {
  const [numPages, setNumPages] = useState(0);
  const [pagina, setPagina] = useState(1);
  const [escala, setEscala] = useState(1.0);

  if (mimeType !== "application/pdf") {
    return (
      <div className="preview-stage">
        <img src={url} alt="Documento enviado" />
      </div>
    );
  }

  return (
    <div>
      <div className="preview-toolbar">
        <button
          className="btn btn-secondary btn-sm"
          onClick={() => setPagina((p) => Math.max(1, p - 1))}
          disabled={pagina <= 1}
        >
          ‹ Anterior
        </button>
        <span className="mono subtle" style={{ fontSize: "var(--text-xs)" }}>
          Página {pagina} de {numPages || "…"}
        </span>
        <button
          className="btn btn-secondary btn-sm"
          onClick={() => setPagina((p) => Math.min(numPages, p + 1))}
          disabled={pagina >= numPages}
        >
          Próxima ›
        </button>
        <button
          className="btn btn-secondary btn-sm"
          onClick={() => setEscala((e) => Math.max(0.5, e - 0.2))}
          aria-label="Diminuir zoom"
        >
          −
        </button>
        <span className="mono subtle" style={{ fontSize: "var(--text-xs)" }}>
          {Math.round(escala * 100)}%
        </span>
        <button
          className="btn btn-secondary btn-sm"
          onClick={() => setEscala((e) => Math.min(3, e + 0.2))}
          aria-label="Aumentar zoom"
        >
          +
        </button>
      </div>

      <div className="preview-stage">
        <Document
          file={url}
          onLoadSuccess={({ numPages }) => setNumPages(numPages)}
          loading={<p className="loading-wrap">Carregando PDF…</p>}
          error={
            <p className="loading-wrap" style={{ color: "var(--danger-fg)" }}>
              Não foi possível exibir o PDF.
            </p>
          }
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
