import { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';

function VistaAlmacen({ socket }) {
  const [pedidos, setPedidos] = useState([]);
  const [gorras, setGorras] = useState([]);

  // --- NUEVO: ESTADOS PARA PAGINACIÓN ---
  const [paginaActual, setPaginaActual] = useState(1);
  const gorrasPorPagina = 5; // Cuántas gorras mostrar por página

  // --- NUEVO: ESTADO PARA VER DETALLE DEL PEDIDO ---
  const [pedidoViendo, setPedidoViendo] = useState(null);

  // Estados del formulario Crear
  const [modelo, setModelo] = useState('');
  const [marca, setMarca] = useState('');
  const [barcode, setBarcode] = useState('');
  const [stock, setStock] = useState('');
  const [imagen, setImagen] = useState(null);

  // Estados del Modal Editar
  const [gorraEditando, setGorraEditando] = useState(null);
  const [editModelo, setEditModelo] = useState('');
  const [editMarca, setEditMarca] = useState('');
  const [editBarcode, setEditBarcode] = useState('');
  const [editStock, setEditStock] = useState('');
  const [editImagen, setEditImagen] = useState(null);

  const cargarInventario = () => {
    fetch('http://localhost:3002/api/gorras')
      .then(res => res.json())
      .then(datos => setGorras(datos))
      .catch(err => console.error(err));
  };

  useEffect(() => {
    cargarInventario();
    const manejarNuevoPedido = (nuevoPedido) => {
      setPedidos((pedidosAnteriores) => [nuevoPedido, ...pedidosAnteriores]);
    };
    socket.on('pedido_recibido', manejarNuevoPedido);
    return () => socket.off('pedido_recibido', manejarNuevoPedido);
  }, [socket]);

  // Funciones CRUD
  const manejarSubidaGorra = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('modelo', modelo); formData.append('marca', marca);
    formData.append('barcode', barcode); formData.append('stock', stock);
    formData.append('imagen', imagen);
    try {
      const respuesta = await fetch('http://localhost:3002/api/gorras', { method: 'POST', body: formData });
      const datos = await respuesta.json();
      if (datos.exito) {
        alert('¡Gorra añadida!');
        setModelo(''); setMarca(''); setBarcode(''); setStock(''); setImagen(null);
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
    setGorraEditando(gorra); setEditModelo(gorra.modelo); setEditMarca(gorra.marca);
    setEditBarcode(gorra.barcode); setEditStock(gorra.stock); setEditImagen(null);
  };

  const guardarCambiosEdicion = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('modelo', editModelo); formData.append('marca', editMarca);
    formData.append('barcode', editBarcode); formData.append('stock', editStock);
    if (editImagen) formData.append('imagen', editImagen);
    try {
      const res = await fetch(`http://localhost:3002/api/gorras/${gorraEditando._id}`, { method: 'PUT', body: formData });
      if ((await res.json()).exito) {
        setGorraEditando(null); cargarInventario();
      }
    } catch (error) { alert("Error al guardar"); }
  };

  // --- LÓGICA MATEMÁTICA DE LA PAGINACIÓN ---
  const indiceUltimaGorra = paginaActual * gorrasPorPagina;
  const indicePrimeraGorra = indiceUltimaGorra - gorrasPorPagina;
  const gorrasPaginadas = gorras.slice(indicePrimeraGorra, indiceUltimaGorra);
  const totalPaginas = Math.ceil(gorras.length / gorrasPorPagina);

  // --- NUEVA FUNCIÓN: EXPORTAR A EXCEL ---
  const exportarExcel = (pedido) => {
    // 1. Mapeamos los datos con los nombres exactos de las columnas que pediste
    const datosExcel = pedido.items.map(item => ({
      'IMG (Enlace)': `http://localhost:3002/img/${item.imagenUrl}`,
      'Código': item.barcode,
      'Nombre de la Gorra': item.modelo,
      'Cantidades Pedidas': item.cantidad,
      '¿Separada?': false // Empieza en falso para que en Excel salga FALSO (o pueden ponerle un filtro)
    }));

    // 2. Convertimos los datos a una hoja de cálculo
    const hojaDeCalculo = XLSX.utils.json_to_sheet(datosExcel);

    // 3. Ajustamos el ancho de las columnas para que se vea bonito
    hojaDeCalculo['!cols'] = [
      { wch: 45 }, // Ancho columna IMG
      { wch: 15 }, // Ancho columna Código
      { wch: 30 }, // Ancho columna Nombre
      { wch: 20 }, // Ancho columna Cantidad
      { wch: 15 }  // Ancho columna Check
    ];

    // 4. Creamos el libro y forzamos la descarga
    const libroDeExcel = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libroDeExcel, hojaDeCalculo, `Orden_${pedido.tienda}`);

    // El archivo se llamará: PickList_TiendaCentro_123456.xlsx
    XLSX.writeFile(libroDeExcel, `PickList_${pedido.tienda.replace(/\s+/g, '')}_${pedido.idPedido.toString().slice(-6)}.xlsx`);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-10 pb-10">

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

        {/* Formulario Crear */}
        <div className="bg-white rounded-2xl shadow-lg p-6 h-fit">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 border-b pb-2">Añadir Nuevo Modelo</h2>
          <form onSubmit={manejarSubidaGorra} className="space-y-4">
            <div><label className="block text-sm font-medium mb-1">Modelo</label><input type="text" required value={modelo} onChange={e => setModelo(e.target.value)} className="w-full px-4 py-2 border rounded-lg outline-none" /></div>
            <div className="grid grid-cols-3 gap-4">
              <div><label className="block text-sm font-medium mb-1">Marca</label><input type="text" required value={marca} onChange={e => setMarca(e.target.value)} className="w-full px-4 py-2 border rounded-lg outline-none" /></div>
              <div><label className="block text-sm font-medium mb-1">Barcode</label><input type="text" required value={barcode} onChange={e => setBarcode(e.target.value)} className="w-full px-4 py-2 border rounded-lg outline-none font-mono text-sm" /></div>
              <div><label className="block text-sm font-medium mb-1">Stock</label><input type="number" required min="1" value={stock} onChange={e => setStock(e.target.value)} className="w-full px-4 py-2 border rounded-lg outline-none" /></div>
            </div>
            <div><label className="block text-sm font-medium mb-1">Foto Oficial</label><input type="file" required accept="image/*" onChange={e => setImagen(e.target.files[0])} className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:bg-blue-50 file:text-blue-700 cursor-pointer" /></div>
            <button type="submit" className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 mt-4">Subir al Catálogo</button>
          </form>
        </div>

        {/* --- NUEVO: MONITOR DE PEDIDOS AGRUPADOS --- */}
        <div>
          <h2 className="text-2xl font-bold text-red-600 mb-6 border-b pb-2">Órdenes de Tiendas</h2>
          <div className="bg-white rounded-2xl shadow-lg p-6 h-[400px] overflow-y-auto">
            {pedidos.length === 0 ? (
              <div className="flex items-center justify-center h-full text-gray-400 font-medium">Esperando órdenes...</div>
            ) : (
              <ul className="space-y-3">
                {pedidos.map((pedido) => (
                  <li
                    key={pedido.idPedido}
                    onClick={() => setPedidoViendo(pedido)}
                    className="p-4 border-l-4 border-red-500 bg-red-50 rounded-r-lg cursor-pointer hover:bg-red-100 transition-colors flex justify-between items-center shadow-sm"
                  >
                    <div>
                      <p className="font-bold text-gray-900">Orden de: {pedido.tienda}</p>
                      <p className="text-sm text-gray-600">ID: #{pedido.idPedido.toString().slice(-6)}</p>
                    </div>
                    <div className="text-right">
                      <span className="px-3 py-1 rounded-full text-sm font-bold bg-red-600 text-white">{pedido.totalArticulos} artículos</span>
                      <p className="text-xs text-gray-500 mt-1">{pedido.fecha}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* --- NUEVO: TABLA DE INVENTARIO CON PAGINACIÓN --- */}
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-6 border-b pb-2">Gestión de Inventario</h2>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-100 text-gray-600 text-sm uppercase">
                <th className="p-4">Foto</th><th className="p-4">Modelo</th><th className="p-4">Marca / Cód</th><th className="p-4 text-center">Stock</th><th className="p-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {gorrasPaginadas.map(gorra => (
                <tr key={gorra._id} className="hover:bg-gray-50">
                  <td className="p-4"><img src={`http://localhost:3002/img/${gorra.imagenUrl}`} alt={gorra.modelo} className="w-16 h-16 object-contain bg-gray-200 rounded-lg" /></td>
                  <td className="p-4 font-bold text-gray-800">{gorra.modelo}</td>
                  <td className="p-4 text-sm text-gray-600"><p className="font-semibold">{gorra.marca}</p><p className="font-mono bg-gray-100 inline-block px-1 rounded">{gorra.barcode}</p></td>
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

        {/* CONTROLES DE PAGINACIÓN */}
        {gorras.length > gorrasPorPagina && (
          <div className="flex justify-between items-center mt-6 pt-4 border-t">
            <button
              onClick={() => setPaginaActual(prev => Math.max(prev - 1, 1))}
              disabled={paginaActual === 1}
              className={`px-4 py-2 rounded-lg font-bold ${paginaActual === 1 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'}`}
            >
              Anterior
            </button>
            <span className="text-gray-600 font-medium">Página {paginaActual} de {totalPaginas}</span>
            <button
              onClick={() => setPaginaActual(prev => Math.min(prev + 1, totalPaginas))}
              disabled={paginaActual === totalPaginas}
              className={`px-4 py-2 rounded-lg font-bold ${paginaActual === totalPaginas ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'}`}
            >
              Siguiente
            </button>
          </div>
        )}
      </div>

      {/* --- NUEVO: MODAL PARA VER EL DETALLE DEL PEDIDO --- */}
      {pedidoViendo && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-2xl w-full">
            <div className="flex justify-between items-center mb-6 border-b pb-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-800">Orden de {pedidoViendo.tienda}</h2>
                <p className="text-gray-500 text-sm">Fecha: {pedidoViendo.fecha} | ID: #{pedidoViendo.idPedido.toString().slice(-6)}</p>
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
                  {pedidoViendo.items.map((item, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="p-3 font-semibold text-gray-800">{item.modelo} <span className="text-xs font-normal text-gray-500 block">{item.marca}</span></td>
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
              <button 
                onClick={() => setPedidoViendo(null)} 
                className="flex-1 bg-gray-200 text-gray-800 font-bold py-3 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cerrar Orden
              </button>
              <button 
                onClick={() => exportarExcel(pedidoViendo)} 
                className="flex-1 bg-green-600 text-white font-bold py-3 rounded-lg hover:bg-green-700 transition-colors shadow-lg flex justify-center items-center gap-2"
              >
                <span>📊</span> Exportar a Excel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Edición CRUD (Oculto si no se está usando) */}
      {gorraEditando && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 border-b pb-2">Editar Gorra</h2>
            <form onSubmit={guardarCambiosEdicion} className="space-y-4">
              <div><label className="block text-sm font-medium mb-1">Modelo</label><input type="text" required value={editModelo} onChange={e => setEditModelo(e.target.value)} className="w-full px-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium mb-1">Marca</label><input type="text" required value={editMarca} onChange={e => setEditMarca(e.target.value)} className="w-full px-4 py-2 border rounded-lg outline-none" /></div>
                <div><label className="block text-sm font-medium mb-1">Stock</label><input type="number" required min="0" value={editStock} onChange={e => setEditStock(e.target.value)} className="w-full px-4 py-2 border rounded-lg outline-none" /></div>
              </div>
              <div><label className="block text-sm font-medium mb-1">Barcode</label><input type="text" required value={editBarcode} onChange={e => setEditBarcode(e.target.value)} className="w-full px-4 py-2 border rounded-lg outline-none font-mono" /></div>
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