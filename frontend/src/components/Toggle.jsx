import React, { useState, useEffect } from "react";
import styles from "../styles/Toggle.module.css";

function Toggle() {
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

  // Calcular el estado inicial directamente en useState
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

  // useEffect solo para efectos secundarios (DOM y listeners)
  useEffect(() => {
    // Aplicar la clase al DOM
    document.documentElement.classList.toggle("dark", isDark);

    // Solo escuchar cambios del sistema si no hay preferencia guardada
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
  }, [isDark]);

  const toggleTheme = () => {
    const newTheme = !isDark;
    setIsDark(newTheme);
    setStoredTheme(newTheme ? "dark" : "light");
  };

  return (
    <button
      className={styles.toggleButton}
      onClick={toggleTheme}
      aria-label={isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
      title={isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
    >
      <div className={styles.iconContainer}>
        {isDark ? (
          // Icono de Sol (modo claro)
          <svg
            className={styles.icon}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="5" />
            <line x1="12" y1="1" x2="12" y2="3" />
            <line x1="12" y1="21" x2="12" y2="23" />
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
            <line x1="1" y1="12" x2="3" y2="12" />
            <line x1="21" y1="12" x2="23" y2="12" />
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
          </svg>
        ) : (
          // Icono de Luna (modo oscuro)
          <svg
            className={styles.icon}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
          </svg>
        )}
      </div>
    </button>
  );
}

export default Toggle;
