import CajaTexto from "../components/CajaTexto";
import Eleccion from "../components/Eleccion";
import Boton from "../components/Boton";
import style from "../styles/Transation.module.css";
import "../index.css";

function Transation() {
  return (
    <div className={style.transation}>
      <div className={style.contenedorTransation}>
        {/* Título y subtítulo */}
        <div className={style.titulo}>
          <h1>Nueva Transacción</h1>
        </div>
        <div className={style.subtitulo}>
          <p>Completa los datos para realizar tu transacción</p>
        </div>

        {/* Formulario */}
        <CajaTexto tipo="text" fondo="Cantidad" />

        <Eleccion />

        <CajaTexto tipo="text" fondo="Descripcion" />

        {/* Botones */}
        <div className={style.contenedorBotones}>
          <div className={style.botonPrimario}>
            <Boton tamano="lg" texto="Confirmar" tipo="submit" />
          </div>
          <div className={style.botonSecundario}>
            <Boton tamano="lg" texto="Cancelar" variante="secondary" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default Transation;
