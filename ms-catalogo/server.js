const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs'); // <-- NUEVO: Herramienta para renombrar y borrar archivos físicos
const multer = require('multer');
const Gorra = require('./models/Gorra');

// 1. Configuración de multer (ACTUALIZADO PARA USAR EL BARCODE)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, 'public', 'img'));
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    // Usamos el barcode para nombrar el archivo. Si tiene espacios, los cambiamos por guiones.
    const nombreBase = req.body.barcode ? req.body.barcode.replace(/\s+/g, '-') : Date.now();
    cb(null, `${nombreBase}${ext}`);
  }
});

const upload = multer({ storage });

const app = express();
const PORT = 3002;

// 2. Middlewares
app.use(cors());
app.use(express.json());
app.use('/img', express.static('public/img')); 

// 3. Conexión a MongoDB
mongoose.connect('mongodb://localhost:27017/almacen_catalogo')
  .then(() => console.log('Conectado a MongoDB - Catálogo'))
  .catch(err => console.error('Error al conectar a MongoDB:', err));

// ==========================================
// 4. RUTAS DEL SERVIDOR
// ==========================================

app.get('/', (req, res) => {
  res.send('Microservicio de Catálogo funcionando');
});

// GET: Obtener todo el catálogo
app.get('/api/gorras', async (req, res) => {
  try {
    const gorras = await Gorra.find();
    res.json(gorras);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener el catálogo' });
  }
});

// GET: Descargar la foto en alta calidad
app.get('/api/descargar/:imagenUrl', (req, res) => {
  const archivo = req.params.imagenUrl;
  const rutaFisica = path.join(__dirname, 'public', 'img', archivo);
  res.download(rutaFisica, `${archivo}`, (err) => {
    if (err) res.status(404).json({ error: 'Imagen no encontrada' });
  });
});

// POST: CREAR una nueva gorra
app.post('/api/gorras', upload.single('imagen'), async (req, res) => {
  try {
    const nuevaGorra = new Gorra({
      modelo: req.body.modelo,
      marca: req.body.marca,
      categoria: req.body.categoria,
      barcode: req.body.barcode,
      stock: req.body.stock,
      imagenUrl: req.file.filename 
    });
    
    await nuevaGorra.save();
    res.json({ exito: true, gorra: nuevaGorra });
  } catch (error) {
    console.error(error);
    res.status(500).json({ exito: false, mensaje: 'Error al subir la gorra' });
  }
});

// PUT: EDITAR una gorra existente (ACTUALIZADO CON MAGIA DE ARCHIVOS)
app.put('/api/gorras/:id', upload.single('imagen'), async (req, res) => {
  try {
    const gorraVieja = await Gorra.findById(req.params.id);
    if (!gorraVieja) return res.status(404).json({ exito: false, mensaje: 'No encontrada' });

    const datosActualizados = {
      modelo: req.body.modelo,
      marca: req.body.marca,
      categoria: req.body.categoria,
      barcode: req.body.barcode,
      stock: req.body.stock
    };

    let nuevaImagenUrl = gorraVieja.imagenUrl;

    // CASO 1: El administrador subió una FOTO NUEVA
    if (req.file) {
      nuevaImagenUrl = req.file.filename; // Toma el nuevo nombre
      
      // Borramos la foto vieja del disco duro para no llenarlo de basura
      const rutaVieja = path.join(__dirname, 'public', 'img', gorraVieja.imagenUrl);
      if (fs.existsSync(rutaVieja)) fs.unlinkSync(rutaVieja);
    } 
    // CASO 2: NO subió foto nueva, pero CAMBIÓ EL CÓDIGO DE BARRAS
    else if (gorraVieja.barcode !== req.body.barcode) {
      const ext = path.extname(gorraVieja.imagenUrl);
      const nuevoNombreFisico = `${req.body.barcode.replace(/\s+/g, '-')}${ext}`;
      
      const rutaFisicaVieja = path.join(__dirname, 'public', 'img', gorraVieja.imagenUrl);
      const rutaFisicaNueva = path.join(__dirname, 'public', 'img', nuevoNombreFisico);

      // Renombramos el archivo físico automáticamente
      if (fs.existsSync(rutaFisicaVieja)) {
        fs.renameSync(rutaFisicaVieja, rutaFisicaNueva);
        nuevaImagenUrl = nuevoNombreFisico; // Actualizamos la BD con el nuevo nombre
      }
    }

    datosActualizados.imagenUrl = nuevaImagenUrl;

    const gorraActualizada = await Gorra.findByIdAndUpdate(req.params.id, datosActualizados, { new: true });
    res.json({ exito: true, gorra: gorraActualizada });
  } catch (error) {
    console.error('Error al actualizar:', error);
    res.status(500).json({ exito: false, mensaje: 'Error al actualizar' });
  }
});

// DELETE: ELIMINAR una gorra (ACTUALIZADO PARA LIMPIAR EL DISCO)
app.delete('/api/gorras/:id', async (req, res) => {
  try {
    const gorraEliminada = await Gorra.findByIdAndDelete(req.params.id);
    if (!gorraEliminada) return res.status(404).json({ exito: false, mensaje: 'Gorra no encontrada' });

    // Cuando eliminas la gorra de la web, borramos su foto del disco duro
    const rutaFisica = path.join(__dirname, 'public', 'img', gorraEliminada.imagenUrl);
    if (fs.existsSync(rutaFisica)) fs.unlinkSync(rutaFisica);

    res.json({ exito: true, mensaje: 'Gorra y foto eliminadas correctamente' });
  } catch (error) {
    console.error('Error al eliminar:', error);
    res.status(500).json({ exito: false, mensaje: 'Error al eliminar' });
  }
});

// ==========================================
// 5. INICIALIZACIÓN Y ARRANQUE
// ==========================================



app.listen(PORT, () => {
  console.log(`✅ Servidor de Catálogo corriendo en http://localhost:${PORT}`);
});