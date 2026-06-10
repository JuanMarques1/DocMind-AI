interface LoaderProps {
  label?: string;
}

/** Spinner com rótulo opcional, usando os tokens do design system. */
export default function Loader({ label }: LoaderProps) {
  return (
    <div className="loading-wrap">
      <div className="spinner" />
      {label && <p>{label}</p>}
    </div>
  );
}
