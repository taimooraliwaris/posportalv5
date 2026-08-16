import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

type ThemeState = { dark: boolean; toggle: () => void };
const ThemeContext = createContext<ThemeState>({ dark: false, toggle: () => {} });

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  const toggle = useCallback(() => setDark((d) => !d), []);

  return <ThemeContext.Provider value={{ dark, toggle }}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);
