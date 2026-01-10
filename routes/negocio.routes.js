// routes/negocio.routes.js
const express = require('express');
const router = express.Router();
const { proteger, esAdmin } = require('../middleware/auth.middleware');
const negocioController = require('../controllers/negocio.controller');

/**
 * @swagger
 * tags:
 *   name: Negocio
 *   description: Endpoints para la gestión completa del perfil, equipo, servicios y otros recursos del negocio.
 */

// Todas las rutas en este archivo requieren autenticación y rol de administrador.
router.use(proteger, esAdmin);

// --- Perfil del Negocio ---

/**
 * @swagger
 * /api/v1/negocio:
 *   get:
 *     summary: (Admin) Obtiene el perfil completo del negocio en contexto
 *     tags: [Negocio]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: 'Perfil del negocio.' }
 *   put:
 *     summary: (Admin) Actualiza el perfil del negocio
 *     tags: [Negocio]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nombre: { type: 'string' }
 *               telefono_contacto: { type: 'string' }
 *               email_contacto: { type: 'string', format: 'email' }
 *               descripcion: { type: 'string' }
 *               url_logo: { type: 'string', format: 'uri' }
 *               url_banner: { type: 'string', format: 'uri' }
 *     responses:
 *       200: { description: 'Perfil del negocio actualizado con éxito.' }
 */
router.route('/')
    .get(negocioController.getNegocio)
    .put(negocioController.updateNegocio);

// --- Gestión de Equipo ---

/**
 * @swagger
 * /api/v1/negocio/equipo:
 *   get:
 *     summary: (Admin) Lista todos los miembros del equipo del negocio
 *     tags: [Negocio]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: 'Lista de miembros del equipo.' }
 *   post:
 *     summary: (Admin) Agrega un nuevo miembro al equipo
 *     tags: [Negocio]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [nombre_completo, email]
 *             properties:
 *               nombre_completo: { type: 'string' }
 *               email: { type: 'string', format: 'email' }
 *               telefono: { type: 'string' }
 *               dias_laborales: { type: 'string', description: 'JSON string for work days e.g., ["Lunes", "Martes"]' }
 *     responses:
 *       201: { description: 'Miembro del equipo creado con éxito.' }
 */
router.route('/equipo')
    .get(negocioController.getTeam)
    .post(negocioController.addMember);

/**
 * @swagger
 * /api/v1/negocio/equipo/{id}:
 *   delete:
 *     summary: (Admin) Desactiva un miembro del equipo (Soft Delete)
 *     tags: [Negocio]
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' } }]
 *     responses:
 *       200: { description: 'Miembro del equipo desactivado.' }
 */
router.route('/equipo/:id')
    .delete(negocioController.deleteMember);

/**
 * @swagger
 * /api/v1/negocio/equipo-disponible:
 *   get:
 *     summary: (Admin) Obtiene miembros del equipo disponibles para un rango de fechas
 *     tags: [Negocio]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: fecha_hora_inicio
 *         required: true
 *         schema: { type: 'string', format: 'date-time' }
 *       - in: query
 *         name: fecha_hora_fin
 *         required: true
 *         schema: { type: 'string', format: 'date-time' }
 *     responses:
 *       200: { description: 'Lista de miembros disponibles.' }
 */
router.get('/equipo-disponible', negocioController.getEquipoDisponible);

/**
 * @swagger
 * /api/v1/negocio/citas:
 *   get:
 *     summary: (Admin) Lista todas las citas programadas del negocio
 *     tags: [Negocio]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Una lista de todas las citas del negocio.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                     format: uuid
 *                     description: ID de la cita.
 *                   fecha_hora_inicio:
 *                     type: string
 *                     format: date-time
 *                     description: Fecha y hora de inicio de la cita.
 *                   fecha_hora_fin:
 *                     type: string
 *                     format: date-time
 *                     description: Fecha y hora de finalización de la cita.
 *                   titulo:
 *                     type: string
 *                     description: Título o descripción corta de la cita.
 *                   id_solicitud:
 *                     type: string
 *                     format: uuid
 *                     description: ID de la solicitud de servicio asociada, para redirección.
 *                   nombre_cliente:
 *                     type: string
 *                     description: Nombre completo del cliente.
 *                   servicio_calle:
 *                     type: string
 *                     description: Calle donde se realizará el servicio.
 *                   servicio_ciudad:
 *                     type: string
 *                     description: Ciudad donde se realizará el servicio.
 *                   nombre_estado:
 *                     type: string
 *                     description: Estado actual de la solicitud.
 *                   personal:
 *                     type: array
 *                     items:
 *                       type: string
 *                     description: Nombres de los empleados asignados a la cita.
 */
router.get('/citas', proteger, esAdmin, negocioController.getCitasNegocio);

// --- Catálogos (Tipos de Servicio) ---

/**
 * @swagger
 * /api/v1/negocio/tipos-servicio:
 *   get:
 *     summary: (Admin) Lista todos los tipos de servicio del negocio
 *     tags: [Negocio]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: 'Lista de tipos de servicio.' }
 *   post:
 *     summary: (Admin) Crea un nuevo tipo de servicio
 *     tags: [Negocio]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [nombre, descripcion]
 *             properties:
 *               nombre: { type: 'string' }
 *               descripcion: { type: 'string' }
 *               url_imagen: { type: 'string', format: 'uri', description: 'URL de la imagen representativa del servicio.' }
 *     responses:
 *       201: { description: 'Tipo de servicio creado.' }
 */
router.route('/tipos-servicio')
    .get(negocioController.getTiposServicio)
    .post(negocioController.createTipoServicio);

/**
 * @swagger
 * /api/v1/negocio/tipos-servicio/{id}:
 *   put:
 *     summary: (Admin) Actualiza un tipo de servicio
 *     tags: [Negocio]
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'integer' } }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nombre: { type: 'string' }
 *               descripcion: { type: 'string' }
 *               url_imagen: { type: 'string', format: 'uri', description: 'URL de la nueva imagen para el servicio.' }
 *     responses:
 *       200: { description: 'Tipo de servicio actualizado.' }
 *   delete:
 *     summary: (Admin) Elimina un tipo de servicio
 *     tags: [Negocio]
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'integer' } }]
 *     responses:
 *       200: { description: 'Tipo de servicio eliminado.' }
 */
router.route('/tipos-servicio/:id')
    .put(negocioController.updateTipoServicio)
    .delete(negocioController.deleteTipoServicio);

// --- Gestión de Métodos de Pago ---

/**
 * @swagger
 * /api/v1/negocio/metodos-pago:
 *   get:
 *     summary: (Admin) Lista los métodos de pago aceptados por el negocio
 *     tags: [Negocio]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: 'Lista de métodos de pago.' }
 *   post:
 *     summary: (Admin) Crea un nuevo método de pago para el negocio
 *     tags: [Negocio]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [nombre]
 *             properties:
 *               nombre: { type: 'string', description: 'Nombre del nuevo método de pago.' }
 *     responses:
 *       201: { description: 'Método de pago creado con éxito.' }
 */
router.route('/metodos-pago')
    .get(negocioController.getMetodosPago)
    .post(negocioController.createMetodoPago);

/**
 * @swagger
 * /api/v1/negocio/metodos-pago/{id}:
 *   delete:
 *     summary: (Admin) Deshabilita un método de pago para el negocio
 *     tags: [Negocio]
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'integer', description: 'ID del método de pago a deshabilitar.' } }]
 *     responses:
 *       200: { description: 'Método de pago deshabilitado.' }
 */
router.route('/metodos-pago/:id')
    .delete(negocioController.deleteMetodoPago);

// --- Gestión de Galería ---

/**
 * @swagger
 * /api/v1/negocio/galeria:
 *   get:
 *     summary: (Admin) Obtiene la galería de imágenes del negocio
 *     tags: [Negocio]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: 'Lista de imágenes de la galería.' }
 *   post:
 *     summary: (Admin) Agrega una nueva imagen a la galería
 *     tags: [Negocio]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [id_imagen]
 *             properties:
 *               id_imagen: { type: 'string', format: 'uuid' }
 *               orden: { type: 'integer' }
 *     responses:
 *       201: { description: 'Imagen agregada a la galería.' }
 */
router.route('/galeria')
    .get(negocioController.getGaleria)
    .post(negocioController.addImagenGaleria);

/**
 * @swagger
 * /api/v1/negocio/galeria/{id}:
 *   delete:
 *     summary: (Admin) Elimina una imagen de la galería
 *     tags: [Negocio]
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid', description: 'ID de la entrada en la tabla de galería, no el ID de la imagen.' } }]
 *     responses:
 *       200: { description: 'Imagen eliminada de la galería.' }
 */
router.delete('/galeria/:id', negocioController.deleteImagenGaleria);

module.exports = router;