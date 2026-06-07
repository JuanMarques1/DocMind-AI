interface LoaderProps {
  label?: string;
}

/** Spinner simples com rótulo opcional. */
export default function Loader({ label }: LoaderProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12 text-slate-500 dark:text-slate-400">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-brand-600 dark:border-slate-700 dark:border-t-brand-500" />
      {label && <p className="text-sm">{label}</p>}
    </div>
  );
}
