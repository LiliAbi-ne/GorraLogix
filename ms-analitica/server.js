const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();
const PORT = 3004;

app.use(cors());
app.use(express.json());

// Nos conectamos a las bases de datos existentes
mongoose.connect('mongodb://localhost:27017/almacen_catalogo')
  .then(() => console.log('Conectado a MongoDB - Analítica'))
  .catch(err => console.error('Error al conectar:', err));

// 1. Esquema de lectura para las Gorras (Agregamos tu nueva "categoria")
const esquemaGorra = new mongoose.Schema({
  modelo: String,
  marca: String,
  categoria: { type: String, enum: ['Trucker', 'Urbano', 'Deportivo'] }, // Tu nueva regla
  stock: Number
});
const Gorra = mongoose.model('Gorra', esquemaGorra);

// 2. Esquema de lectura para el Historial de Pedidos 
const esquemaPedido = new mongoose.Schema({
  idPedido: String,
  tienda: String,
  fecha: Date,
  totalArticulos: Number,
  items: Array 
});
const Pedido = mongoose.model('Pedido', esquemaPedido);


// ==========================================
// RUTAS DE BUSINESS INTELLIGENCE (ANALÍTICA)
// ==========================================

// Ruta A: Obtener el Stock Crítico (Gorras con menos de 10 unidades)
app.get('/api/analitica/stock-critico', async (req, res) => {
  try {
    const stockBajo = await Gorra.find({ stock: { $lt: 10 } }).sort({ stock: 1 });
    res.json({ exito: true, datos: stockBajo });
  } catch (error) {
    res.status(500).json({ exito: false, mensaje: 'Error al calcular stock' });
  }
});

// Ruta B: Rendimiento por Categoría (¿Qué se vende más? Trucker, Urbano o Deportivo)
app.get('/api/analitica/ventas-categoria', async (req, res) => {
  try {
    // Aquí MongoDB suma todas las gorras vendidas y las agrupa por categoría
    const ventas = await Pedido.aggregate([
      { $unwind: "$items" }, // Desempaqueta las cajas del pedido
      { $group: { 
          _id: "$items.categoria", 
          totalVendido: { $sum: "$items.cantidad" } 
      }},
      { $sort: { totalVendido: -1 } } // Ordena del más vendido al menos vendido
    ]);
    
    res.json({ exito: true, datos: ventas });
  } catch (error) {
    res.status(500).json({ exito: false, mensaje: 'Error al procesar ventas' });
  }
});

// Ruta C: Resumen General (KPIs)
app.get('/api/analitica/kpis', async (req, res) => {
  try {
    const totalGorrasAlmacen = await Gorra.aggregate([{ $group: { _id: null, total: { $sum: "$stock" } } }]);
    const totalPedidosHistoricos = await Pedido.countDocuments();

    res.json({
      exito: true,
      datos: {
        inventarioTotal: totalGorrasAlmacen[0] ? totalGorrasAlmacen[0].total : 0,
        pedidosProcesados: totalPedidosHistoricos
      }
    });
  } catch (error) {
    res.status(500).json({ exito: false, mensaje: 'Error al calcular KPIs' });
  }
});

app.listen(PORT, () => {
  console.log(`📊 Servidor de Analítica corriendo en http://localhost:${PORT}`);
});