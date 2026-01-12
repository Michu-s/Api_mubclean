// index.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const swaggerJSDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const app = express();

// Middlewares básicos
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir archivos estáticos
app.use(express.static('public'));

// --- Configuración de Swagger ---
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'MubClean API',
      version: '1.0.0',
      description: 'API RESTful para el SaaS de gestión de negocios de limpieza de muebles a domicilio.',
    },
    servers: [
      {
        // URL relativa para que Swagger funcione aunque el puerto cambie.
        url: '/',
        description: 'Servidor de Desarrollo'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        }
      }
    },
    security: [{
      bearerAuth: []
    }]
  },
  // Apunta a todos los archivos de rutas para encontrar la documentación
  apis: ['./routes/*.js'],
};

const swaggerSpec = swaggerJSDoc(swaggerOptions);

// --- Rutas de la API ---
// Ruta para la documentación de la API
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Importar y usar las rutas
const authRoutes = require('./routes/auth.routes');
const negocioRoutes = require('./routes/negocio.routes');
const clienteRoutes = require('./routes/cliente.routes');
const solicitudRoutes = require('./routes/solicitud.routes');
const citaRoutes = require('./routes/citas.routes');
const marketplaceRoutes = require('./routes/marketplace.routes');
const uploadRoutes = require('./routes/upload.routes');
const itemsRoutes = require('./routes/items.routes');

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/negocio', negocioRoutes);
app.use('/api/v1/clientes', clienteRoutes);
app.use('/api/v1/solicitudes', solicitudRoutes);
app.use('/api/v1/citas', citaRoutes);
app.use('/api/v1/marketplace', marketplaceRoutes);
app.use('/api/v1/uploads', uploadRoutes);
app.use('/api/v1/items', itemsRoutes);


// --- Manejo de Errores y Puerto ---
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('¡Algo salió mal!');
});

let PORT = Number(process.env.PORT) || 3000;
const MAX_PORT_TRIES = 10;

function startServer(port, remainingTries) {
  const server = app.listen(port, () => {
    PORT = port;
    process.env.PORT = String(PORT);
    console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
    console.log(`📚 Documentación de API disponible en http://localhost:${PORT}/api-docs`);
  });

  server.on('error', (err) => {
    if (err && err.code === 'EADDRINUSE') {
      if (remainingTries > 0) {
        const nextPort = port + 1;
        console.warn(`WARN: El puerto ${port} está en uso. Probando con ${nextPort}...`);
        return startServer(nextPort, remainingTries - 1);
      }
      console.error(
        `ERROR: No se encontró un puerto libre desde ${port - MAX_PORT_TRIES} hasta ${port}. ` +
          'Libera el puerto o define PORT=xxxx.'
      );
      process.exit(1);
    }

    console.error('Server error:', err);
    process.exit(1);
  });

  return server;
}

startServer(PORT, MAX_PORT_TRIES);
