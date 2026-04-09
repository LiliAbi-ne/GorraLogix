const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();
const PORT = 3003;

app.use(cors());
app.use(express.json());

// Conexión a su propia base de datos (Filosofía Microservicios)
mongoose.connect('mongodb://127.0.0.1:27017/almacen_usuarios')
  .then(() => console.log('Conectado a MongoDB - Usuarios'))
  .catch(err => console.error('Error de conexión:', err));

// 1. Modelo de Usuario
const usuarioSchema = new mongoose.Schema({
  usuario: { type: String, required: true, unique: true },
  password: { type: String, required: true }, // En un proyecto real esto iría encriptado
  rol: { type: String, required: true, enum: ['tienda', 'almacen'] }
});
const Usuario = mongoose.model('Usuario', usuarioSchema);

// 2. Función para crear usuarios de prueba automáticamente
const inicializarUsuarios = async () => {
  try {
    const cantidad = await Usuario.countDocuments();
    if (cantidad === 0) {
      await Usuario.create([
        { usuario: 'tiendacentro', password: '123', rol: 'tienda' },
        { usuario: 'admin', password: 'admin123', rol: 'almacen' },
        { usuario: 'tienda_norte', password: '123', rol: 'tienda' },
      ]);
      console.log('✅ Cuentas de prueba creadas (tiendacentro y admin)');
    }
  } catch (error) {
    console.log('Error al crear usuarios:', error);
  }
};
inicializarUsuarios();

// 3. Ruta de Login
app.post('/api/login', async (req, res) => {
  const { usuario, password } = req.body;

  try {
    const user = await Usuario.findOne({ usuario: usuario, password: password });

    if (user) {
      // Si el usuario existe y la contraseña coincide, devolvemos sus datos (sin la contraseña)
      res.json({ exito: true, usuario: user.usuario, rol: user.rol });
    } else {
      res.status(401).json({ exito: false, mensaje: 'Credenciales incorrectas' });
    }
  } catch (error) {
    res.status(500).json({ exito: false, mensaje: 'Error en el servidor' });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor de Usuarios corriendo en http://localhost:${PORT}`);
});