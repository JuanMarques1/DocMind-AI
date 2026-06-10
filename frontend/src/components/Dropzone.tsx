import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Icon } from "./Icon";

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
      className={`dropzone${isDragActive ? " drag" : ""}`}
      style={disabled ? { pointerEvents: "none", opacity: 0.6 } : undefined}
    >
      <input {...getInputProps()} />
      <span className="dz-ico">
        <Icon name="upload" />
      </span>
      <h4>
        {isDragActive
          ? "Solte o arquivo aqui…"
          : "Arraste um arquivo ou clique para selecionar"}
      </h4>
      <p>PDF, PNG, JPG ou JPEG — até 10 MB</p>
      <div className="formats">
        <span>.pdf</span>
        <span>.png</span>
        <span>.jpg</span>
        <span>.jpeg</span>
      </div>
    </div>
  );
}
