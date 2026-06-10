import { useTheme } from "../hooks/useTheme";
import { Icon } from "./Icon";

/** Controle segmentado para alternar entre tema claro e escuro. */
export default function ThemeToggle() {
  const { theme, set } = useTheme();
  return (
    <span className="seg" role="group" aria-label="Tema">
      <button
        type="button"
        aria-label="Tema claro"
        aria-pressed={theme === "light"}
        onClick={() => set("light")}
      >
        <Icon name="sun" />
      </button>
      <button
        type="button"
        aria-label="Tema escuro"
        aria-pressed={theme === "dark"}
        onClick={() => set("dark")}
      >
        <Icon name="moon" />
      </button>
    </span>
  );
}
