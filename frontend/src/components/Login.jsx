import { useState } from 'react';

function Login({ onLoginExitoso }) {
  const [usuario, setUsuario] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const manejarEnvio = async (e) => {
    e.preventDefault(); // Evita que la página se recargue
    setError('');

    try {
      const respuesta = await fetch('http://localhost:3003/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuario, password })
      });

      const datos = await respuesta.json();

      if (datos.exito) {
        // Si las credenciales son correctas, le avisamos a App.jsx
        onLoginExitoso(datos);
      } else {
        // Si falló, mostramos el mensaje de error del backend
        setError(datos.mensaje);
      }
    } catch (err) {
      setError('Error al conectar con el servidor de usuarios');
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white max-w-md w-full rounded-2xl shadow-xl p-8">
        
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold text-gray-900">Bienvenido</h1>
          <p className="text-gray-500 mt-2">Ingresa a tu cuenta para continuar</p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm text-center mb-6 font-medium">
            {error}
          </div>
        )}

        <form onSubmit={manejarEnvio} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Usuario</label>
            <input 
              type="text" 
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              value={usuario}
              onChange={(e) => setUsuario(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
            <input 
              type="password" 
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button 
            type="submit" 
            className="w-full bg-black text-white font-bold py-3 rounded-lg hover:bg-gray-800 transition-colors"
          >
            Iniciar Sesión
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-500">
          <p>Cuentas de prueba:</p>
          <p>Tienda: <b>tiendacentro</b> / <b>123</b></p>
          <p>Almacén: <b>admin</b> / <b>admin123</b></p>
        </div>

      </div>
    </div>
  );
}

export default Login;