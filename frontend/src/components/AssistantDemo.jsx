import React, { useState, useRef, useEffect } from "react";
import style from "../styles/Assistant.module.css";
import Toggle from "../components/Toggle";
import {
  getSaldo, getResumenPeriodo, getCategoriaTopGasto, getMovimientosRecientes,
  extractCategoria, extractPeriodo, CAT_LABELS,
} from "../config/assistantDataService";
import "../index.css";

const fmt = (n) => `${n >= 0 ? '' : '-'}€${Math.abs(n).toFixed(2)}`;

// Asistente basado en reglas (no IA): detecta la intención con expresiones regulares
// y responde con DATOS REALES del usuario (saldo, gastos, movimientos) consultando el backend.
async function answerFromData(text) {
  const t = text.toLowerCase();
  const periodo = extractPeriodo(t); // Detecta "este mes", "hoy", etc. en la pregunta.
  const cat     = extractCategoria(t); // Detecta la categoría mencionada, si la hay.

  try {
    // Saldo de la cartera
    if (/\b(saldo|cartera|wallet|cu[aá]nto.*tengo)\b/.test(t)) {
      const { balance, currency } = await getSaldo();
      return `Tu saldo actual en la cartera es de **${fmt(balance)} ${currency}**.`;
    }

    // Top de categorías
    if (/(en qu[eé].*gast|m[aá]s.*gast|categor[ií]a.*gast|top.*gast)/.test(t)) {
      const top = await getCategoriaTopGasto(periodo);
      if (top.length === 0) return `No tienes gastos registrados en ${periodo.label}.`;
      const lineas = top.slice(0, 5).map((c, i) => `${i + 1}. ${c.label}: ${fmt(c.total)}`).join('\n');
      return `Tus mayores categorías de gasto en ${periodo.label}:\n\n${lineas}`;
    }

    // Movimientos recientes
    if (/(movimientos?|transacciones?\s+recientes|últimas|ultimas|hist[oó]ric)/.test(t)) {
      const movs = await getMovimientosRecientes(5);
      if (movs.length === 0) return 'Aún no tienes transacciones registradas.';
      const lineas = movs.map(m => {
        const signo = m.tipo === 'GASTO' ? '-' : '+';
        return `• ${m.fecha} — ${m.descripcion} (${(CAT_LABELS[m.categoria] || m.categoria).toLowerCase()}): ${signo}€${m.cantidad.toFixed(2)}`;
      }).join('\n');
      return `Tus últimas 5 transacciones:\n\n${lineas}`;
    }

    // Gastos por periodo/categoría
    if (/\bgast/.test(t)) {
      const r = await getResumenPeriodo(periodo, cat);
      const catTxt = cat ? ` en ${CAT_LABELS[cat]}` : '';
      if (r.gastos === 0) return `No tienes gastos registrados${catTxt} ${periodo.label}.`;
      return `Has gastado **${fmt(r.gastos)}**${catTxt} ${periodo.label} (${r.count} ${r.count === 1 ? 'transacción' : 'transacciones'}).`;
    }

    // Ingresos por periodo
    if (/\bingres/.test(t)) {
      const r = await getResumenPeriodo(periodo, cat);
      if (r.ingresos === 0) return `No tienes ingresos registrados ${periodo.label}.`;
      return `Has ingresado **${fmt(r.ingresos)}** ${periodo.label}.`;
    }

    // Balance / resumen
    if (/\b(balance|resumen|c[oó]mo.*voy|c[oó]mo.*estoy)\b/.test(t)) {
      const r = await getResumenPeriodo(periodo);
      const sign = r.balance >= 0 ? 'positivo' : 'negativo';
      return `Resumen de ${periodo.label}:\n\n• Ingresos: ${fmt(r.ingresos)}\n• Gastos: ${fmt(r.gastos)}\n• Balance: **${fmt(r.balance)}** (${sign})`;
    }

    return null; // Si nada coincide, devolvemos null y se usan los consejos genéricos de abajo.
  } catch (err) {
    return `No he podido consultar tus datos: ${err.message}. ¿Has iniciado sesión?`;
  }
}

// Componente del chat del asistente. Combina respuestas con datos reales y consejos pre-escritos.
function AssistantDemo() {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: "¡Hola! Soy tu asistente financiero virtual. ¿En qué puedo ayudarte hoy?",
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-scroll al último mensaje
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Consejos financieros pre-escritos: se usan cuando la pregunta no es sobre datos del usuario.
  const getAutomatedResponse = (userMessage) => {
    const message = userMessage.toLowerCase();

    // Respuestas contextuales
    if (message.includes("hola") || message.includes("buenos días") || message.includes("buenas tardes")) {
      return "¡Hola! ¿En qué puedo ayudarte con tus finanzas hoy?";
    }

    if (message.includes("ahorr")) {
      return "Para ahorrar efectivamente, te recomiendo:\n\n1. Aplica la regla 50/30/20: 50% necesidades, 30% deseos, 20% ahorro\n2. Configura transferencias automáticas a una cuenta de ahorro\n3. Reduce gastos hormiga (café diario, suscripciones no usadas)\n4. Compara precios antes de comprar\n5. Considera el método del sobre para gastos variables\n\n¿Quieres profundizar en alguno de estos puntos?";
    }

    if (message.includes("presupuesto")) {
      return "Para crear un presupuesto efectivo:\n\n📊 Pasos básicos:\n1. Registra todos tus ingresos mensuales\n2. Lista tus gastos fijos (alquiler, servicios, seguros)\n3. Estima gastos variables (comida, transporte, ocio)\n4. Establece metas de ahorro\n5. Revisa y ajusta mensualmente\n\n💡 Usa nuestra app para trackear tus transacciones automáticamente. ¿Necesitas ayuda con algún paso específico?";
    }

    if (message.includes("gasto") || message.includes("reducir")) {
      return "Para reducir gastos, analiza estas categorías:\n\n🏠 Hogar: Compara tarifas de luz, agua, internet\n🍔 Alimentación: Planifica menús, compra con lista\n🚗 Transporte: Considera compartir coche o transporte público\n🎬 Ocio: Busca alternativas gratuitas o económicas\n📱 Suscripciones: Cancela las que no uses\n\n¿En qué área te gustaría enfocarte primero?";
    }

    if (message.includes("inversión") || message.includes("invertir")) {
      return "Sobre inversiones seguras:\n\n⚠️ Importante: Nunca inviertas dinero que necesites a corto plazo.\n\nOpciones por nivel de riesgo:\n🟢 Bajo: Depósitos a plazo, bonos gubernamentales\n🟡 Medio: Fondos indexados, ETFs diversificados\n🔴 Alto: Acciones individuales, criptomonedas\n\nMi recomendación: Empieza con fondos indexados diversificados y un horizonte de 5+ años. ¿Cuál es tu perfil de riesgo?";
    }

    if (message.includes("deuda") || message.includes("préstamo")) {
      return "Para gestionar deudas:\n\n📋 Estrategias:\n1. Método bola de nieve: Paga primero la deuda más pequeña\n2. Método avalancha: Paga primero la de mayor interés\n3. Consolida deudas si es posible para reducir intereses\n4. Negocia tasas más bajas con tus acreedores\n5. Evita nuevas deudas mientras pagas las actuales\n\n¿Tienes múltiples deudas que necesitas priorizar?";
    }

    if (message.includes("emergencia") || message.includes("fondo")) {
      return "El fondo de emergencia es crucial:\n\n💰 ¿Cuánto necesitas?\nIdealmente 3-6 meses de gastos fijos\n\n🎯 Cómo construirlo:\n1. Calcula tus gastos mensuales esenciales\n2. Multiplica por 3-6 meses\n3. Ahorra automáticamente cada mes\n4. Guárdalo en cuenta de fácil acceso\n5. Usa SOLO para verdaderas emergencias\n\n¿Necesitas ayuda calculando tus gastos mensuales?";
    }

    if (message.includes("gracias") || message.includes("perfecto")) {
      return "¡De nada! Estoy aquí para ayudarte. Si tienes más preguntas sobre finanzas, no dudes en preguntar. 😊";
    }

    // Respuesta por defecto
    return "Entiendo tu pregunta sobre finanzas. Puedo ayudarte con:\n\n• Crear y gestionar presupuestos\n• Estrategias de ahorro\n• Reducción de gastos\n• Inversiones básicas\n• Gestión de deudas\n• Fondos de emergencia\n\n¿Sobre cuál de estos temas te gustaría saber más?";
  };

  // Orquesta la respuesta: primero intenta con datos reales y, si no hay, usa el consejo genérico.
  const sendMessage = async (userMessage) => {
    setIsLoading(true);
    try {
      const dataResponse = await answerFromData(userMessage);
      const assistantResponse = dataResponse ?? getAutomatedResponse(userMessage); // ?? = si es null, usa el segundo.
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: assistantResponse, timestamp: new Date() },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // Manejar envío del formulario
  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!inputValue.trim() || isLoading) return;

    // Agregar mensaje del usuario
    const userMessage = {
      role: "user",
      content: inputValue,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    const currentInput = inputValue;
    setInputValue("");

    // Simular respuesta del asistente
    sendMessage(currentInput);
  };

  // Sugerencias rápidas
  const quickSuggestions = [
    "¿Cuál es mi saldo?",
    "¿Cuánto he gastado este mes?",
    "¿En qué gasto más?",
    "Resumen del mes",
    "Mis últimos movimientos",
    "¿Cómo puedo ahorrar?",
  ];

  const handleSuggestionClick = (suggestion) => {
    setInputValue(suggestion);
    inputRef.current?.focus();
  };

  // Limpiar conversación
  const handleClearChat = () => {
    setMessages([
      {
        role: "assistant",
        content: "¡Hola! Soy tu asistente financiero virtual. ¿En qué puedo ayudarte hoy?",
        timestamp: new Date(),
      },
    ]);
  };

  return (
    <div className={style.contenedorAssistant}>
        {/* Header */}
        <div className={style.header}>
          <div className={style.headerLeft}>
            <div className={style.assistantAvatar}>
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
            </div>
            <div className={style.headerInfo}>
              <h2>Asistente Financiero</h2>
              <p className={style.status}>
                <span className={style.statusDot}></span>
                En línea 
              </p>
            </div>
          </div>
          <div className={style.headerRight}>
            <Toggle />
            <button
              className={style.clearButton}
              onClick={handleClearChat}
              title="Limpiar conversación"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
              </svg>
            </button>
          </div>
        </div>

        {/* Chat Area */}
        <div className={style.chatArea}>
          <div className={style.messagesContainer}>
            {messages.map((message, index) => (
              <div
                key={index}
                className={`${style.messageWrapper} ${
                  message.role === "user" ? style.userMessage : style.assistantMessage
                }`}
              >
                <div className={style.messageAvatar}>
                  {message.role === "user" ? (
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                  ) : (
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M12 2L2 7l10 5 10-5-10-5z" />
                      <path d="M2 17l10 5 10-5" />
                      <path d="M2 12l10 5 10-5" />
                    </svg>
                  )}
                </div>
                <div className={style.messageBubble}>
                  <p className={style.messageContent}>{message.content}</p>
                  <span className={style.messageTime}>
                    {message.timestamp.toLocaleTimeString("es-ES", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className={`${style.messageWrapper} ${style.assistantMessage}`}>
                <div className={style.messageAvatar}>
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M12 2L2 7l10 5 10-5-10-5z" />
                    <path d="M2 17l10 5 10-5" />
                    <path d="M2 12l10 5 10-5" />
                  </svg>
                </div>
                <div className={style.messageBubble}>
                  <div className={style.typingIndicator}>
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Sugerencias rápidas */}
          {messages.length <= 2 && (
            <div className={style.suggestionsContainer}>
              <p className={style.suggestionsTitle}>Sugerencias:</p>
              <div className={style.suggestionsList}>
                {quickSuggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    className={style.suggestionButton}
                    onClick={() => handleSuggestionClick(suggestion)}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Input Area */}
        <form className={style.inputArea} onSubmit={handleSubmit}>
          <div className={style.inputContainer}>
            <input
              ref={inputRef}
              type="text"
              className={style.messageInput}
              placeholder="Escribe tu pregunta aquí..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              disabled={isLoading}
            />
            <button
              type="submit"
              className={style.sendButton}
              disabled={!inputValue.trim() || isLoading}
            >
              {isLoading ? (
                <svg
                  className={style.loadingIcon}
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                </svg>
              ) : (
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              )}
            </button>
          </div>
          <p className={style.disclaimer}>
            💡 Conectado a tus datos reales — saldo, transacciones y categorías.
          </p>
        </form>
      </div>
  );
}

export default AssistantDemo;
