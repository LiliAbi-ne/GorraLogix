import { useState } from 'react';
import io from 'socket.io-client';

import Login from './components/Login';
import VistaTienda from './components/VistaTienda';
import VistaAlmacen from './components/VistaAlmacen';

const socket = io('http://localhost:3001');

function App() {
  // Ahora el estado guarda toda la información del usuario conectado (o null si no hay nadie)
  const [usuarioActual, setUsuarioActual] = useState(null);

  // Función para cerrar sesión
  const cerrarSesion = () => {
    setUsuarioActual(null);
  };

  // 1. Si NO hay usuario, mostramos la pantalla de Login
  if (!usuarioActual) {
    return <Login onLoginExitoso={(datos) => setUsuarioActual(datos)} />;
  }

  // 2. Si HAY usuario, mostramos la interfaz principal con un botón de salir
  return (
    <div className="min-h-screen bg-gray-50">
      
      {/* Barra superior real de la aplicación */}
      <nav className="bg-white shadow-sm px-8 py-4 flex justify-between items-center mb-8">
        <div className="font-bold text-xl text-gray-800">
          Sistema de {usuarioActual.rol === 'almacen' ? 'Almacén Central' : 'Tienda'}
        </div>
        <div className="flex items-center gap-4">
          <span className="text-gray-600 font-medium">Hola, {usuarioActual.usuario}</span>
          <button 
            onClick={cerrarSesion}
            className="px-4 py-2 text-sm font-bold text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
          >
            Cerrar Sesión
          </button>
        </div>
      </nav>

      {/* Renderizado Condicional: Tienda o Almacén */}
      <div className="p-8 pt-0">
        {usuarioActual.rol === 'tienda' ? (
          <VistaTienda socket={socket} />
        ) : (
          <VistaAlmacen socket={socket} />
        )}
      </div>

    </div>
  );
}

export default App;