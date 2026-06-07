import React, { useState } from "react";
import style from "../styles/FloatingAssistantButton.module.css";
import AssistantDemo from "./AssistantDemo";

// Botón flotante (esquina inferior) que abre/cierra la ventana del asistente financiero.
function FloatingAssistantButton() {
  const [isOpen, setIsOpen] = useState(false); // Controla si la ventana del chat está abierta.

  const toggleAssistant = () => {
    setIsOpen(!isOpen);
  };

  return (
    <>
      {/* Botón flotante */}
      <button
        className={`${style.floatingButton} ${isOpen ? style.active : ""}`}
        onClick={toggleAssistant}
        aria-label="Asistente Virtual"
      >
        {isOpen ? (
          // Icono de cerrar (X)
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        ) : (
          // Icono de chat
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
          </svg>
        )}
        
        {/* Badge de notificación (opcional) */}
        {!isOpen && <span className={style.badge}>1</span>}
      </button>

      {/* Ventana del asistente */}
      {isOpen && (
        <div className={style.assistantWindow}>
          <AssistantDemo />
        </div>
      )}
    </>
  );
}

export default FloatingAssistantButton;
