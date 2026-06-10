import { ACCENTS, useAccent, type AccentName } from "../hooks/useAccent";

const LABELS: Record<AccentName, string> = {
  indigo: "Índigo",
  violet: "Violeta",
  blue: "Azul",
  emerald: "Esmeralda",
  black: "Preto",
};

const ORDER: AccentName[] = ["indigo", "violet", "blue", "emerald", "black"];

/** Seletor de cor de destaque (accent), persistido. */
export default function AccentPicker() {
  const { accent, setAccent } = useAccent();
  return (
    <span className="accent-dots" title="Cor de destaque">
      {ORDER.map((name) => (
        <button
          key={name}
          type="button"
          aria-label={LABELS[name]}
          aria-pressed={accent === name}
          onClick={() => setAccent(name)}
          style={{ background: ACCENTS[name].base }}
        />
      ))}
    </span>
  );
}
