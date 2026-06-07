interface JsonViewerProps {
  data: unknown;
}

/** Exibe um objeto JSON formatado. */
export default function JsonViewer({ data }: JsonViewerProps) {
  return (
    <pre className="max-h-[28rem] overflow-auto rounded-xl bg-slate-900 p-4 text-sm leading-relaxed text-slate-100 dark:bg-black/60">
      {JSON.stringify(data, null, 2)}
    </pre>
  );
}
