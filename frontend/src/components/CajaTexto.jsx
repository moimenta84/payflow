import React from "react";

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
