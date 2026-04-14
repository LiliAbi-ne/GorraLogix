const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();
app.use(cors());
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "http://localhost:5173" } });

// CONEXIONES A AMBAS BASES DE DATOS
const dbPedidos = mongoose.createConnection('mongodb://localhost:27017/almacen_pedidos');
const dbCatalogo = mongoose.createConnection('mongodb://localhost:27017/almacen_catalogo');

const Pedido = dbPedidos.model('Pedido', new mongoose.Schema({}, { strict: false }));
const Gorra = dbCatalogo.model('Gorra', new mongoose.Schema({ barcode: String, stock: Number }, { strict: false }));

let reservasGlobales = {}; // Memoria temporal para la tienda

io.on('connection', (socket) => {
  console.log('🔌 Cliente conectado:', socket.id);

  // 1. RECIBIR PEDIDO (Solo guarda y notifica)
  socket.on('nuevo_pedido', async (ticket) => {
    try {
      await Pedido.create(ticket); // Se guarda en el historial para analítica
      io.emit('pedido_recibido', ticket); // Alerta al almacén en tiempo real
      console.log("📥 Pedido recibido y guardado:", ticket.idPedido);
    } catch (err) { console.error(err); }
  });

  // 2. FINALIZAR PEDIDO (Resta stock y elimina de la lista activa)
  socket.on('finalizar_pedido', async (idPedido) => {
    try {
      // Buscamos la orden para saber qué gorras restar
      const pedido = await Pedido.findOne({ idPedido: idPedido });
      if (!pedido) return;

      // Restamos el stock en el catálogo
      for (let item of pedido.items) {
        await Gorra.updateOne(
          { barcode: item.barcode },
          { $inc: { stock: -item.cantidad } }
        );
      }

      // Borramos el pedido de la base de datos de pedidos "activos"
      await Pedido.deleteOne({ idPedido: idPedido });

      // Avisamos a todos para que actualicen sus tablas
      io.emit('pedido_finalizado', idPedido); 
      io.emit('catalogo_actualizado'); 
      console.log(`✅ Orden ${idPedido} despachada y stock actualizado.`);
    } catch (err) { console.error("Error al finalizar:", err); }
  });
});

app.get('/api/pedidos', async (req, res) => {
  const historial = await Pedido.find().sort({ _id: -1 });
  res.json(historial);
});

server.listen(3001, () => console.log(`🚀 ms-pedidos en puerto 3001`));