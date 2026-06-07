import React from "react";

// Campo de texto reutilizable. 'fondo' es el placeholder; ...rest reenvía props extra (aria, disabled, etc.).
function CajaTexto({ tipo, fondo, name, value, onChange, ...rest }) {
  return (
    <div className="CajaTexto">
      <input
        className="form-control"
        type={tipo}
        placeholder={fondo}
        name={name}
        value={value}
        onChange={onChange}
        {...rest}
      />
    </div>
  );
}

export default CajaTexto;
