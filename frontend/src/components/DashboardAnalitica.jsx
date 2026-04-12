import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';

function DashboardAnalitica() {
  const [kpis, setKpis] = useState({ inventarioTotal: 0, pedidosProcesados: 0 });
  const [ventasCategoria, setVentasCategoria] = useState([]);
  const [stockCritico, setStockCritico] = useState([]);

  // Cargar datos desde nuestro nuevo microservicio (Puerto 3004)
  const cargarDatos = () => {
    fetch('http://localhost:3004/api/analitica/kpis')
      .then(res => res.json())
      .then(data => data.exito && setKpis(data.datos));

    fetch('http://localhost:3004/api/analitica/ventas-categoria')
      .then(res => res.json())
      .then(data => {
        if (data.exito) {
          // Recharts necesita que los datos tengan un formato específico
          const datosFormateados = data.datos.map(item => ({
            name: item._id || 'Sin Categoría',
            Vendidas: item.totalVendido
          }));
          setVentasCategoria(datosFormateados);
        }
      });

    fetch('http://localhost:3004/api/analitica/stock-critico')
      .then(res => res.json())
      .then(data => data.exito && setStockCritico(data.datos));
  };

  useEffect(() => {
    cargarDatos();
    // Actualizar los gráficos cada 10 segundos
    const intervalo = setInterval(cargarDatos, 10000); 
    return () => clearInterval(intervalo);
  }, []);

  return (
    <div className="space-y-8 animate-fade-in-up">
      {/* TARJETAS DE KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl shadow-lg p-6 flex items-center justify-between border-l-4 border-blue-600">
          <div>
            <p className="text-gray-500 text-sm font-bold uppercase tracking-wider">Inventario Total en Almacén</p>
            <p className="text-4xl font-black text-gray-900 mt-2">{kpis.inventarioTotal} <span className="text-lg text-gray-500 font-medium">unidades</span></p>
          </div>
          <div className="text-4xl">📦</div>
        </div>
        <div className="bg-white rounded-2xl shadow-lg p-6 flex items-center justify-between border-l-4 border-green-600">
          <div>
            <p className="text-gray-500 text-sm font-bold uppercase tracking-wider">Gorras Despachadas (Histórico)</p>
            <p className="text-4xl font-black text-gray-900 mt-2">{kpis.pedidosProcesados} <span className="text-lg text-gray-500 font-medium">tickets</span></p>
          </div>
          <div className="text-4xl">🚚</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* GRÁFICO DE BARRAS */}
        <div className="bg-white rounded-2xl shadow-lg p-6 lg:col-span-2">
          <h2 className="text-xl font-bold text-gray-800 mb-6">Rendimiento por Categoría</h2>
          <div className="h-72">
            {ventasCategoria.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ventasCategoria}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} />
                  <YAxis axisLine={false} tickLine={false} />
                  <Tooltip cursor={{fill: 'rgba(0,0,0,0.05)'}} contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}/>
                  <Legend />
                  <Bar dataKey="Vendidas" fill="#2563eb" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400 font-medium">No hay ventas registradas aún</div>
            )}
          </div>
        </div>

        {/* ALERTA DE STOCK CRÍTICO */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-red-600 mb-4 flex items-center gap-2">
            <span>⚠️</span> Alerta de Reabastecimiento
          </h2>
          <div className="overflow-y-auto h-64 pr-2">
            {stockCritico.length === 0 ? (
              <div className="text-center text-green-600 font-medium mt-10">Inventario sano. ¡No hay alertas!</div>
            ) : (
              <ul className="space-y-3">
                {stockCritico.map(gorra => (
                  <li key={gorra._id} className="p-3 bg-red-50 border border-red-100 rounded-xl flex justify-between items-center">
                    <div>
                      <p className="font-bold text-gray-900 text-sm">{gorra.modelo}</p>
                      <p className="text-xs text-gray-500">{gorra.marca} - {gorra.categoria}</p>
                    </div>
                    <span className="bg-red-600 text-white font-bold py-1 px-3 rounded-full text-sm">
                      {gorra.stock} left
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default DashboardAnalitica;