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
        url: `http://localhost:${process.env.PORT || 3000}`,
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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
  console.log(`📚 Documentación de API disponible en http://localhost:${PORT}/api-docs`);
});
