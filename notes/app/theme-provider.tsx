"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

const THEME_STORAGE_KEY = "urspace:theme";

type Theme = "light" | "dark";

type ThemeContextValue = {
  theme: Theme;
  storageError: boolean;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function isTheme(value: string | null): value is Theme {
  return value === "light" || value === "dark";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>("light");
  const [storageError, setStorageError] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const currentTheme = document.documentElement.dataset.theme;
      let initialTheme =
        typeof currentTheme === "string" && isTheme(currentTheme)
          ? currentTheme
          : "light";

      try {
        const savedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
        if (isTheme(savedTheme)) {
          initialTheme = savedTheme;
        }
      } catch {
        setStorageError(true);
      }

      document.documentElement.dataset.theme = initialTheme;
      setTheme(initialTheme);
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  const toggleTheme = useCallback(() => {
    const nextTheme = theme === "light" ? "dark" : "light";
    document.documentElement.dataset.theme = nextTheme;
    setTheme(nextTheme);

    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    } catch {
      setStorageError(true);
    }
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, storageError, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function ThemeToggle() {
  const context = useContext(ThemeContext);

  if (!context) return null;

  const isDark = context.theme === "dark";
  const themeName = isDark ? "Dark Mode" : "Light Mode";
  const nextThemeName = isDark ? "Light Mode" : "Dark Mode";

  return (
    <div className="theme-toggle-wrap">
      <button
        type="button"
        className="theme-toggle"
        onClick={context.toggleTheme}
        aria-label={`Switch to ${nextThemeName}`}
        aria-pressed={isDark}
        title={`Current theme: ${themeName}`}
      >
        {isDark ? (
          <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path
              d="M16.5 12.1A6.9 6.9 0 0 1 7.9 3.5 7 7 0 1 0 16.5 12.1Z"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ) : (
          <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <circle cx="10" cy="10" r="3.1" stroke="currentColor" strokeWidth="1.5" />
            <path
              d="M10 1.8v1.5m0 13.4v1.5m8.2-8.2h-1.5M3.3 10H1.8m14-5.8-1.1 1.1M5.3 14.7l-1.1 1.1m11.6 0-1.1-1.1M5.3 5.3 4.2 4.2"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        )}
        <span>{themeName}</span>
      </button>
      {context.storageError && (
        <span className="theme-toggle-error" role="status">
          Theme changed, but the preference couldn’t be saved.
        </span>
      )}
    </div>
  );
}
