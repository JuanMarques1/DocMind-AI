import { useCallback } from "react";
import { useDropzone } from "react-dropzone";

interface DropzoneProps {
  onFile: (file: File) => void;
  disabled?: boolean;
}

/** Área de arrastar-e-soltar para upload de PDFs e imagens. */
export default function Dropzone({ onFile, disabled }: DropzoneProps) {
  const onDrop = useCallback(
    (aceitos: File[]) => {
      if (aceitos[0]) onFile(aceitos[0]);
    },
    [onFile],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    disabled,
    multiple: false,
    accept: {
      "application/pdf": [".pdf"],
      "image/png": [".png"],
      "image/jpeg": [".jpg", ".jpeg"],
    },
  });

  return (
    <div
      {...getRootProps()}
      className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-12 text-center transition ${
        isDragActive
          ? "border-brand-500 bg-brand-50 dark:bg-brand-600/10"
          : "border-slate-300 hover:border-brand-400 dark:border-slate-700"
      } ${disabled ? "pointer-events-none opacity-60" : ""}`}
    >
      <input {...getInputProps()} />
      <div className="text-4xl">📄</div>
      <p className="mt-4 text-lg font-semibold text-slate-700 dark:text-slate-200">
        {isDragActive
          ? "Solte o arquivo aqui..."
          : "Arraste um arquivo ou clique para selecionar"}
      </p>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        PDF, PNG, JPG ou JPEG (até 10 MB)
      </p>
    </div>
  );
}
