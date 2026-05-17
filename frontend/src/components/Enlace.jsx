import React from 'react'

function Enlace({ texto, destino }) {
  return (
    <a className="link-opacity-100" href={destino}>
      {texto}
    </a>
  );
}

export default Enlace
