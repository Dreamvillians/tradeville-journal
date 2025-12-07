import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";

// Theme definitions
export type ThemeId = "dark" | "light" | "grey" | "midnight" | "emerald" | "ocean" | "sunset" | "system";

export interface ThemeConfig {
  id: ThemeId;
  name: string;
  description: string;
  colors: {
    primary: string;
    accent: string;
    preview: string;
  };
}

export const themes: ThemeConfig[] = [
  {
    id: "system",
    name: "System",
    description: "Follow system preference",
    colors: {
      primary: "from-gray-400 to-gray-600",
      accent: "bg-gray-500",
      preview: "bg-gradient-to-br from-gray-200 via-gray-400 to-gray-800",
    },
  },
  {
    id: "dark",
    name: "Dark",
    description: "Dark mode for night trading",
    colors: {
      primary: "from-slate-700 to-slate-900",
      accent: "bg-slate-700",
      preview: "bg-gradient-to-br from-slate-800 via-slate-900 to-black",
    },
  },
  {
    id: "light",
    name: "Light",
    description: "Light mode for day trading",
    colors: {
      primary: "from-white to-gray-100",
      accent: "bg-white",
      preview: "bg-gradient-to-br from-white via-gray-100 to-gray-200",
    },
  },
  {
    id: "grey",
    name: "Grey",
    description: "Neutral grey theme",
    colors: {
      primary: "from-zinc-600 to-zinc-800",
      accent: "bg-zinc-600",
      preview: "bg-gradient-to-br from-zinc-500 via-zinc-700 to-zinc-900",
    },
  },
  {
    id: "midnight",
    name: "Midnight",
    description: "Deep blue night theme",
    colors: {
      primary: "from-indigo-900 to-slate-900",
      accent: "bg-indigo-600",
      preview: "bg-gradient-to-br from-indigo-900 via-slate-900 to-black",
    },
  },
  {
    id: "emerald",
    name: "Emerald",
    description: "Green trading theme",
    colors: {
      primary: "from-emerald-800 to-slate-900",
      accent: "bg-emerald-500",
      preview: "bg-gradient-to-br from-emerald-700 via-emerald-900 to-slate-900",
    },
  },
  {
    id: "ocean",
    name: "Ocean",
    description: "Deep ocean blue theme",
    colors: {
      primary: "from-cyan-800 to-slate-900",
      accent: "bg-cyan-500",
      preview: "bg-gradient-to-br from-cyan-700 via-blue-900 to-slate-900",
    },
  },
  {
    id: "sunset",
    name: "Sunset",
    description: "Warm sunset colors",
    colors: {
      primary: "from-orange-800 to-slate-900",
      accent: "bg-orange-500",
      preview: "bg-gradient-to-br from-orange-600 via-rose-800 to-slate-900",
    },
  },
];

// CSS variables for each theme
const themeStyles: Record<ThemeId, Record<string, string>> = {
  system: {},
  dark: {
    "--background": "222.2 84% 4.9%",
    "--foreground": "210 40% 98%",
    "--card": "222.2 84% 4.9%",
    "--card-foreground": "210 40% 98%",
    "--popover": "222.2 84% 4.9%",
    "--popover-foreground": "210 40% 98%",
    "--primary": "142.1 76.2% 36.3%",
    "--primary-foreground": "355.7 100% 97.3%",
    "--secondary": "217.2 32.6% 17.5%",
    "--secondary-foreground": "210 40% 98%",
    "--muted": "217.2 32.6% 17.5%",
    "--muted-foreground": "215 20.2% 65.1%",
    "--accent": "217.2 32.6% 17.5%",
    "--accent-foreground": "210 40% 98%",
    "--destructive": "0 62.8% 30.6%",
    "--destructive-foreground": "210 40% 98%",
    "--border": "217.2 32.6% 17.5%",
    "--input": "217.2 32.6% 17.5%",
    "--ring": "142.1 76.2% 36.3%",
    "--sidebar-background": "222.2 84% 4.9%",
    "--sidebar-foreground": "210 40% 98%",
    "--sidebar-primary": "142.1 76.2% 36.3%",
    "--sidebar-accent": "217.2 32.6% 17.5%",
    "--chart-1": "142.1 76.2% 36.3%",
    "--chart-2": "221.2 83.2% 53.3%",
    "--chart-3": "262.1 83.3% 57.8%",
    "--chart-4": "31.8 81% 55.9%",
    "--chart-5": "0 84.2% 60.2%",
  },
  light: {
    "--background": "0 0% 100%",
    "--foreground": "222.2 84% 4.9%",
    "--card": "0 0% 100%",
    "--card-foreground": "222.2 84% 4.9%",
    "--popover": "0 0% 100%",
    "--popover-foreground": "222.2 84% 4.9%",
    "--primary": "142.1 76.2% 36.3%",
    "--primary-foreground": "355.7 100% 97.3%",
    "--secondary": "210 40% 96.1%",
    "--secondary-foreground": "222.2 47.4% 11.2%",
    "--muted": "210 40% 96.1%",
    "--muted-foreground": "215.4 16.3% 46.9%",
    "--accent": "210 40% 96.1%",
    "--accent-foreground": "222.2 47.4% 11.2%",
    "--destructive": "0 84.2% 60.2%",
    "--destructive-foreground": "210 40% 98%",
    "--border": "214.3 31.8% 91.4%",
    "--input": "214.3 31.8% 91.4%",
    "--ring": "142.1 76.2% 36.3%",
    "--sidebar-background": "0 0% 98%",
    "--sidebar-foreground": "222.2 84% 4.9%",
    "--sidebar-primary": "142.1 76.2% 36.3%",
    "--sidebar-accent": "210 40% 96.1%",
    "--chart-1": "142.1 76.2% 36.3%",
    "--chart-2": "221.2 83.2% 53.3%",
    "--chart-3": "262.1 83.3% 57.8%",
    "--chart-4": "31.8 81% 55.9%",
    "--chart-5": "0 84.2% 60.2%",
  },
  grey: {
    "--background": "0 0% 9%",
    "--foreground": "0 0% 95%",
    "--card": "0 0% 9%",
    "--card-foreground": "0 0% 95%",
    "--popover": "0 0% 9%",
    "--popover-foreground": "0 0% 95%",
    "--primary": "0 0% 98%",
    "--primary-foreground": "0 0% 9%",
    "--secondary": "0 0% 14.9%",
    "--secondary-foreground": "0 0% 98%",
    "--muted": "0 0% 14.9%",
    "--muted-foreground": "0 0% 63.9%",
    "--accent": "0 0% 14.9%",
    "--accent-foreground": "0 0% 98%",
    "--destructive": "0 62.8% 30.6%",
    "--destructive-foreground": "0 0% 98%",
    "--border": "0 0% 14.9%",
    "--input": "0 0% 14.9%",
    "--ring": "0 0% 83.1%",
    "--sidebar-background": "0 0% 7%",
    "--sidebar-foreground": "0 0% 95%",
    "--sidebar-primary": "0 0% 98%",
    "--sidebar-accent": "0 0% 14.9%",
    "--chart-1": "0 0% 98%",
    "--chart-2": "0 0% 70%",
    "--chart-3": "0 0% 50%",
    "--chart-4": "0 0% 30%",
    "--chart-5": "0 62.8% 50%",
  },
  midnight: {
    "--background": "224 71% 4%",
    "--foreground": "213 31% 91%",
    "--card": "224 71% 4%",
    "--card-foreground": "213 31% 91%",
    "--popover": "224 71% 4%",
    "--popover-foreground": "213 31% 91%",
    "--primary": "263.4 70% 50.4%",
    "--primary-foreground": "210 40% 98%",
    "--secondary": "222.2 47.4% 11.2%",
    "--secondary-foreground": "210 40% 98%",
    "--muted": "223 47% 11%",
    "--muted-foreground": "215.4 16.3% 56.9%",
    "--accent": "216 34% 17%",
    "--accent-foreground": "210 40% 98%",
    "--destructive": "0 63% 31%",
    "--destructive-foreground": "210 40% 98%",
    "--border": "216 34% 17%",
    "--input": "216 34% 17%",
    "--ring": "263.4 70% 50.4%",
    "--sidebar-background": "224 71% 3%",
    "--sidebar-foreground": "213 31% 91%",
    "--sidebar-primary": "263.4 70% 50.4%",
    "--sidebar-accent": "216 34% 17%",
    "--chart-1": "263.4 70% 50.4%",
    "--chart-2": "221.2 83.2% 53.3%",
    "--chart-3": "262.1 83.3% 57.8%",
    "--chart-4": "31.8 81% 55.9%",
    "--chart-5": "0 84.2% 60.2%",
  },
  emerald: {
    "--background": "160 84% 3%",
    "--foreground": "150 40% 96%",
    "--card": "160 84% 3%",
    "--card-foreground": "150 40% 96%",
    "--popover": "160 84% 3%",
    "--popover-foreground": "150 40% 96%",
    "--primary": "142.1 76.2% 36.3%",
    "--primary-foreground": "355.7 100% 97.3%",
    "--secondary": "160 32.6% 12%",
    "--secondary-foreground": "150 40% 96%",
    "--muted": "160 32.6% 12%",
    "--muted-foreground": "150 20.2% 60%",
    "--accent": "160 32.6% 12%",
    "--accent-foreground": "150 40% 96%",
    "--destructive": "0 62.8% 30.6%",
    "--destructive-foreground": "150 40% 96%",
    "--border": "160 32.6% 15%",
    "--input": "160 32.6% 15%",
    "--ring": "142.1 76.2% 36.3%",
    "--sidebar-background": "160 84% 2.5%",
    "--sidebar-foreground": "150 40% 96%",
    "--sidebar-primary": "142.1 76.2% 36.3%",
    "--sidebar-accent": "160 32.6% 12%",
    "--chart-1": "142.1 76.2% 36.3%",
    "--chart-2": "160 60% 45%",
    "--chart-3": "180 60% 45%",
    "--chart-4": "31.8 81% 55.9%",
    "--chart-5": "0 84.2% 60.2%",
  },
  ocean: {
    "--background": "200 84% 4%",
    "--foreground": "190 40% 96%",
    "--card": "200 84% 4%",
    "--card-foreground": "190 40% 96%",
    "--popover": "200 84% 4%",
    "--popover-foreground": "190 40% 96%",
    "--primary": "187 92% 45%",
    "--primary-foreground": "200 84% 4%",
    "--secondary": "200 32.6% 12%",
    "--secondary-foreground": "190 40% 96%",
    "--muted": "200 32.6% 12%",
    "--muted-foreground": "190 20.2% 60%",
    "--accent": "200 32.6% 15%",
    "--accent-foreground": "190 40% 96%",
    "--destructive": "0 62.8% 30.6%",
    "--destructive-foreground": "190 40% 96%",
    "--border": "200 32.6% 17%",
    "--input": "200 32.6% 17%",
    "--ring": "187 92% 45%",
    "--sidebar-background": "200 84% 3%",
    "--sidebar-foreground": "190 40% 96%",
    "--sidebar-primary": "187 92% 45%",
    "--sidebar-accent": "200 32.6% 12%",
    "--chart-1": "187 92% 45%",
    "--chart-2": "200 70% 50%",
    "--chart-3": "220 70% 50%",
    "--chart-4": "31.8 81% 55.9%",
    "--chart-5": "0 84.2% 60.2%",
  },
  sunset: {
    "--background": "20 84% 4%",
    "--foreground": "30 40% 96%",
    "--card": "20 84% 4%",
    "--card-foreground": "30 40% 96%",
    "--popover": "20 84% 4%",
    "--popover-foreground": "30 40% 96%",
    "--primary": "25 95% 53%",
    "--primary-foreground": "20 84% 4%",
    "--secondary": "20 32.6% 12%",
    "--secondary-foreground": "30 40% 96%",
    "--muted": "20 32.6% 12%",
    "--muted-foreground": "30 20.2% 60%",
    "--accent": "20 32.6% 15%",
    "--accent-foreground": "30 40% 96%",
    "--destructive": "0 62.8% 30.6%",
    "--destructive-foreground": "30 40% 96%",
    "--border": "20 32.6% 17%",
    "--input": "20 32.6% 17%",
    "--ring": "25 95% 53%",
    "--sidebar-background": "20 84% 3%",
    "--sidebar-foreground": "30 40% 96%",
    "--sidebar-primary": "25 95% 53%",
    "--sidebar-accent": "20 32.6% 12%",
    "--chart-1": "25 95% 53%",
    "--chart-2": "35 90% 50%",
    "--chart-3": "350 80% 50%",
    "--chart-4": "31.8 81% 55.9%",
    "--chart-5": "0 84.2% 60.2%",
  },
};

// Apply theme to document
const applyTheme = (themeId: ThemeId) => {
  const root = document.documentElement;

  // Remove existing theme classes
  root.classList.remove("light", "dark");

  let effectiveTheme: ThemeId = themeId;

  if (themeId === "system") {
    effectiveTheme = window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }

  // Add theme class for Tailwind
  if (effectiveTheme === "light") {
    root.classList.add("light");
  } else {
    root.classList.add("dark");
  }

  // Apply CSS variables
  const stylesToApply = themeStyles[themeId === "system" ? effectiveTheme : themeId];
  if (stylesToApply && Object.keys(stylesToApply).length > 0) {
    Object.entries(stylesToApply).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });
  }

  // Store theme attribute for CSS targeting
  root.setAttribute("data-theme", themeId);
};

// Get stored theme or default
const getStoredTheme = (): ThemeId => {
  if (typeof window !== "undefined") {
    const stored = localStorage.getItem("tradeville-theme") as ThemeId;
    if (stored && themes.some(t => t.id === stored)) {
      return stored;
    }
  }
  return "dark";
};

// Context type
interface ThemeContextType {
  theme: ThemeId;
  setTheme: (theme: ThemeId) => void;
  themes: ThemeConfig[];
  currentTheme: ThemeConfig;
}

// Create context
const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Provider component
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeId>(getStoredTheme);
  const [mounted, setMounted] = useState(false);

  // Apply theme on mount and when theme changes
  useEffect(() => {
    setMounted(true);
    applyTheme(theme);
  }, []);

  useEffect(() => {
    if (mounted) {
      applyTheme(theme);
    }
  }, [theme, mounted]);

  // Listen for system theme changes
  useEffect(() => {
    if (theme === "system") {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      const handleChange = () => applyTheme("system");
      
      mediaQuery.addEventListener("change", handleChange);
      return () => mediaQuery.removeEventListener("change", handleChange);
    }
  }, [theme]);

  const setTheme = useCallback((newTheme: ThemeId) => {
    setThemeState(newTheme);
    localStorage.setItem("tradeville-theme", newTheme);
    applyTheme(newTheme);
  }, []);

  const currentTheme = themes.find((t) => t.id === theme) || themes[0];

  // Prevent flash of wrong theme
  if (!mounted) {
    return null;
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme, themes, currentTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

// Hook to use theme
export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}

// Export for direct imports
export { applyTheme, getStoredTheme };