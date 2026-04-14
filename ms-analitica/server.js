const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();

// IMPORTANTE: Esto permite que tu React (5173) lea los datos de este servidor (3004)
app.use(cors({
  origin: "http://localhost:5173"
}));

// CONEXIONES
const dbCatalogo = mongoose.createConnection('mongodb://localhost:27017/almacen_catalogo');
const dbPedidos = mongoose.createConnection('mongodb://localhost:27017/almacen_pedidos');

const Gorra = dbCatalogo.model('Gorra', new mongoose.Schema({}, { strict: false }));
const Pedido = dbPedidos.model('Pedido', new mongoose.Schema({}, { strict: false }));

// A. KPIs (Tarjetas de arriba)
app.get('/api/analitica/kpis', async (req, res) => {
  try {
    const gorras = await Gorra.find();
    const inventarioTotal = gorras.reduce((suma, g) => suma + (Number(g.stock) || 0), 0);
    const pedidosProcesados = await Pedido.countDocuments({ estado: 'Despachado' });
    
    res.json({ exito: true, datos: { inventarioTotal, pedidosProcesados } });
  } catch (error) { res.status(500).json({ exito: false }); }
});

// B. Ventas por Categoría (Gráfico Recharts)
app.get('/api/analitica/ventas-categoria', async (req, res) => {
  try {
    const ventas = await Pedido.aggregate([
      { $match: { estado: 'Despachado' } },
      { $unwind: "$items" },
      { 
        $group: { 
          _id: "$items.categoria", 
          totalVendido: { $sum: "$items.cantidad" } 
        } 
      }
    ]);
    res.json({ exito: true, datos: ventas });
  } catch (error) { res.status(500).json({ exito: false }); }
});

// C. Stock Crítico (Alerta roja)
app.get('/api/analitica/stock-critico', async (req, res) => {
  try {
    const critico = await Gorra.find({ stock: { $lte: 5 } }).limit(10);
    res.json({ exito: true, datos: critico });
  } catch (error) { res.status(500).json({ exito: false }); }
});

app.listen(3004, () => console.log('📊 ms-analitica listo en puerto 3004'));