import React, { useState } from "react";
import { Image } from "react-bootstrap";

function Imagen({ imagen, alt = "Imagen", className = "", style = {} }) {
  const [error, setError] = useState(false);

  // Si hay error o no se proporciona imagen, mostrar placeholder
  if (error || !imagen) {
    return (
      <div
        className={className}
        style={{
          ...style,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "var(--color-gray-100, #f0f0f0)",
          borderRadius: "12px",
          padding: "20px",
          minHeight: "80px",
          width: "100%",
        }}
      >
        <span
          style={{
            fontSize: "3rem",
            color: "var(--color-primary-250, #4CAF50)",
          }}
        >
          💰
        </span>
      </div>
    );
  }

  // Construir la ruta de la imagen
  // Intenta primero en /public, luego en /src/assets
  const imagePath =
    imagen.startsWith("/") || imagen.startsWith("http") ? imagen : `/${imagen}`;

  return (
    <div className={className}>
      <Image
        src={imagePath}
        alt={alt}
        style={style}
        onError={(e) => {
          console.warn(`⚠️ No se pudo cargar: ${imagePath}`);
          setError(true);
        }}
        onLoad={() => {
          console.log(`✅ Imagen cargada: ${imagePath}`);
        }}
        fluid
      />
    </div>
  );
}

export default Imagen;
