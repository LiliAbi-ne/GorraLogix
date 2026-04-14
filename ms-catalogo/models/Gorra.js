// ms-catalogo/models/Gorra.js
const mongoose = require('mongoose');

const gorraSchema = new mongoose.Schema({
  modelo: { type: String, required: true },
  marca: { type: String, required: true },
  categoria: { type: String, required: true, enum: ['Trucker', 'Urbano', 'Deportivo'] }, 
  barcode: { type: String, required: true },
  stock: { type: Number, required: true },
  imagenUrl: { type: String, required: true }
});

module.exports = mongoose.model('Gorra', gorraSchema);