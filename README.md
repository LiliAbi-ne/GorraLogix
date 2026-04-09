# 📦 Sistema de Gestión de Almacén y Tiendas (Microservicios)

Plataforma de logística interna con sincronización de inventario en tiempo real.

## 🚀 Tecnologías Utilizadas
* **Frontend:** React, Tailwind CSS, Socket.io-client, XLSX (Exportación a Excel)
* **Backend (Microservicios):** Node.js, Express, Multer (Manejo de archivos), Socket.io
* **Base de Datos:** MongoDB

## 📋 Requisitos Previos
Para ejecutar este proyecto en tu máquina local, necesitas tener instalado:
1. [Node.js](https://nodejs.org/) (Versión 18 o superior)
2. [MongoDB Compass](https://www.mongodb.com/products/compass) (Corriendo en `mongodb://localhost:27017`)

## ⚙️ Instalación y Configuración

Clona este repositorio en tu computadora:
\`\`\`bash
git clone link del repositorio
\`\`\`

El proyecto está dividido en 3 partes independientes. Debes abrir **3 terminales separadas**, entrar a cada carpeta e instalar las dependencias:

**1. Microservicio de Catálogo (Puerto 3002)**
\`\`\`bash
cd ms-catalogo
npm install
\`\`\`

**2. Microservicio de Pedidos / WebSockets (Puerto 3001)**
\`\`\`bash
cd ms-pedidos
npm install
\`\`\`

**3. Frontend (Puerto 5173)**
\`\`\`bash
cd frontend
npm install
\`\`\`

**4. Microservicio de Usuarios (Puerto 3003)**
\`\`\`bash
cd ms-usuarios
npm install
npm run dev
\`\`\`

## 🏃‍♂️ Cómo ejecutar el proyecto

Una vez instaladas las dependencias, debes levantar los tres servidores al mismo tiempo (usando tus 3 terminales):

1. En la terminal de `ms-catalogo` ejecuta: `npm run dev` (o `node server.js`)
2. En la terminal de `ms-pedidos` ejecuta: `npm run dev` (o `node server.js`)
3. En la terminal de `frontend` ejecuta: `npm run dev`
4. En la terminal de `ms-usuarios` ejecuta: `npm run dev` (o `node server.js`)

Al iniciar el `ms-catalogo` por primera vez, la base de datos se inicializará automáticamente con gorras de prueba en MongoDB.

## 👥 Equipo de Desarrollo
* Abril Contreras
* Miguel Rosado
* Fernando Sanchez
* Juan Kau
* Luis Canul