// routes/auth.routes.js
const express = require('express');
const router = express.Router();
const { proteger } = require('../middleware/auth.middleware');
const { registerAdmin, registerUser, login } = require('../controllers/auth.controller');

/**
 * @swagger
 * tags:
 *   name: Autenticación
 *   description: Endpoints para registro, inicio de sesión y gestión de contexto.
 */

/**
 * @swagger
 * /api/v1/auth/register:
 *   post:
 *     summary: Registrar Nuevo Administrador
 *     tags: [Autenticación]
 *     description: Crea un Usuario con rol de Administrador. El negocio se crea posteriormente.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [nombre_completo, email, password, telefono]
 *             properties:
 *               nombre_completo: { type: 'string' }
 *               email: { type: 'string', format: 'email' }
 *               password: { type: 'string', format: 'password' }
 *               telefono: { type: 'string' }
 *     responses:
 *       '201': { description: 'Administrador registrado con éxito.' }
 */
router.post('/register', registerAdmin);

/**
 * @swagger
 * /api/v1/auth/register-user:
 *   post:
 *     summary: Registrar Nuevo Usuario (Global)
 *     tags: [Autenticación]
 *     description: Registra un nuevo usuario en la plataforma. No lo vincula a ningún negocio.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [nombre_completo, email, password]
 *             properties:
 *               nombre_completo: { type: 'string' }
 *               email: { type: 'string', format: 'email' }
 *               password: { type: 'string', format: 'password' }
 *               telefono: { type: 'string' }
 *     responses:
 *       '201': { description: 'Usuario registrado con éxito.' }
 */
router.post('/register-user', registerUser);

/**
 * @swagger
 * /api/v1/auth/login:
 *   post:
 *     summary: Iniciar sesión (Detección automática de Rol y Contexto)
 *     tags: [Autenticación]
 *     description: Autentica al usuario y determina dinámicamente su rol y contexto de negocio.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: 'string', format: 'email' }
 *               password: { type: 'string', format: 'password' }
 *     responses:
 *       '200': { description: 'Inicio de sesión exitoso. Devuelve un token JWT.' }
 */
router.post('/login', login);

module.exports = router;