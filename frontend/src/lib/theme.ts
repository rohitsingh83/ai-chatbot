import type { Accent, Theme } from "@/utils/types";

const THEME_KEY = "nova.theme";
const ACCENT_KEY = "nova.accent";

/** Runs inline in <head> before first paint, so there is no light/dark flash. */
export const themeScript = `(function(){try{var t=localStorage.getItem("${THEME_KEY}")||"dark";var a=localStorage.getItem("${ACCENT_KEY}")||"violet";var d=t==="dark"||(t==="system"&&matchMedia("(prefers-color-scheme: dark)").matches);var r=document.documentElement;r.classList.toggle("dark",d);r.dataset.accent=a;}catch(e){document.documentElement.classList.add("dark")}})();`;

export function getStoredTheme(): Theme {
  try {
    return (localStorage.getItem(THEME_KEY) as Theme) || "dark";
  } catch {
    return "dark";
  }
}

export function getStoredAccent(): Accent {
  try {
    return (localStorage.getItem(ACCENT_KEY) as Accent) || "violet";
  } catch {
    return "violet";
  }
}

export function applyTheme(theme: Theme, accent?: Accent) {
  const root = document.documentElement;
  const dark = theme === "dark" || (theme === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
  root.classList.toggle("dark", dark);
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {}
  if (accent) {
    root.dataset.accent = accent;
    try {
      localStorage.setItem(ACCENT_KEY, accent);
    } catch {}
  }
}

export const isDark = () => document.documentElement.classList.contains("dark");
