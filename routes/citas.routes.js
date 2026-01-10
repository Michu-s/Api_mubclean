// routes/citas.routes.js
const express = require('express');
const router = express.Router();
const { proteger, esAdmin } = require('../middleware/auth.middleware');
const { updateCita, deleteCita } = require('../controllers/cita.controller');

/**
 * @swagger
 * tags:
 *   name: Citas
 *   description: Endpoints para la gestión directa de citas (actualizar y eliminar).
 */

/**
 * @swagger
 * /api/v1/citas/{id}:
 *   put:
 *     summary: (Admin) Actualiza una cita existente
 *     tags: [Citas]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: 'string', format: 'uuid' }
 *         description: El ID de la cita a actualizar.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               titulo: { type: 'string' }
 *               fecha_hora_inicio: { type: 'string', format: 'date-time' }
 *               fecha_hora_fin: { type: 'string', format: 'date-time' }
 *               notas_internas: { type: 'string' }
 *               personal_asignado: { type: 'array', items: { type: 'string', format: 'uuid' } }
 *     responses:
 *       200: { description: 'Cita actualizada con éxito.' }
 *       404: { description: 'Cita no encontrada.' }
 *       409: { description: 'Conflicto de horario con el personal asignado.' }
 *   delete:
 *     summary: (Admin) Elimina una cita
 *     tags: [Citas]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: 'string', format: 'uuid' }
 *         description: El ID de la cita a eliminar.
 *     responses:
 *       200: { description: 'Cita eliminada con éxito.' }
 *       404: { description: 'Cita no encontrada.' }
 */
router.route('/:id')
    .put(proteger, esAdmin, updateCita)
    .delete(proteger, esAdmin, deleteCita);

module.exports = router;
