import React from "react";
import { Button } from "react-bootstrap";

// Botón reutilizable: envuelve el Button de Bootstrap para usar nuestras propias props en español.
function Boton(props) {
  return (
    <div className="Boton">
      <Button
        size={props.tamano}
        variant={props.variante || "primary"}
        type={props.tipo}
        onClick={props.onClick}
      >
        {props.texto}
      </Button>
    </div>
  );
}

export default Boton;
