import { useCallback, useEffect, useState } from "react";

export type Theme = "dark" | "light";

const STORAGE_KEY = "admin-theme";

function readStoredTheme(): Theme {
  try {
    return localStorage.getItem(STORAGE_KEY) === "light" ? "light" : "dark";
  } catch {
    return "dark";
  }
}

/**
 * Misma clave (`admin-theme`) que el script inline en index.html, que ya
 * aplica el atributo antes del primer paint para evitar flash. Este hook
 * solo re-sincroniza en cada cambio y persiste el toggle.
 */
export function useTheme() {
  const [theme, setTheme] = useState<Theme>(readStoredTheme);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next: Theme = prev === "dark" ? "light" : "dark";
      try {
        localStorage.setItem(STORAGE_KEY, next);
      } catch {
        // localStorage no disponible (modo privado, etc.): el toggle sigue
        // funcionando en memoria para esta sesión, solo no persiste.
      }
      return next;
    });
  }, []);

  return { theme, toggleTheme };
}
