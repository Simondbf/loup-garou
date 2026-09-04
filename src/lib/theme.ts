import { useEffect, useState } from "react";

/**
 * Thème de l'application.
 *
 * Trois choix : sombre (par défaut, c'est un jeu de soirée), clair, ou
 * « selon l'appareil » qui suit le réglage du téléphone. La préférence est
 * gardée en local, elle n'a rien à faire sur le serveur.
 */
export type Theme = "sombre" | "clair" | "appareil";

const CLE = "lg-theme";

export function lireTheme(): Theme {
  if (typeof localStorage === "undefined") return "sombre";
  const v = localStorage.getItem(CLE);
  return v === "clair" || v === "appareil" ? v : "sombre";
}

/** Pose ou retire la classe `clair` sur <html>. */
export function appliquerTheme(theme: Theme) {
  if (typeof document === "undefined") return;
  const clair =
    theme === "clair" ||
    (theme === "appareil" &&
      typeof matchMedia !== "undefined" &&
      matchMedia("(prefers-color-scheme: light)").matches);
  document.documentElement.classList.toggle("clair", clair);
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>("sombre");

  useEffect(() => {
    const initial = lireTheme();
    setThemeState(initial);
    appliquerTheme(initial);
  }, []);

  // En mode « selon l'appareil », on suit les changements en direct (bascule
  // automatique nuit/jour du téléphone).
  useEffect(() => {
    if (theme !== "appareil" || typeof matchMedia === "undefined") return;
    const mq = matchMedia("(prefers-color-scheme: light)");
    const onChange = () => appliquerTheme("appareil");
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [theme]);

  function setTheme(t: Theme) {
    setThemeState(t);
    localStorage.setItem(CLE, t);
    appliquerTheme(t);
  }

  return { theme, setTheme };
}
