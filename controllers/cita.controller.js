// controllers/cita.controller.js
const supabase = require('../config/db');
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

    try {
        // Obtener cita actual
        const { data: currentCita, error: getErr } = await supabase.from('citas').select('*').eq('id', id_cita).single();
        if (getErr || !currentCita) return res.status(404).json({ msg: 'La cita no fue encontrada.' });

        const new_fecha_inicio = fecha_hora_inicio || currentCita.fecha_hora_inicio;
        const new_fecha_fin = fecha_hora_fin || currentCita.fecha_hora_fin;

        // Validación de conflictos: obtener citas asignadas al personal y verificar solapamientos
        if (personal_asignado && Array.isArray(personal_asignado) && personal_asignado.length > 0) {
            const { data: asignaciones, error: asigErr } = await supabase
                .from('citas_personal_asignado')
                .select('id_cita')
                .in('id_equipo', personal_asignado);
            if (asigErr) throw asigErr;

            const citaIds = (asignaciones || []).map(a => a.id_cita).filter(id => id !== id_cita);
            if (citaIds.length > 0) {
                const { data: citasConflicto, error: citasErr } = await supabase
                    .from('citas')
                    .select('id')
                    .in('id', citaIds)
                    .lt('fecha_hora_inicio', new_fecha_fin)
                    .gt('fecha_hora_fin', new_fecha_inicio);
                if (citasErr) throw citasErr;
                if (citasConflicto && citasConflicto.length > 0) {
                    return res.status(409).json({ msg: 'Conflicto: El nuevo personal ya está ocupado en el horario especificado.' });
                }
            }
        }

        // Actualizar la cita
        const { error: updateErr } = await supabase.from('citas').update({
            titulo: titulo || currentCita.titulo,
            fecha_hora_inicio: new_fecha_inicio,
            fecha_hora_fin: new_fecha_fin,
            notas_internas: notas_internas || currentCita.notas_internas
        }).eq('id', id_cita);
        if (updateErr) throw updateErr;

        // Re-asignar personal: eliminar y volver a insertar
        const { error: delErr } = await supabase.from('citas_personal_asignado').delete().eq('id_cita', id_cita);
        if (delErr) throw delErr;

        if (personal_asignado && Array.isArray(personal_asignado) && personal_asignado.length > 0) {
            const rows = personal_asignado.map(id_miembro => ({ id_cita, id_equipo: id_miembro }));
            const { error: insertErr } = await supabase.from('citas_personal_asignado').insert(rows);
            if (insertErr) throw insertErr;
        }

        res.json({ msg: 'Cita actualizada con éxito.' });
    } catch (error) {
        console.error('Error al actualizar la cita:', error);
        res.status(500).json({ msg: 'Error interno del servidor.' });
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
        const { data, error } = await supabase.from('citas').delete().eq('id', id).select();
        if (error) throw error;
        if (!data || data.length === 0) return res.status(404).json({ msg: 'Cita no encontrada.' });
        res.json({ msg: 'Cita eliminada con éxito.' });
    } catch (error) {
        console.error('Error al eliminar la cita:', error);
        res.status(500).json({ msg: 'Error interno del servidor.' });
    }
};