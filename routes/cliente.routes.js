// routes/cliente.routes.js
const express = require('express');
const router = express.Router();
const { proteger, esAdmin } = require('../middleware/auth.middleware');

// Se importan solo las funciones necesarias del controlador
const {
    getMiPerfil,
    updateMiPerfil,
    getMisNegocios,
    getDirecciones,
    createDireccion,
    updateDireccion,
    deleteDireccion,
} = require('../controllers/cliente.controller');

/**
 * @swagger
 * tags:
 *   name: Clientes
 *   description: Endpoints para la gestión de perfiles de cliente y operaciones de administrador.
 */

// Todas las rutas en este archivo requieren que el usuario esté logueado.
router.use(proteger);

// --- Rutas para el Cliente Logueado ---

/**
 * @swagger
 * /api/v1/clientes/me:
 *   get:
 *     summary: (Cliente) Obtiene su propio perfil de usuario global
 *     tags: [Clientes]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: 'Perfil del usuario logueado' }
 *   put:
 *     summary: (Cliente) Actualiza su propio perfil de usuario global
 *     tags: [Clientes]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nombre_completo: { type: 'string' }
 *               telefono: { type: 'string' }
 *               url_foto_perfil:
 *                 type: string
 *                 format: uri
 *                 description: "URL de la nueva foto de perfil."
 *     responses:
 *       200: { description: 'Perfil actualizado con éxito' }
 */
router.route('/me')
    .get(getMiPerfil)
    .put(updateMiPerfil);

/**
 * @swagger
 * /api/v1/clientes/mis-negocios:
 *   get:
 *     summary: (Cliente) Obtiene la lista de negocios a los que está vinculado
 *     tags: [Clientes]
 *     description: Devuelve una lista de todos los negocios de los que el usuario es cliente, para usar en la funcionalidad de "Cambiar de Contexto".
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       '200':
 *         description: Lista de negocios del cliente.
 */
router.get('/mis-negocios', getMisNegocios);

/**
 * @swagger
 * /api/v1/clientes/direcciones:
 *   get:
 *     summary: (Cliente) Obtiene sus direcciones para el negocio actual
 *     tags: [Clientes]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: 'Lista de direcciones para el negocio en contexto.' }
 *   post:
 *     summary: (Cliente) Crea una nueva dirección para el negocio actual
 *     tags: [Clientes]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/DireccionInput'
 *     responses:
 *       201: { description: 'Dirección creada con éxito' }
 */
router.route('/direcciones')
    .get(getDirecciones) // Ahora requiere id_negocio como query param
    .post(createDireccion); // Ahora requiere id_negocio en el body

/**
 * @swagger
 * /api/v1/clientes/direcciones/{id}:
 *   put:
 *     summary: (Cliente) Actualiza una de sus direcciones
 *     tags: [Clientes]
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' } }]
 *     requestBody:
 *       $ref: '#/components/requestBodies/DireccionUpdate'
 *     responses:
 *       200: { description: 'Dirección actualizada' }
 *   delete:
 *     summary: (Cliente) Elimina una de sus direcciones
 *     tags: [Clientes]
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' } }]
 *     responses:
 *       200: { description: 'Dirección eliminada' }
 */
router.route('/direcciones/:id')
    .put(updateDireccion)
    .delete(deleteDireccion);

// --- Schemas reutilizables para Swagger ---
/**
 * @swagger
 * components:
 *   schemas:
 *     DireccionInput:
 *       type: object
 *       required: [id_negocio, calle_y_numero, ciudad, estado]
 *       properties:
 *         id_negocio: { type: 'string', format: 'uuid', description: 'ID del negocio al que se asocia la dirección.' }
 *         calle_y_numero: { type: 'string' }
 *         colonia: { type: 'string' }
 *         ciudad: { type: 'string' }
 *         estado: { type: 'string' }
 *         codigo_postal: { type: 'string' }
 *         referencias: { type: 'string' }
 *         es_predeterminada: { type: 'boolean' }
 *   requestBodies:
 *     DireccionUpdate:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               calle_y_numero: { type: 'string' }
 *               colonia: { type: 'string' }
 *               ciudad: { type: 'string' }
 *               estado: { type: 'string' }
 *               codigo_postal: { type: 'string' }
 *               referencias: { type: 'string' }
 *               es_predeterminada: { type: 'boolean' }
 */

module.exports = router;