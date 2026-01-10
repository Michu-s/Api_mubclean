// routes/marketplace.routes.js
const express = require('express');
const router = express.Router();
const { proteger } = require('../middleware/auth.middleware');
const { getPerfilNegocioPublico, getAllNegocios } = require('../controllers/marketplace.controller');

/**
 * @swagger
 * tags:
 *   name: Marketplace
 *   description: Endpoints para visualizar perfiles públicos de negocios.
 */

/**
 * @swagger
 * /api/v1/marketplace:
 *   get:
 *     summary: Lista todos los negocios disponibles en la plataforma
 *     tags: [Marketplace]
 *     description: Devuelve una lista de todos los negocios con su información básica para ser mostrados en tarjetas.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       '200':
 *         description: Un array de negocios.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id: { type: 'string', format: 'uuid' }
 *                   nombre: { type: 'string' }
 *                   descripcion: { type: 'string' }
 *                   url_logo: { type: 'string', format: 'uri' }
 */
router.get('/', proteger, getAllNegocios);

/**
 * @swagger
 * /api/v1/marketplace/negocios/{id}:
 *   get:
 *     summary: Obtiene el perfil público de un negocio
 *     tags: [Marketplace]
 *     description: Devuelve la información pública de un negocio, incluyendo su perfil, galería, servicios y métodos de pago. Requiere autenticación de cliente.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: El ID del negocio a consultar.
 *     responses:
 *       '200':
 *         description: Perfil público del negocio.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 perfil:
 *                   type: object
 *                   properties:
 *                     id: { type: 'string', format: 'uuid' }
 *                     nombre: { type: 'string' }
 *                     descripcion: { type: 'string' }
 *                     url_logo: { type: 'string', format: 'uri' }
 *                     url_banner: { type: 'string', format: 'uri' }
 *                     telefono_contacto: { type: 'string' }
 *                     email_contacto: { type: 'string', format: 'email' }
 *                 galeria:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id: { type: 'string', format: 'uuid' }
 *                       url_imagen: { type: 'string', format: 'uri' }
 *                       descripcion: { type: 'string' }
 *                 servicios:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id: { type: 'integer' }
 *                       nombre: { type: 'string' }
 *                       descripcion: { type: 'string' }
 *                 metodos_pago:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id: { type: 'integer' }
 *                       nombre: { type: 'string' }
 *       '404':
 *         description: Negocio no encontrado.
 */
router.get('/negocios/:id', proteger, getPerfilNegocioPublico);

module.exports = router;
