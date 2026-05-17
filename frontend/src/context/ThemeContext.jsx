import React, { createContext, useState, useEffect, useContext } from "react";

// Crear el contexto
const ThemeContext = createContext();

// Hook personalizado para usar el contexto
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme debe ser usado dentro de un ThemeProvider");
  }
  return context;
};

// Provider del contexto
export const ThemeProvider = ({ children }) => {
  // Función helper para localStorage con manejo de errores
  const getStoredTheme = () => {
    try {
      const theme = localStorage.getItem("theme");
      return theme === "dark" || theme === "light" ? theme : null;
    } catch (error) {
      console.warn("localStorage no disponible:", error);
      return null;
    }
  };

  const setStoredTheme = (theme) => {
    try {
      localStorage.setItem("theme", theme);
    } catch (error) {
      console.warn("No se pudo guardar el tema:", error);
    }
  };

  // Calcular el estado inicial
  const [isDark, setIsDark] = useState(() => {
    const savedTheme = getStoredTheme();
    
    if (savedTheme) {
      return savedTheme === "dark";
    }
    
    // Si no hay preferencia guardada, usar preferencia del sistema
    if (typeof window !== "undefined") {
      return window.matchMedia("(prefers-color-scheme: dark)").matches;
    }
    
    return false;
  });

  // useEffect para aplicar el tema al DOM
  useEffect(() => {
    // Aplicar la clase al DOM
    document.documentElement.classList.toggle("dark", isDark);
    
    // Guardar preferencia
    setStoredTheme(isDark ? "dark" : "light");
  }, [isDark]);

  // Escuchar cambios del sistema solo si no hay preferencia guardada
  useEffect(() => {
    if (!getStoredTheme()) {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

      const handleChange = (e) => {
        // Solo actualizar si aún no hay preferencia guardada
        if (!getStoredTheme()) {
          setIsDark(e.matches);
        }
      };

      mediaQuery.addEventListener("change", handleChange);

      return () => mediaQuery.removeEventListener("change", handleChange);
    }
  }, []);

  // Función para alternar el tema
  const toggleTheme = () => {
    setIsDark((prev) => !prev);
  };

  // Función para establecer un tema específico
  const setTheme = (theme) => {
    setIsDark(theme === "dark");
  };

  const value = {
    isDark,
    toggleTheme,
    setTheme,
    theme: isDark ? "dark" : "light"
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};
