import React from "react";
import { Form } from "react-bootstrap";

function CajaTexto({ tipo, fondo, name, value, onChange }) {
  return (
    <div className="CajaTexto">
      <Form.Control type={tipo} placeholder={fondo} name={name} value={value} onChange={onChange} />
    </div>
  );
}

export default CajaTexto;
