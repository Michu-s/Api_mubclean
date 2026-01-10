// routes/solicitud.routes.js
const express = require('express');
const router = express.Router();
const { proteger, esAdmin } = require('../middleware/auth.middleware');

// Importamos el controlador. Asumimos que todas las funciones requeridas están exportadas desde aquí.
const solicitudController = require('../controllers/solicitud.controller');

/**
 * @swagger
 * tags:
 *   name: Solicitudes
 *   description: Flujo principal de solicitudes de servicio, desde la creación hasta la gestión.
 */

// Todas las rutas en este archivo requieren que el usuario esté logueado.
router.use(proteger);

// --- Rutas Principales de Solicitud ---

/**
 * @swagger
 * /api/v1/solicitudes:
 *   get:
 *     summary: Lista solicitudes (Admins ven las de su negocio, Clientes ven su historial global)
 *     tags: [Solicitudes]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: 'Lista de solicitudes.' }
 *   post:
 *     summary: (Cliente) Crea una nueva solicitud de servicio
 *     tags: [Solicitudes]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateSolicitudInput'
 *     responses:
 *       201: { description: 'Solicitud creada con éxito.' }
 */
router.route('/')
    .get(solicitudController.getSolicitudes)
    .post(solicitudController.createSolicitud);

/**
 * @swagger
 * /api/v1/solicitudes/{id}:
 *   get:
 *     summary: Obtiene el detalle completo de una solicitud
 *     tags: [Solicitudes]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: 'string', format: 'uuid' }
 *     responses:
 *       200: { description: 'Detalle de la solicitud.' }
 *       403: { description: 'No tienes permiso para ver esta solicitud.' }
 *       404: { description: 'Solicitud no encontrada.' }
 */
router.get('/:id', solicitudController.getSolicitudById);

// --- Rutas de Gestión (Admin) ---

/**
 * @swagger
 * /api/v1/solicitudes/{id}/estado:
 *   put:
 *     summary: (Admin) Actualiza el estado de una solicitud
 *     tags: [Solicitudes]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: 'string', format: 'uuid' }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               id_estado: { type: 'integer', example: 2 }
 *     responses:
 *       200: { description: 'Estado actualizado.' }
 */
router.put('/:id/estado', esAdmin, solicitudController.updateEstadoSolicitud);

/**
 * @swagger
 * /api/v1/solicitudes/{id}/cotizacion:
 *   post:
 *     summary: (Admin) Crea una cotización estandarizada para una solicitud
 *     tags: [Solicitudes]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: 'string', format: 'uuid' }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [lineas]
 *             properties:
 *               detalles:
 *                 type: string
 *                 description: "Notas o texto general de la cotización."
 *                 example: "El servicio se realizará en 2 etapas."
 *               moneda:
 *                 type: string
 *                 description: "La moneda de la cotización."
 *                 example: "MXN"
 *                 default: "MXN"
 *               lineas:
 *                 type: array
 *                 description: "Arreglo con el desglose de cada partida de la cotización."
 *                 items:
 *                   type: object
 *                   required: [descripcion, cantidad, precio_unitario]
 *                   properties:
 *                     id_detalle_solicitud:
 *                       type: string
 *                       format: uuid
 *                       description: "Opcional. Vincula la línea a un detalle específico de la solicitud original."
 *                     descripcion:
 *                       type: string
 *                       example: "Limpieza de sofá de 3 plazas"
 *                     cantidad:
 *                       type: integer
 *                       example: 1
 *                     precio_unitario:
 *                       type: number
 *                       format: float
 *                       example: 850.00
 *     responses:
 *       201: { description: 'Cotización creada y enviada con éxito.' }
 */
router.post('/:id/cotizacion', esAdmin, solicitudController.createCotizacion);

/**
 * @swagger
 * /api/v1/solicitudes/cotizaciones/{id}/responder:
 *   put:
 *     summary: (Cliente) Acepta o rechaza una cotización
 *     tags: [Solicitudes]
 *     description: Permite al cliente responder a una cotización. Esta acción es final y actualiza el estado tanto de la cotización como de la solicitud de servicio.
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: El ID de la cotización a la que se va a responder.
 *         schema: { type: 'string', format: 'uuid' }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - accion
 *             properties:
 *               accion:
 *                 type: string
 *                 description: La acción a realizar.
 *                 enum: [aceptar, rechazar]
 *               motivo_rechazo:
 *                 type: string
 *                 description: "Opcional. Requerido si la acción es 'rechazar'."
 *     responses:
 *       '200':
 *         description: Cotización respondida con éxito.
 *       '400':
 *         description: Error de validación (ej. falta la acción o el motivo de rechazo).
 *       '403':
 *         description: El usuario no tiene permiso para responder a esta cotización.
 *       '404':
 *         description: Cotización no encontrada.
 *       '409':
 *         description: Conflicto, la cotización ya ha sido respondida.
 */
router.put('/cotizaciones/:id/responder', solicitudController.responderCotizacion);

/**
 * @swagger
 * /api/v1/solicitudes/{id}/citas:
 *   post:
 *     summary: (Admin) Agenda una cita para una solicitud
 *     tags: [Solicitudes]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: 'string', format: 'uuid' }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               fecha_cita: { type: 'string', format: 'date-time' }
 *               id_equipo: { type: 'string', format: 'uuid' }
 *     responses:
 *       201: { description: 'Cita agendada.' }
 */
router.post('/:id/citas', esAdmin, solicitudController.createCita);

/**
 * @swagger
 * /api/v1/solicitudes/{id}/pagos:
 *   post:
 *     summary: (Admin) Registra un pago para una solicitud
 *     tags: [Solicitudes]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: 'string', format: 'uuid' }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               monto: { type: 'number', format: 'float' }
 *               id_metodo_pago: { type: 'integer' }
 *     responses:
 *       201: { description: 'Pago registrado.' }
 */
router.post('/:id/pagos', esAdmin, solicitudController.createPago);

/**
 * @swagger
 * /api/v1/solicitudes/{id}/incidentes:
 *   post:
 *     summary: Reporta un incidente en una solicitud (Cliente o Admin)
 *     tags: [Solicitudes]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: 'string', format: 'uuid' }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               descripcion: { type: 'string' }
 *     responses:
 *       201: { description: 'Incidente reportado.' }
 */
router.post('/:id/incidentes', solicitudController.createIncidente);

/**
 * @swagger
 * /api/v1/solicitudes/incidentes/{id}:
 *   put:
 *     summary: (Admin) Actualiza el estado de un incidente
 *     tags: [Solicitudes]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: 'string', format: 'uuid' }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               estado: { type: 'string', example: 'Resuelto' }
 *     responses:
 *       200: { description: 'Incidente actualizado.' }
 */
router.put('/incidentes/:id', esAdmin, solicitudController.updateIncidente);


// --- Schemas reutilizables para Swagger ---
/**
 * @swagger
 * components:
 *   schemas:
 *     CreateSolicitudInput:
 *       type: object
 *       required: ["id_negocio", "id_tipo_servicio", "direccion_servicio"]
 *       properties:
 *         id_negocio: { type: 'string', format: 'uuid' }
 *         id_tipo_servicio: { type: 'integer' }
 *         id_metodo_pago_preferido: { type: 'integer' }
 *         fecha_deseada: { type: 'string', format: 'date-time' }
 *         es_urgente: { type: 'boolean' }
 *         direccion_servicio:
 *           type: object
 *           required: ["calle", "ciudad", "estado"]
 *           properties:
 *             calle: { type: 'string', example: "Calle 60" }
 *             numero: { type: 'string', example: "400" }
 *             colonia: { type: 'string' }
 *             ciudad: { type: 'string' }
 *             estado: { type: 'string' }
 *             codigo_postal: { type: 'string' }
 *             referencias: { type: 'string' }
 *         detalles:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               descripcion: { type: 'string' }
 *               tipo_mueble: { type: 'string' }
 *               tamano_mueble: { type: 'string' }
 *               imagenes:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     url_imagen: { type: 'string', format: 'uri' }
 *                     tipo_mime: { type: 'string' }
 */
module.exports = router;