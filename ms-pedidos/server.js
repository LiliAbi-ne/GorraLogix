const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();
app.use(cors());
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "http://localhost:5173" } });

// ==========================================
// 1. CONEXIONES A AMBAS BASES DE DATOS
// ==========================================
const dbPedidos = mongoose.createConnection('mongodb://localhost:27017/almacen_pedidos');
const dbCatalogo = mongoose.createConnection('mongodb://localhost:27017/almacen_catalogo');

const Pedido = dbPedidos.model('Pedido', new mongoose.Schema({}, { strict: false }));
const Gorra = dbCatalogo.model('Gorra', new mongoose.Schema({ barcode: String, stock: Number }, { strict: false }));

// ==========================================
// 2. MEMORIA VOLÁTIL (Reservas Dinámicas)
// ==========================================
let reservasPorCliente = {};
let reservasGlobales = {};

const recalcularReservasGlobales = () => {
  reservasGlobales = {};
  for (const socketId in reservasPorCliente) {
    const reservasDelSocket = reservasPorCliente[socketId];
    for (const idGorra in reservasDelSocket) {
      if (!reservasGlobales[idGorra]) reservasGlobales[idGorra] = 0;
      reservasGlobales[idGorra] += reservasDelSocket[idGorra];
    }
  }
  io.emit('reservas_actualizadas', reservasGlobales);
};

// ==========================================
// 3. EVENTOS WEBSOCKET
// ==========================================
io.on('connection', (socket) => {
  console.log('🔌 Cliente conectado:', socket.id);

  // Al conectar, enviamos el estado actual de las reservas
  socket.emit('reservas_actualizadas', reservasGlobales);

  // --- GESTIÓN DE RESERVAS DE LA TIENDA ---
  socket.on('modificar_reserva', ({ idGorra, nuevaCantidad }) => {
    if (!reservasPorCliente[socket.id]) reservasPorCliente[socket.id] = {};
    if (nuevaCantidad === 0) delete reservasPorCliente[socket.id][idGorra];
    else reservasPorCliente[socket.id][idGorra] = nuevaCantidad;
    recalcularReservasGlobales();
  });

  socket.on('limpiar_carrito', () => {
    delete reservasPorCliente[socket.id];
    recalcularReservasGlobales();
  });

  socket.on('disconnect', () => {
    console.log('❌ Cliente desconectado:', socket.id);
    delete reservasPorCliente[socket.id];
    recalcularReservasGlobales();
  });

  // --- FLUJO PRINCIPAL DE PEDIDOS ---
  
  // A. La Tienda manda el pedido
  socket.on('nuevo_pedido', async (ticket) => {
    try {
      // 1. Liberamos las reservas temporales
      delete reservasPorCliente[socket.id];
      recalcularReservasGlobales();

      // 2. Guardamos en el historial y avisamos
      await Pedido.create(ticket); 
      io.emit('pedido_recibido', ticket); 
      console.log("📥 Pedido recibido y guardado:", ticket.idPedido);
    } catch (err) { console.error(err); }
  });

  // B. El Almacén empaca y finaliza
  socket.on('finalizar_pedido', async (idPedido) => {
    try {
      const pedido = await Pedido.findOne({ idPedido: idPedido });
      if (!pedido) return;

      // 1. Restamos el stock real en el catálogo
      for (let item of pedido.items) {
        await Gorra.updateOne(
          { barcode: item.barcode },
          { $inc: { stock: -item.cantidad } }
        );
      }

      // 2. Archivamos la orden para que Analítica la pueda graficar
      await Pedido.updateOne({ idPedido: idPedido }, { $set: { estado: 'Despachado' } });

      // 3. Avisamos al almacén que cierre la tarjeta y actualice stock
      io.emit('pedido_finalizado', idPedido); 
      io.emit('catalogo_actualizado'); 
      console.log(`✅ Orden ${idPedido} despachada y stock actualizado.`);
    } catch (err) { console.error("Error al finalizar:", err); }
  });
});

// ==========================================
// 4. RUTAS API (REST)
// ==========================================
app.get('/api/pedidos', async (req, res) => {
  try {
    // La pantalla de Operación solo descarga los pedidos que NO están despachados
    const historial = await Pedido.find({ estado: { $ne: 'Despachado' } }).sort({ _id: -1 });
    res.json(historial);
  } catch (error) {
    console.error("Error al obtener historial:", error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

server.listen(3001, () => console.log(`🚀 ms-pedidos en puerto 3001`));