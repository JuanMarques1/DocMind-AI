import { useEffect, useState } from "react";

type Theme = "light" | "dark";

const STORAGE_KEY = "docmind-theme";

/**
 * Gerencia o tema (light/dark) via atributo `data-theme` na raiz, como no
 * design system. Persiste a escolha em localStorage e desativa as transições
 * durante a troca para evitar o bug de repaint de custom properties.
 */
export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    const salvo = localStorage.getItem(STORAGE_KEY);
    if (salvo === "light" || salvo === "dark") return salvo;
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  });

  useEffect(() => {
    const root = document.documentElement;
    root.classList.add("theme-switching");
    root.setAttribute("data-theme", theme);
    localStorage.setItem(STORAGE_KEY, theme);
    // Força reflow e reativa as transições no próximo frame.
    void root.offsetHeight;
    const id = requestAnimationFrame(() =>
      requestAnimationFrame(() => root.classList.remove("theme-switching")),
    );
    return () => cancelAnimationFrame(id);
  }, [theme]);

  const toggle = () => setTheme((t) => (t === "dark" ? "light" : "dark"));
  const set = (t: Theme) => setTheme(t);

  return { theme, toggle, set };
}
