import { create } from "zustand";

export type Theme = "dark" | "light";

interface ThemeStore {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

function getInitialTheme(): Theme {
  if (typeof window === "undefined") return "dark";
  const saved = localStorage.getItem("chamba_admin_theme") as Theme | null;
  if (saved === "light" || saved === "dark") return saved;
  return "dark";
}

function applyThemeToDocument(theme: Theme) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (theme === "dark") {
    root.classList.add("dark");
    root.classList.remove("light");
    root.setAttribute("data-theme", "dark");
    root.style.colorScheme = "dark";
  } else {
    root.classList.add("light");
    root.classList.remove("dark");
    root.setAttribute("data-theme", "light");
    root.style.colorScheme = "light";
  }
}

export const useThemeStore = create<ThemeStore>((set) => {
  const initial = getInitialTheme();
  if (typeof window !== "undefined") {
    applyThemeToDocument(initial);
  }

  return {
    theme: initial,
    toggleTheme: () =>
      set((state) => {
        const next: Theme = state.theme === "dark" ? "light" : "dark";
        localStorage.setItem("chamba_admin_theme", next);
        applyThemeToDocument(next);
        return { theme: next };
      }),
    setTheme: (theme: Theme) => {
      localStorage.setItem("chamba_admin_theme", theme);
      applyThemeToDocument(theme);
      set({ theme });
    },
  };
});
