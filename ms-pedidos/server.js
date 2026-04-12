const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();
app.use(cors());
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: "http://localhost:5173" } // Asegura que tu frontend pueda hablarle
});

// ==========================================
// 1. BASE DE DATOS (Para ms-analitica)
// ==========================================
mongoose.connect('mongodb://localhost:27017/almacen_pedidos')
  .then(() => console.log('✅ Conectado a MongoDB - Historial de Pedidos'))
  .catch(err => console.error('❌ Error MongoDB:', err));

const Pedido = mongoose.model('Pedido', new mongoose.Schema({
  idPedido: String,
  tienda: String,
  fecha: String,
  totalArticulos: Number,
  items: Array
}));

// ==========================================
// 2. MEMORIA VOLÁTIL (Para Reservas Dinámicas)
// ==========================================
// Estructura: { idDelSocket: { idDeLaGorra: cantidad } }
let reservasPorCliente = {};
let reservasGlobales = {};

// Función que suma todas las reservas de todas las tiendas conectadas
const recalcularReservasGlobales = () => {
  reservasGlobales = {};
  for (const socketId in reservasPorCliente) {
    const reservasDelSocket = reservasPorCliente[socketId];
    for (const idGorra in reservasDelSocket) {
      if (!reservasGlobales[idGorra]) reservasGlobales[idGorra] = 0;
      reservasGlobales[idGorra] += reservasDelSocket[idGorra];
    }
  }
  // Dispara el aviso a todas las tiendas para que actualicen sus números rojos/azules
  io.emit('reservas_actualizadas', reservasGlobales);
};

// ==========================================
// 3. EVENTOS WEBSOCKET
// ==========================================
io.on('connection', (socket) => {
  console.log('🔌 Cliente conectado a Pedidos:', socket.id);
  
  // Apenas entra una tienda, le mandamos cómo está el inventario reservado
  socket.emit('reservas_actualizadas', reservasGlobales);

  // EVENTO A: La tienda le da al botón de "+" o "-"
  socket.on('modificar_reserva', ({ idGorra, nuevaCantidad }) => {
    if (!reservasPorCliente[socket.id]) reservasPorCliente[socket.id] = {};
    
    if (nuevaCantidad === 0) {
      delete reservasPorCliente[socket.id][idGorra];
    } else {
      reservasPorCliente[socket.id][idGorra] = nuevaCantidad;
    }
    recalcularReservasGlobales();
  });

  // EVENTO B: La tienda vacía el carrito
  socket.on('limpiar_carrito', () => {
    delete reservasPorCliente[socket.id];
    recalcularReservasGlobales();
  });

  // EVENTO C: LA TIENDA ENVÍA EL PEDIDO AL ALMACÉN
  socket.on('nuevo_pedido', async (ticket) => {
    try {
      // 1. Lo guardamos en MongoDB (Para tus gráficas de analítica)
      await Pedido.create(ticket);
      
      // 2. Se lo aventamos al Almacén para que suene la alerta
      io.emit('pedido_recibido', ticket);
      
      // 3. Como ya lo compraron, liberamos esas reservas de la memoria temporal
      delete reservasPorCliente[socket.id];
      recalcularReservasGlobales();
      
      console.log("📦 Pedido procesado exitosamente:", ticket.idPedido);
    } catch (error) {
      console.error("❌ Error al procesar pedido:", error);
    }
  });

  // EVENTO D: Prevención de desastres (Si la tienda cierra la pestaña de golpe)
  socket.on('disconnect', () => {
    console.log('❌ Cliente desconectado:', socket.id);
    // Le quitamos todas las gorras que tenía acaparadas en su carrito
    delete reservasPorCliente[socket.id];
    recalcularReservasGlobales();
  });
});

// Arrancar servidor
server.listen(3001, () => {
  console.log(`🚀 Servidor ms-pedidos corriendo en http://localhost:3001`);
});