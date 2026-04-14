import { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import DashboardAnalitica from './DashboardAnalitica';

function VistaAlmacen({ socket }) {
  // --- ESTADOS DE NAVEGACIÓN ---
  const [pestanaActiva, setPestanaActiva] = useState('operacion');

  // --- ESTADOS DE DATOS ---
  const [pedidos, setPedidos] = useState([]);
  const [gorras, setGorras] = useState([]);

  // --- ESTADOS DE PAGINACIÓN ---
  const [paginaActual, setPaginaActual] = useState(1);
  const gorrasPorPagina = 5;

  // --- ESTADO PARA VER DETALLE DEL PEDIDO ---
  const [pedidoViendo, setPedidoViendo] = useState(null);

  // --- ESTADOS DEL FORMULARIO CREAR ---
  const [modelo, setModelo] = useState('');
  const [marca, setMarca] = useState('');
  const [esNuevaMarca, setEsNuevaMarca] = useState(false);
  const [categoria, setCategoria] = useState('Urbano');
  const [barcode, setBarcode] = useState('');
  const [stock, setStock] = useState('');
  const [imagen, setImagen] = useState(null);

  // --- ESTADOS DEL MODAL EDITAR ---
  const [gorraEditando, setGorraEditando] = useState(null);
  const [editModelo, setEditModelo] = useState('');
  const [editMarca, setEditMarca] = useState('');
  const [editCategoria, setEditCategoria] = useState('Urbano');
  const [editBarcode, setEditBarcode] = useState('');
  const [editStock, setEditStock] = useState('');
  const [editImagen, setEditImagen] = useState(null);

  // --- EFECTOS Y CARGA DE DATOS ---
  const cargarInventario = () => {
    fetch('http://localhost:3002/api/gorras')
      .then(res => res.json())
      .then(datos => setGorras(datos))
      .catch(err => console.error(err));
  };

  const cargarHistorialPedidos = () => {
    fetch('http://localhost:3001/api/pedidos')
      .then(res => res.json())
      .then(datos => setPedidos(datos))
      .catch(err => console.error("Error al cargar pedidos:", err));
  };

  useEffect(() => {
    cargarInventario();
    cargarHistorialPedidos(); 

    const manejarNuevoPedido = (nuevoPedido) => {
      setPedidos((pedidosAnteriores) => [nuevoPedido, ...pedidosAnteriores]);
    };
    
    socket.on('pedido_recibido', manejarNuevoPedido);

    // --- NUEVO: ESCUCHAR CUANDO SE DESPACHA UNA ORDEN ---
    socket.on('pedido_finalizado', (idEliminado) => {
      // Filtramos la lista para borrar la tarjeta roja de la pantalla
      setPedidos((prev) => prev.filter(p => p.idPedido !== idEliminado));
    });

    socket.on('catalogo_actualizado', () => {
      // Recargamos la tabla de inventario porque los números bajaron
      cargarInventario();
    });

    return () => {
      socket.off('pedido_recibido', manejarNuevoPedido);
      socket.off('pedido_finalizado');
      socket.off('catalogo_actualizado');
    };
  }, [socket]);

  // --- LÓGICA DINÁMICA DE MARCAS ---
  const marcasDisponibles = [...new Set(gorras.map(g => g.marca))];
  if (marcasDisponibles.length === 0) {
    marcasDisponibles.push('New Era', 'Nike', 'Adidas');
  }

  // --- LÓGICA MATEMÁTICA DE LA PAGINACIÓN ---
  const indiceUltimaGorra = paginaActual * gorrasPorPagina;
  const indicePrimeraGorra = indiceUltimaGorra - gorrasPorPagina;
  const gorrasPaginadas = gorras.slice(indicePrimeraGorra, indiceUltimaGorra);
  const totalPaginas = Math.ceil(gorras.length / gorrasPorPagina);

  // --- FUNCIONES CRUD ---
  const manejarSubidaGorra = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('modelo', modelo);
    formData.append('marca', marca);
    formData.append('categoria', categoria);
    formData.append('barcode', barcode);
    formData.append('stock', stock);
    formData.append('imagen', imagen);
    try {
      const respuesta = await fetch('http://localhost:3002/api/gorras', { method: 'POST', body: formData });
      const datos = await respuesta.json();
      if (datos.exito) {
        alert('¡Gorra añadida!');
        setModelo(''); setMarca(''); setCategoria('Urbano'); setBarcode(''); setStock(''); setImagen(null); setEsNuevaMarca(false);
        cargarInventario();
      }
    } catch (error) { alert('Error al subir la gorra'); }
  };

  const eliminarGorra = async (id, modeloGorra) => {
    if (window.confirm(`¿Eliminar "${modeloGorra}"?`)) {
      try {
        const res = await fetch(`http://localhost:3002/api/gorras/${id}`, { method: 'DELETE' });
        if ((await res.json()).exito) cargarInventario();
      } catch (error) { alert("Error al eliminar"); }
    }
  };

  const abrirModalEdicion = (gorra) => {
    setGorraEditando(gorra);
    setEditModelo(gorra.modelo);
    setEditMarca(gorra.marca);
    setEditCategoria(gorra.categoria || 'Urbano');
    setEditBarcode(gorra.barcode);
    setEditStock(gorra.stock);
    setEditImagen(null);
  };
  
  // --- NUEVA FUNCIÓN: FINALIZAR EL PEDIDO ---
  const finalizarDespacho = (idPedido) => {
    if (window.confirm("¿Confirmas que el pedido ya fue empaquetado y salió del almacén?")) {
      socket.emit('finalizar_pedido', idPedido);
      setPedidoViendo(null); // Cerramos el modal de detalles
    }
  };

  const guardarCambiosEdicion = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('modelo', editModelo);
    formData.append('marca', editMarca);
    formData.append('categoria', editCategoria);
    formData.append('barcode', editBarcode);
    formData.append('stock', editStock);
    if (editImagen) formData.append('imagen', editImagen);
    try {
      const res = await fetch(`http://localhost:3002/api/gorras/${gorraEditando._id}`, { method: 'PUT', body: formData });
      if ((await res.json()).exito) {
        setGorraEditando(null); cargarInventario();
      }
    } catch (error) { alert("Error al guardar"); }
  };

  // --- FUNCIÓN EXPORTAR A EXCEL ---
  const exportarExcel = (pedido) => {
    const datosExcel = pedido.items.map(item => ({
      'IMG (Enlace)': `http://localhost:3002/img/${item.imagenUrl}`,
      'Código': item.barcode,
      'Nombre de la Gorra': item.modelo,
      'Marca': item.marca,
      'Categoría': item.categoria || 'Sin Categoría',
      'Cantidades Pedidas': item.cantidad,
      '¿Separada?': false
    }));

    const hojaDeCalculo = XLSX.utils.json_to_sheet(datosExcel);
    hojaDeCalculo['!cols'] = [{ wch: 45 }, { wch: 15 }, { wch: 30 }, { wch: 15 }, { wch: 15 }, { wch: 20 }, { wch: 15 }];

    const libroDeExcel = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libroDeExcel, hojaDeCalculo, `Orden_${pedido.tienda}`);

    // Escudo protector para el ID en el nombre del archivo Excel
    const idSeguro = pedido.idPedido ? pedido.idPedido.toString().slice(-6) : '000000';
    XLSX.writeFile(libroDeExcel, `PickList_${pedido.tienda.replace(/\s+/g, '')}_${idSeguro}.xlsx`);
  };

  // --- INTERFAZ ---
  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-10">

      {/* NAVEGACIÓN POR PESTAÑAS */}
      <div className="flex bg-white p-1.5 rounded-2xl shadow-md w-fit mx-auto border border-gray-100 mb-8">
        <button
          onClick={() => setPestanaActiva('operacion')}
          className={`px-8 py-3 rounded-xl font-bold transition-all flex items-center gap-2 ${pestanaActiva === 'operacion' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-500 hover:bg-gray-50'
            }`}
        >
          <span>📋</span> Gestión Operativa
        </button>
        <button
          onClick={() => setPestanaActiva('analitica')}
          className={`px-8 py-3 rounded-xl font-bold transition-all flex items-center gap-2 ${pestanaActiva === 'analitica' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-500 hover:bg-gray-50'
            }`}
        >
          <span>📊</span> Panel de Analítica
        </button>
      </div>

      {/* CONTENIDO CONDICIONAL DE PESTAÑAS */}
      {pestanaActiva === 'operacion' ? (
        <div className="space-y-10 animate-fade-in">

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Formulario Crear */}
            <div className="bg-white rounded-2xl shadow-lg p-6 h-fit">
              <h2 className="text-2xl font-bold text-gray-800 mb-6 border-b pb-2">Añadir Nuevo Modelo</h2>
              <form onSubmit={manejarSubidaGorra} className="space-y-4">
                <div><label className="block text-sm font-medium mb-1">Modelo</label><input type="text" required value={modelo} onChange={e => setModelo(e.target.value)} className="w-full px-4 py-2 border rounded-lg outline-none" /></div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Selector Dinámico de Marca */}
                  <div>
                    <label className="block text-sm font-medium mb-1">Marca</label>
                    {!esNuevaMarca ? (
                      <select required value={marca} onChange={(e) => {
                        if (e.target.value === 'NUEVA_MARCA') { setEsNuevaMarca(true); setMarca(''); }
                        else { setMarca(e.target.value); }
                      }} className="w-full px-4 py-2 border rounded-lg outline-none bg-white cursor-pointer"
                      >
                        <option value="" disabled>Seleccione marca</option>
                        {marcasDisponibles.map(m => <option key={m} value={m}>{m}</option>)}
                        <option value="NUEVA_MARCA" className="font-bold text-blue-600 bg-blue-50">+ Añadir nueva...</option>
                      </select>
                    ) : (
                      <div className="flex gap-2">
                        <input type="text" required placeholder="Escribe..." value={marca} onChange={(e) => setMarca(e.target.value)} className="w-full px-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
                        <button type="button" onClick={() => { setEsNuevaMarca(false); setMarca(''); }} className="bg-gray-200 px-3 rounded-lg text-gray-600 font-bold hover:bg-gray-300">X</button>
                      </div>
                    )}
                  </div>

                  {/* Selector de Categoría */}
                  <div>
                    <label className="block text-sm font-medium mb-1">Categoría</label>
                    <select required value={categoria} onChange={e => setCategoria(e.target.value)} className="w-full px-4 py-2 border rounded-lg outline-none bg-white">
                      <option value="Urbano">Urbano</option>
                      <option value="Deportivo">Deportivo</option>
                      <option value="Trucker">Trucker</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-sm font-medium mb-1">Barcode</label><input type="text" required value={barcode} onChange={e => setBarcode(e.target.value)} className="w-full px-4 py-2 border rounded-lg outline-none font-mono text-sm" /></div>
                  <div><label className="block text-sm font-medium mb-1">Stock Inicial</label><input type="number" required min="1" value={stock} onChange={e => setStock(e.target.value)} className="w-full px-4 py-2 border rounded-lg outline-none" /></div>
                </div>

                <div><label className="block text-sm font-medium mb-1">Foto Oficial</label><input type="file" required accept="image/*" onChange={e => setImagen(e.target.files[0])} className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:bg-blue-50 file:text-blue-700 cursor-pointer" /></div>
                <button type="submit" className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 mt-4">Subir al Catálogo</button>
              </form>
            </div>

            {/* Monitor de Pedidos */}
            <div>
              <h2 className="text-2xl font-bold text-red-600 mb-6 border-b pb-2">Órdenes de Tiendas</h2>
              <div className="bg-white rounded-2xl shadow-lg p-6 h-[460px] overflow-y-auto">
                {pedidos.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-gray-400 font-medium">Esperando órdenes...</div>
                ) : (
                  <ul className="space-y-3">
                    {pedidos.map((pedido) => (
                      // ESCUDO 1: Usamos _id de MongoDB como key por si no hay idPedido
                      <li key={pedido._id || Math.random()} onClick={() => setPedidoViendo(pedido)} className="p-4 border-l-4 border-red-500 bg-red-50 rounded-r-lg cursor-pointer hover:bg-red-100 transition-colors flex justify-between items-center shadow-sm">
                        <div>
                          <p className="font-bold text-gray-900">Orden de: {pedido.tienda}</p>
                          {/* ESCUDO 2: Verificamos que idPedido exista antes de hacer toString() */}
                          <p className="text-sm text-gray-600">ID: #{pedido.idPedido ? pedido.idPedido.toString().slice(-6) : 'N/A'}</p>
                        </div>
                        <div className="text-right">
                          <span className="px-3 py-1 rounded-full text-sm font-bold bg-red-600 text-white">{pedido.totalArticulos || 0} arts.</span>
                          <p className="text-xs text-gray-500 mt-1">{pedido.fecha || 'Sin fecha'}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>

          {/* TABLA DE INVENTARIO CON PAGINACIÓN */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 border-b pb-2">Gestión de Inventario</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-100 text-gray-600 text-sm uppercase">
                    <th className="p-4">Foto</th><th className="p-4">Modelo</th><th className="p-4">Detalles</th><th className="p-4 text-center">Stock</th><th className="p-4 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {gorrasPaginadas.map(gorra => (
                    <tr key={gorra._id} className="hover:bg-gray-50">
                      <td className="p-4"><img src={`http://localhost:3002/img/${gorra.imagenUrl}`} alt={gorra.modelo} className="w-16 h-16 object-contain bg-gray-200 rounded-lg" /></td>
                      <td className="p-4 font-bold text-gray-800">{gorra.modelo}</td>
                      <td className="p-4 text-sm text-gray-600">
                        <p className="font-semibold">{gorra.marca}</p>
                        <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded mt-1 mr-2">{gorra.categoria || 'Sin Categoría'}</span>
                        <p className="font-mono bg-gray-100 inline-block px-1 rounded mt-1">{gorra.barcode}</p>
                      </td>
                      <td className="p-4 text-center font-bold text-blue-600 text-lg">{gorra.stock}</td>
                      <td className="p-4 text-center space-x-2">
                        <button onClick={() => abrirModalEdicion(gorra)} className="bg-blue-100 text-blue-700 px-3 py-1 rounded-lg font-semibold hover:bg-blue-200">✏️</button>
                        <button onClick={() => eliminarGorra(gorra._id, gorra.modelo)} className="bg-red-100 text-red-700 px-3 py-1 rounded-lg font-semibold hover:bg-red-200">🗑️</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Controles de Paginación */}
            {gorras.length > gorrasPorPagina && (
              <div className="flex justify-between items-center mt-6 pt-4 border-t">
                <button onClick={() => setPaginaActual(prev => Math.max(prev - 1, 1))} disabled={paginaActual === 1} className={`px-4 py-2 rounded-lg font-bold ${paginaActual === 1 ? 'bg-gray-100 text-gray-400' : 'bg-gray-200 hover:bg-gray-300'}`}>Anterior</button>
                <span className="text-gray-600 font-medium">Página {paginaActual} de {totalPaginas}</span>
                <button onClick={() => setPaginaActual(prev => Math.min(prev + 1, totalPaginas))} disabled={paginaActual === totalPaginas} className={`px-4 py-2 rounded-lg font-bold ${paginaActual === totalPaginas ? 'bg-gray-100 text-gray-400' : 'bg-gray-200 hover:bg-gray-300'}`}>Siguiente</button>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="animate-fade-in">
          <DashboardAnalitica />
        </div>
      )}

      {/* --- MODALES FLOTANTES --- */}

      {/* Modal Ver Pedido y Exportar Excel */}
      {pedidoViendo && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-2xl w-full">
            <div className="flex justify-between items-center mb-6 border-b pb-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-800">Orden de {pedidoViendo.tienda}</h2>
                {/* ESCUDO 3: Verificación en el Modal */}
                <p className="text-gray-500 text-sm">Fecha: {pedidoViendo.fecha || 'Sin fecha'} | ID: #{pedidoViendo.idPedido ? pedidoViendo.idPedido.toString().slice(-6) : 'N/A'}</p>
              </div>
              <button onClick={() => setPedidoViendo(null)} className="text-gray-400 hover:text-red-500 text-2xl font-bold">&times;</button>
            </div>

            <div className="max-h-80 overflow-y-auto mb-6">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 text-gray-600 text-sm">
                    <th className="p-3">Modelo</th>
                    <th className="p-3">Cód. Barras</th>
                    <th className="p-3 text-right">Cantidad Solicitada</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {(pedidoViendo.items || []).map((item, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="p-3 font-semibold text-gray-800">
                        {item.modelo}
                        <span className="text-xs font-normal text-gray-500 block">{item.marca} - {item.categoria || 'Sin Categoría'}</span>
                      </td>
                      <td className="p-3 font-mono text-sm">{item.barcode}</td>
                      <td className="p-3 text-right font-bold text-red-600 text-lg">{item.cantidad}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-between items-center border-t pt-4 mt-4">
              <span className="text-gray-600 font-medium">Total de gorras a empacar:</span>
              <span className="text-2xl font-black text-gray-900">{pedidoViendo.totalArticulos}</span>
            </div>

            <div className="flex gap-4 mt-6">
              <button onClick={() => setPedidoViendo(null)} className="flex-1 bg-gray-200 text-gray-800 font-bold py-3 rounded-lg hover:bg-gray-300">Cerrar</button>

              {/* NUEVO BOTÓN PARA FINALIZAR */}
              <button
                onClick={() => finalizarDespacho(pedidoViendo.idPedido)}
                className="flex-1 bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 shadow-lg"
              >
                Finalizar y Restar Stock 🚚
              </button>

              <button onClick={() => exportarExcel(pedidoViendo)} className="bg-green-600 text-white font-bold px-4 py-3 rounded-lg hover:bg-green-700">
                📊 Excel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Editar Gorra */}
      {gorraEditando && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 border-b pb-2">Editar Gorra</h2>
            <form onSubmit={guardarCambiosEdicion} className="space-y-4">
              <div><label className="block text-sm font-medium mb-1">Modelo</label><input type="text" required value={editModelo} onChange={e => setEditModelo(e.target.value)} className="w-full px-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium mb-1">Marca</label><input type="text" required value={editMarca} onChange={e => setEditMarca(e.target.value)} className="w-full px-4 py-2 border rounded-lg outline-none" /></div>
                <div>
                  <label className="block text-sm font-medium mb-1">Categoría</label>
                  <select required value={editCategoria} onChange={e => setEditCategoria(e.target.value)} className="w-full px-4 py-2 border rounded-lg outline-none bg-white">
                    <option value="Urbano">Urbano</option>
                    <option value="Deportivo">Deportivo</option>
                    <option value="Trucker">Trucker</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium mb-1">Barcode</label><input type="text" required value={editBarcode} onChange={e => setEditBarcode(e.target.value)} className="w-full px-4 py-2 border rounded-lg outline-none font-mono" /></div>
                <div><label className="block text-sm font-medium mb-1">Stock</label><input type="number" required min="0" value={editStock} onChange={e => setEditStock(e.target.value)} className="w-full px-4 py-2 border rounded-lg outline-none" /></div>
              </div>
              <div className="flex gap-3 mt-8 pt-4 border-t">
                <button type="button" onClick={() => setGorraEditando(null)} className="flex-1 bg-gray-200 font-bold py-2 rounded-lg hover:bg-gray-300">Cancelar</button>
                <button type="submit" className="flex-1 bg-blue-600 text-white font-bold py-2 rounded-lg hover:bg-blue-700">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

export default VistaAlmacen;