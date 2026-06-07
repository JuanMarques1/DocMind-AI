import { useEffect, useState } from "react";

type Theme = "light" | "dark";

/** Gerencia o dark mode, persistindo a escolha em localStorage. */
export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    const salvo = localStorage.getItem("docmind-theme");
    if (salvo === "light" || salvo === "dark") return salvo;
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  });

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
    localStorage.setItem("docmind-theme", theme);
  }, [theme]);

  const toggle = () => setTheme((t) => (t === "dark" ? "light" : "dark"));

  return { theme, toggle };
}
