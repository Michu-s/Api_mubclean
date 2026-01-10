// controllers/cita.controller.js
const pool = require('../config/db');
const { v4: uuidv4 } = require('uuid');

/**
 * @description Actualiza una cita existente, reasignando personal y validando disponibilidad.
 * @route PUT /api/v1/citas/:id
 * @access Privado (Admin)
 */
exports.updateCita = async (req, res) => {
    const { id: id_cita } = req.params;
    const { titulo, fecha_hora_inicio, fecha_hora_fin, notas_internas, personal_asignado } = req.body;

    if (!titulo && !fecha_hora_inicio && !fecha_hora_fin && !notas_internas && !personal_asignado) {
        return res.status(400).json({ msg: 'Debe proporcionar al menos un campo para actualizar.' });
    }

    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        // Obtener datos actuales de la cita para no sobrescribir con null si no se envían
        const [currentCitaRows] = await connection.execute('SELECT * FROM citas WHERE id = ?', [id_cita]);
        if (currentCitaRows.length === 0) {
            await connection.rollback();
            return res.status(404).json({ msg: 'La cita no fue encontrada.' });
        }
        const currentCita = currentCitaRows[0];

        const new_fecha_inicio = fecha_hora_inicio || currentCita.fecha_hora_inicio;
        const new_fecha_fin = fecha_hora_fin || currentCita.fecha_hora_fin;

        // Validación de conflictos para el nuevo personal en el nuevo horario, excluyendo la cita actual
        if (personal_asignado && Array.isArray(personal_asignado) && personal_asignado.length > 0) {
            const placeholders = personal_asignado.map(() => '?').join(',');
            const validationQuery = `
                SELECT COUNT(*) as conflict_count
                FROM citas c
                JOIN citas_personal_asignado cpa ON c.id = cpa.id_cita
                WHERE cpa.id_equipo IN (${placeholders})
                  AND (c.fecha_hora_inicio < ? AND c.fecha_hora_fin > ?)
                  AND c.id != ? 
            `;
            const validationParams = [...personal_asignado, new_fecha_fin, new_fecha_inicio, id_cita];
            const [validationRows] = await connection.execute(validationQuery, validationParams);

            if (validationRows[0].conflict_count > 0) {
                await connection.rollback();
                return res.status(409).json({ msg: 'Conflicto: El nuevo personal ya está ocupado en el horario especificado.' });
            }
        }

        // Actualizar la cita
        const updateQuery = 'UPDATE citas SET titulo = ?, fecha_hora_inicio = ?, fecha_hora_fin = ?, notas_internas = ? WHERE id = ?';
        await connection.execute(updateQuery, [
            titulo || currentCita.titulo,
            new_fecha_inicio,
            new_fecha_fin,
            notas_internas || currentCita.notas_internas,
            id_cita
        ]);

        // Re-asignar personal
        await connection.execute('DELETE FROM citas_personal_asignado WHERE id_cita = ?', [id_cita]);
        if (personal_asignado && Array.isArray(personal_asignado) && personal_asignado.length > 0) {
            const asignacionQuery = 'INSERT INTO citas_personal_asignado (id_cita, id_equipo) VALUES ?';
            const asignacionValues = personal_asignado.map(id_miembro => [id_cita, id_miembro]);
            await connection.query(asignacionQuery, [asignacionValues]);
        }

        await connection.commit();
        res.json({ msg: 'Cita actualizada con éxito.' });

    } catch (error) {
        await connection.rollback();
        console.error('Error al actualizar la cita:', error);
        res.status(500).json({ msg: 'Error interno del servidor.' });
    } finally {
        if (connection) connection.release();
    }
};

/**
 * @description Elimina una cita.
 * @route DELETE /api/v1/citas/:id
 * @access Privado (Admin)
 */
exports.deleteCita = async (req, res) => {
    const { id } = req.params;

    try {
        // La BD se encarga de borrar en cascada en `citas_personal_asignado`
        const [result] = await pool.execute('DELETE FROM citas WHERE id = ?', [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ msg: 'Cita no encontrada.' });
        }

        res.json({ msg: 'Cita eliminada con éxito.' });

    } catch (error) {
        console.error('Error al eliminar la cita:', error);
        res.status(500).json({ msg: 'Error interno del servidor.' });
    }
};