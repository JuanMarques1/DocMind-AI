import { useEffect, useState } from "react";

export type AccentName = "indigo" | "violet" | "blue" | "emerald" | "black";

interface AccentColors {
  base: string;
  hover: string;
  press: string;
}

export const ACCENTS: Record<AccentName, AccentColors> = {
  indigo: { base: "#635bff", hover: "#524bdb", press: "#4640c2" },
  violet: { base: "#7c5cff", hover: "#6a4ce0", press: "#5a3fc6" },
  blue: { base: "#2f6bff", hover: "#2659db", press: "#1f4ac0" },
  emerald: { base: "#10a371", hover: "#0c8a60", press: "#0a724f" },
  black: { base: "#171717", hover: "#000000", press: "#000000" },
};

const STORAGE_KEY = "docmind-accent";

/** Cor de destaque (accent) aplicada como custom property na raiz. */
export function useAccent() {
  const [accent, setAccent] = useState<AccentName>(() => {
    const salvo = localStorage.getItem(STORAGE_KEY) as AccentName | null;
    return salvo && salvo in ACCENTS ? salvo : "indigo";
  });

  useEffect(() => {
    const a = ACCENTS[accent];
    const root = document.documentElement;
    root.style.setProperty("--accent", a.base);
    root.style.setProperty("--accent-hover", a.hover);
    root.style.setProperty("--accent-press", a.press);
    localStorage.setItem(STORAGE_KEY, accent);
  }, [accent]);

  return { accent, setAccent };
}
