// ms-pedidos/models/Pedido.js
const mongoose = require('mongoose');

const pedidoSchema = new mongoose.Schema({
  tienda: { type: String, required: true }, // Nombre o ID de la tienda que pide
  marcaGorra: { type: String, required: true },
  modeloGorra: { type: String, required: true },
  cantidad: { type: Number, default: 1 },
  estado: { type: String, default: 'Pendiente' }, // Puede ser Pendiente, Enviado, etc.
  fecha: { type: Date, default: Date.now },
  barcode: { type: String, required: true } // Para relacionar con el catálogo y facilitar la gestión
});

module.exports = mongoose.model('Pedido', pedidoSchema);