// ms-catalogo/models/Gorra.js
const mongoose = require('mongoose');

const gorraSchema = new mongoose.Schema({
  marca: { type: String, required: true },
  modelo: { type: String, required: true },
  stock: { type: Number, default: 0 },
  imagenUrl: { type: String, required: true },
  barcode: { type: String, required:true }

});

module.exports = mongoose.model('Gorra', gorraSchema);