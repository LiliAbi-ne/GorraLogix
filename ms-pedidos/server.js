const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "http://localhost:5173", methods: ["GET", "POST"] }
});

// MEMORIA RAM: { socketId: { gorraId: cantidadReservada } }
const reservasPorSocket = {};
// Temporizadores para la regla de los 60 minutos
const temporizadores = {};

// Función para sumar todas las reservas de todas las tiendas
const calcularReservasTotales = () => {
    const totales = {};
    for (const socketId in reservasPorSocket) {
        for (const gorraId in reservasPorSocket[socketId]) {
            if (!totales[gorraId]) totales[gorraId] = 0;
            totales[gorraId] += reservasPorSocket[socketId][gorraId];
        }
    }
    return totales;
};

io.on('connection', (socket) => {
    console.log('Tienda conectada:', socket.id);
    reservasPorSocket[socket.id] = {}; // Le creamos un carrito vacío

    // Al conectarse, le enviamos cómo está el mapa de reservas actual
    socket.emit('reservas_actualizadas', calcularReservasTotales());

    // 1. Escuchar cuando una tienda presiona [+] o [-]
    socket.on('modificar_reserva', ({ idGorra, nuevaCantidad }) => {
        // Actualizamos su carrito personal en memoria
        reservasPorSocket[socket.id][idGorra] = nuevaCantidad;

        // --- REGLA DE LOS 60 MINUTOS ---
        if (temporizadores[socket.id]) clearTimeout(temporizadores[socket.id]);
        temporizadores[socket.id] = setTimeout(() => {
            console.log(`Carrito expirado (60min) para la tienda ${socket.id}`);
            reservasPorSocket[socket.id] = {}; // Le vaciamos el carrito
            io.emit('reservas_actualizadas', calcularReservasTotales()); // Avisamos al resto
            io.to(socket.id).emit('reserva_expirada'); // Le avisamos a esa tienda específica
        }, 60 * 60 * 1000); // 60 minutos en milisegundos

        // Avisamos a TODAS las tiendas del nuevo stock reservado
        io.emit('reservas_actualizadas', calcularReservasTotales());
    });

    // 2. Escuchar cuando se confirma el pedido final
    socket.on('nuevo_pedido', (pedido) => {
        // (Aquí luego agregaremos la lógica para avisarle al Almacén)
        io.emit('pedido_recibido', pedido);
    });

    // 3. Limpiar reservas automáticamente después de confirmar
    socket.on('limpiar_carrito', () => {
        reservasPorSocket[socket.id] = {};
        if (temporizadores[socket.id]) clearTimeout(temporizadores[socket.id]);
        io.emit('reservas_actualizadas', calcularReservasTotales());
    });

    // 4. Si la tienda cierra la pestaña, liberamos las gorras instantáneamente
    socket.on('disconnect', () => {
        console.log('Tienda desconectada, liberando sus reservas:', socket.id);
        delete reservasPorSocket[socket.id];
        if (temporizadores[socket.id]) clearTimeout(temporizadores[socket.id]);
        io.emit('reservas_actualizadas', calcularReservasTotales());
    });
});

server.listen(3001, () => {
    console.log('Microservicio de Pedidos (Socket.io) corriendo en puerto 3001');
});