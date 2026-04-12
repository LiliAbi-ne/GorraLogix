import { useState, useEffect } from 'react';

function VistaTienda({ socket }) {
  const [gorras, setGorras] = useState([]);
  const [cantidades, setCantidades] = useState({}); 
  const [reservasGlobales, setReservasGlobales] = useState({});
  const [notificacion, setNotificacion] = useState(null);

  // --- NUEVO: ESTADOS PARA PAGINACIÓN ---
  const [paginaActual, setPaginaActual] = useState(1);
  const gorrasPorPagina = 6; // 6 es ideal para que la cuadrícula se vea simétrica

  useEffect(() => {
    fetch('http://localhost:3002/api/gorras')
      .then(respuesta => respuesta.json())
      .then(datos => setGorras(datos))
      .catch(error => console.error('Error al cargar catálogo:', error));

    socket.on('reservas_actualizadas', (mapaReservas) => {
      setReservasGlobales(mapaReservas);
    });

    socket.on('reserva_expirada', () => {
      setCantidades({});
      alert("Tu sesión de reserva expiró por inactividad (60 minutos). Las gorras han sido liberadas.");
    });

    return () => {
      socket.off('reservas_actualizadas');
      socket.off('reserva_expirada');
    };
  }, [socket]);

  const cambiarCantidad = (gorra, cambio) => {
    const miCantidadActual = cantidades[gorra._id] || 0;
    const nuevaCantidad = miCantidadActual + cambio;

    if (nuevaCantidad < 0) return;

    const reservasTotalesDeEstaGorra = reservasGlobales[gorra._id] || 0;
    const stockDisponibleParaMi = gorra.stock - reservasTotalesDeEstaGorra + miCantidadActual;

    if (nuevaCantidad > stockDisponibleParaMi) return; 

    setCantidades(prev => ({ ...prev, [gorra._id]: nuevaCantidad }));
    socket.emit('modificar_reserva', { idGorra: gorra._id, nuevaCantidad: nuevaCantidad });
  };

  const teclearCantidad = (gorra, valorEscrito) => {
    let nuevaCantidad = parseInt(valorEscrito, 10);
    if (isNaN(nuevaCantidad) || nuevaCantidad < 0) nuevaCantidad = 0;

    const miCantidadActual = cantidades[gorra._id] || 0;
    const reservasTotalesDeEstaGorra = reservasGlobales[gorra._id] || 0;
    const stockDisponibleParaMi = gorra.stock - reservasTotalesDeEstaGorra + miCantidadActual;

    if (nuevaCantidad > stockDisponibleParaMi) {
      nuevaCantidad = stockDisponibleParaMi;
    }

    setCantidades(prev => ({ ...prev, [gorra._id]: nuevaCantidad }));
    socket.emit('modificar_reserva', { idGorra: gorra._id, nuevaCantidad: nuevaCantidad });
  };

  const totalGorrasPedidas = Object.values(cantidades).reduce((total, cant) => total + cant, 0);

  const enviarPedidoMasivo = () => {
    const gorrasPedidas = gorras.filter(gorra => cantidades[gorra._id] > 0);
    if (gorrasPedidas.length === 0) return;

    const detallesDelPedido = gorrasPedidas.map(gorra => ({
      modelo: gorra.modelo,
      marca: gorra.marca,
      categoria: gorra.categoria || 'Sin Categoría',
      barcode: gorra.barcode,
      cantidad: cantidades[gorra._id],
      imagenUrl: gorra.imagenUrl
    }));

    const ticketPedido = {
      idPedido: Date.now(),
      tienda: 'Tienda Centro', // En un futuro lo tomarás del login
      fecha: new Date().toLocaleTimeString(),
      totalArticulos: totalGorrasPedidas,
      items: detallesDelPedido
    };

    socket.emit('nuevo_pedido', ticketPedido);

    setNotificacion(`¡Éxito! Se ha enviado la orden a almacén con ${totalGorrasPedidas} artículos.`);
    setTimeout(() => setNotificacion(null), 3000);
    
    setCantidades({});
    socket.emit('limpiar_carrito'); 
    setPaginaActual(1); // Opcional: regresamos a la página 1 al confirmar
  };

  // --- LÓGICA MATEMÁTICA DE LA PAGINACIÓN ---
  const indiceUltimaGorra = paginaActual * gorrasPorPagina;
  const indicePrimeraGorra = indiceUltimaGorra - gorrasPorPagina;
  const gorrasPaginadas = gorras.slice(indicePrimeraGorra, indiceUltimaGorra);
  const totalPaginas = Math.ceil(gorras.length / gorrasPorPagina);

  return (
    <div className="relative pb-32"> {/* pb-32 da espacio para la barra inferior y los botones de página */}
      
      {notificacion && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 bg-green-600 text-white px-6 py-3 rounded-full shadow-2xl z-50 animate-bounce font-bold">
          {notificacion}
        </div>
      )}

      <header className="mb-10 text-center">
        <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">Catálogo de Gorras</h1>
        <p className="text-gray-500 mt-2 text-lg">Reserva dinámica activada (Las reservas expiran en 60 min)</p>
      </header>

      {/* Cuadrícula de Gorras (Ahora solo dibuja las de la página actual) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
        {gorrasPaginadas.map((gorra) => {
          const reservasTotales = reservasGlobales[gorra._id] || 0;
          const stockLibre = gorra.stock - reservasTotales;

          return (
            <div key={gorra._id} className="bg-white rounded-2xl shadow-md overflow-hidden hover:shadow-xl transition-shadow duration-300 flex flex-col h-full border border-gray-100">
              <img src={`http://localhost:3002/img/${gorra.imagenUrl}`} alt={gorra.modelo} className="w-full h-56 object-contain p-2 bg-gray-200 shrink-0"/>
              
              <div className="p-6 flex flex-col flex-grow">
                <div>
                  <h2 className="text-2xl font-bold text-gray-800 mb-1">{gorra.modelo}</h2>
                  <p className="text-gray-600 mb-4">
                    Marca: <span className="font-medium text-gray-900">{gorra.marca}</span> | 
                    Cód: <span className="font-mono text-xs bg-gray-100 px-1 rounded">{gorra.barcode}</span> <br/>
                    Stock Disponible: <span className={`font-semibold text-lg ${stockLibre <= 5 ? 'text-red-600 animate-pulse' : 'text-blue-600'}`}>
                      {stockLibre} uds.
                    </span>
                  </p>
                </div>
                
                <div className="mt-auto pt-4 border-t border-gray-100">
                  <div className="flex items-center justify-between mb-4 bg-gray-50 rounded-lg p-1 border">
                    <span className="text-sm font-semibold text-gray-600 ml-3">Pedir:</span>
                    <div className="flex items-center">
                      <button onClick={() => cambiarCantidad(gorra, -1)} className="w-10 h-10 flex items-center justify-center bg-white border border-gray-300 rounded-l-md font-bold text-gray-600 hover:bg-gray-100 text-lg">-</button>
                      <input 
                        type="number" 
                        value={cantidades[gorra._id] || "0"} 
                        onChange={(e) => teclearCantidad(gorra, e.target.value)}
                        className="w-16 h-10 text-center border-t border-b border-gray-300 bg-white font-bold text-gray-800 text-lg outline-none focus:bg-blue-50 transition-colors appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield]"
                        min="0"
                      />
                      <button onClick={() => cambiarCantidad(gorra, 1)} className="w-10 h-10 flex items-center justify-center bg-white border border-gray-300 rounded-r-md font-bold text-gray-600 hover:bg-gray-100 text-lg">+</button>
                    </div>
                  </div>
                  <a href={`http://localhost:3002/api/descargar/${gorra.imagenUrl}`} className="block w-full bg-gray-200 text-gray-800 py-2.5 rounded-lg font-semibold text-center hover:bg-gray-300 transition-colors">
                    Descargar Foto HD
                  </a>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* --- CONTROLES DE PAGINACIÓN --- */}
      {gorras.length > gorrasPorPagina && (
        <div className="max-w-6xl mx-auto flex justify-between items-center mt-10 pt-6 border-t border-gray-200">
          <button 
            onClick={() => setPaginaActual(prev => Math.max(prev - 1, 1))}
            disabled={paginaActual === 1}
            className={`px-6 py-2.5 rounded-xl font-bold transition-all shadow-sm ${paginaActual === 1 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white border border-gray-300 text-gray-800 hover:bg-gray-50 hover:shadow-md'}`}
          >
            &larr; Página Anterior
          </button>
          
          <span className="text-gray-600 font-medium bg-gray-100 px-4 py-2 rounded-lg">
            Página <span className="font-bold text-gray-900">{paginaActual}</span> de {totalPaginas}
          </span>
          
          <button 
            onClick={() => setPaginaActual(prev => Math.min(prev + 1, totalPaginas))}
            disabled={paginaActual === totalPaginas}
            className={`px-6 py-2.5 rounded-xl font-bold transition-all shadow-sm ${paginaActual === totalPaginas ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white border border-gray-300 text-gray-800 hover:bg-gray-50 hover:shadow-md'}`}
          >
            Siguiente Página &rarr;
          </button>
        </div>
      )}

      {/* Barra de Pedido Flotante */}
      {totalGorrasPedidas > 0 && (
        <div className="fixed bottom-0 left-0 w-full bg-white border-t border-gray-200 shadow-[0_-10px_15px_-3px_rgba(0,0,0,0.1)] p-4 z-40">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm font-semibold">Resumen del pedido (Tienes 60 min para confirmar)</p>
              <p className="text-2xl font-extrabold text-gray-900">{totalGorrasPedidas} <span className="text-lg font-bold text-gray-600">gorras reservadas</span></p>
            </div>
            <button onClick={enviarPedidoMasivo} className="bg-black text-white px-8 py-3 rounded-xl font-bold text-lg hover:bg-gray-800 transition-all shadow-lg transform hover:scale-105">
              Confirmar y Enviar Pedido
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default VistaTienda;