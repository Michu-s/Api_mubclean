// controllers/cliente.controller.js
const pool = require('../config/db');
const { v4: uuidv4 } = require('uuid');

// --- Operaciones de Perfil Global (Usuario) ---

// Obtiene el perfil del usuario logueado
exports.getMiPerfil = async (req, res) => {
    const { id: userId } = req.user;
    try {
        const [rows] = await pool.execute('SELECT id, nombre_completo, email, telefono, url_foto_perfil, fecha_creacion FROM usuarios WHERE id = ?', [userId]);
        if (rows.length === 0) {
            return res.status(404).json({ msg: 'Usuario no encontrado.' });
        }
        res.json(rows[0]);
    } catch (error) {
        console.error('Error en getMiPerfil:', error);
        res.status(500).json({ msg: 'Error interno del servidor' });
    }
};

// Actualiza el perfil del usuario logueado
exports.updateMiPerfil = async (req, res) => {
    const { id: userId } = req.user;
    const { nombre_completo, telefono, url_foto_perfil } = req.body;
    
    const fields = [];
    const values = [];

    if (nombre_completo) { fields.push('nombre_completo = ?'); values.push(nombre_completo); }
    if (telefono) { fields.push('telefono = ?'); values.push(telefono); }
    if (url_foto_perfil) { fields.push('url_foto_perfil = ?'); values.push(url_foto_perfil); }

    if (fields.length === 0) {
        return res.status(400).json({ msg: 'Proporcione al menos un campo para actualizar.' });
    }

    values.push(userId);

    try {
        const [result] = await pool.execute(`UPDATE usuarios SET ${fields.join(', ')} WHERE id = ?`, values);
        if (result.affectedRows === 0) {
            return res.status(404).json({ msg: 'Usuario no encontrado.' });
        }
        res.json({ msg: 'Perfil actualizado con éxito.' });
    } catch (error) {
        console.error('Error en updateMiPerfil:', error);
        res.status(500).json({ msg: 'Error interno del servidor' });
    }
};

// --- Gestión de Direcciones (Agnóstico al Negocio) ---

// Obtiene las direcciones del usuario para un negocio específico
exports.getDirecciones = async (req, res) => {
    const { id: id_usuario } = req.user;
    const { id_negocio } = req.query;

    if (!id_negocio) {
        return res.status(400).json({ msg: 'El parámetro "id_negocio" es obligatorio.' });
    }

    try {
        const [rows] = await pool.execute('SELECT * FROM direcciones WHERE id_usuario = ? AND id_negocio = ?', [id_usuario, id_negocio]);
        res.json(rows);
    } catch (error) {
        console.error('Error en getDirecciones:', error);
        res.status(500).json({ msg: 'Error interno del servidor' });
    }
};

// Crea una nueva dirección para el usuario asociada a un negocio
exports.createDireccion = async (req, res) => {
    const { id: id_usuario } = req.user;
    const { id_negocio, calle_y_numero, ciudad, estado, codigo_postal, colonia, referencias, es_predeterminada } = req.body;

    if (!id_negocio || !calle_y_numero || !ciudad || !estado) {
        return res.status(400).json({ msg: 'Los campos id_negocio, calle_y_numero, ciudad y estado son obligatorios.' });
    }

    try {
        const id_direccion = uuidv4();
        await pool.execute(
            'INSERT INTO direcciones (id, id_usuario, id_negocio, calle_y_numero, colonia, ciudad, estado, codigo_postal, referencias, es_predeterminada) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [id_direccion, id_usuario, id_negocio, calle_y_numero, colonia || null, ciudad, estado, codigo_postal || null, referencias || null, es_predeterminada || false]
        );
        res.status(201).json({ msg: 'Dirección creada con éxito', id_direccion });
    } catch (error) {
        console.error('Error en createDireccion:', error);
        res.status(500).json({ msg: 'Error interno del servidor' });
    }
};

// Actualiza una dirección existente del usuario
exports.updateDireccion = async (req, res) => {
    const { id: id_usuario } = req.user;
    const { id } = req.params;
    const { calle_y_numero, ciudad, estado, codigo_postal, colonia, referencias, es_predeterminada } = req.body;

    const fields = [];
    const values = [];

    if (calle_y_numero) { fields.push('calle_y_numero = ?'); values.push(calle_y_numero); }
    if (ciudad) { fields.push('ciudad = ?'); values.push(ciudad); }
    if (estado) { fields.push('estado = ?'); values.push(estado); }
    if (codigo_postal) { fields.push('codigo_postal = ?'); values.push(codigo_postal); }
    if (colonia) { fields.push('colonia = ?'); values.push(colonia); }
    if (referencias) { fields.push('referencias = ?'); values.push(referencias); }
    if (es_predeterminada !== undefined) { fields.push('es_predeterminada = ?'); values.push(es_predeterminada); }

    if (fields.length === 0) {
        return res.status(400).json({ msg: 'Proporcione al menos un campo para actualizar.' });
    }

    values.push(id, id_usuario);

    try {
        const [result] = await pool.execute(`UPDATE direcciones SET ${fields.join(', ')} WHERE id = ? AND id_usuario = ?`, values);
        if (result.affectedRows === 0) {
            return res.status(404).json({ msg: 'Dirección no encontrada o no tienes permiso para modificarla.' });
        }
        res.json({ msg: 'Dirección actualizada con éxito.' });
    } catch (error) {
        console.error('Error en updateDireccion:', error);
        res.status(500).json({ msg: 'Error interno del servidor' });
    }
};

// Elimina una dirección del usuario
exports.deleteDireccion = async (req, res) => {
    const { id: id_usuario } = req.user;
    const { id } = req.params;

    try {
        const [result] = await pool.execute('DELETE FROM direcciones WHERE id = ? AND id_usuario = ?', [id, id_usuario]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ msg: 'Dirección no encontrada o no tienes permiso para eliminarla.' });
        }
        res.json({ msg: 'Dirección eliminada con éxito.' });
    } catch (error) {
        console.error('Error en deleteDireccion:', error);
        res.status(500).json({ msg: 'Error interno del servidor' });
    }
};

// --- Funcionalidad Deprecada ---

// Obtiene la lista de negocios con los que el usuario ha interactuado a través de solicitudes de servicio
exports.getMisNegocios = async (req, res) => {
    const { id: id_cliente } = req.user;

    try {
        const [rows] = await pool.execute(`
            SELECT DISTINCT
                n.id,
                n.nombre,
                n.razon_social,
                n.rfc,
                n.email,
                n.telefono,
                n.url_logo,
                n.direccion,
                n.latitud,
                n.longitud,
                n.descripcion,
                n.fecha_creacion
            FROM
                negocios n
            JOIN
                solicitudes_servicio ss ON n.id = ss.id_negocio
            WHERE
                ss.id_cliente = ?
        `, [id_cliente]);

        if (rows.length === 0) {
            return res.status(404).json({ msg: 'No se encontraron negocios para este cliente.' });
        }

        res.json(rows);
    } catch (error) {
        console.error('Error en getMisNegocios:', error);
        res.status(500).json({ msg: 'Error interno del servidor' });
    }
};
