interface JsonViewerProps {
  data: unknown;
}

/** Exibe um objeto JSON formatado, com a paleta do design system. */
export default function JsonViewer({ data }: JsonViewerProps) {
  return <pre className="json-view">{JSON.stringify(data, null, 2)}</pre>;
}
