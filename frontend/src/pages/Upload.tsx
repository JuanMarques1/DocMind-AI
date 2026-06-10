import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Dropzone from "../components/Dropzone";
import { Icon } from "../components/Icon";
import { uploadDocument } from "../services/api";
import { fileKind } from "../lib/format";

/** Página de upload: dropzone, passos do processamento e estado de loading. */
export default function Upload() {
  const navigate = useNavigate();
  const [processando, setProcessando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [arquivo, setArquivo] = useState<File | null>(null);

  async function handleFile(file: File) {
    setErro(null);
    setArquivo(file);
    setProcessando(true);
    try {
      const doc = await uploadDocument(file);
      navigate(`/documents/${doc.id}`);
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail ?? "Falha ao processar o documento.";
      setErro(msg);
      setProcessando(false);
    }
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h3>Enviar documento</h3>
          <p>A IA vai extrair o texto e identificar as informações importantes.</p>
        </div>
      </div>

      <div style={{ maxWidth: 680 }}>
        {processando && arquivo ? (
          <div className="uploaded-row">
            <span className={`filetag ${fileKind(arquivo.type)}`}>
              {fileKind(arquivo.type).toUpperCase()}
            </span>
            <div style={{ flex: 1 }}>
              <div
                className="flex items-center"
                style={{ justifyContent: "space-between", marginBottom: 6 }}
              >
                <b style={{ fontSize: "var(--text-sm)" }}>{arquivo.name}</b>
                <span
                  className="mono subtle"
                  style={{ fontSize: "var(--text-xs)" }}
                >
                  Processando…
                </span>
              </div>
              <div className="bar indeterminate">
                <i />
              </div>
            </div>
          </div>
        ) : (
          <Dropzone onFile={handleFile} disabled={processando} />
        )}

        {erro && (
          <p className="alert mt-4">{erro}</p>
        )}

        <div className="card mt-6">
          <div className="card-head">
            <h4>Como funciona</h4>
          </div>
          <div className="card-body">
            <div className="steps">
              <div className={`st${processando ? " done" : ""}`}>
                <div className="marker">
                  <span className="dot">
                    {processando ? <Icon name="check" /> : null}
                  </span>
                  <span className="line" />
                </div>
                <div className="txt">
                  <b>1 · Extração de texto</b>
                  <small>PyMuPDF para PDFs · Tesseract OCR para imagens.</small>
                </div>
              </div>
              <div className={`st${processando ? " active" : ""}`}>
                <div className="marker">
                  <span className="dot">
                    <Icon name="sparkles" />
                  </span>
                  <span className="line" />
                </div>
                <div className="txt">
                  <b>2 · Análise com IA</b>
                  <small>
                    Identifica o tipo, gera resumo e extrai dados estruturados.
                  </small>
                </div>
              </div>
              <div className="st">
                <div className="marker">
                  <span className="dot" />
                </div>
                <div className="txt">
                  <b>3 · Resultado em JSON</b>
                  <small>
                    Disponível na tela de detalhes, pronto para download.
                  </small>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
