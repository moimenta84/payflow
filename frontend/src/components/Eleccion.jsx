import React from 'react'
import { Form } from 'react-bootstrap';

// Desplegable de selección (maqueta). Componente de ejemplo usado en el formulario de transacción.
function Eleccion() {
  return (
    <div>
      <Form.Select>
        <option>Elige...</option>
        <option>...</option>
      </Form.Select>
    </div>
  )
}

export default Eleccion
