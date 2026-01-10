// controllers/negocio.controller.js
const pool = require('../config/db');
const { v4: uuidv4 } = require('uuid');

// --- Perfil del Negocio ---

exports.getNegocio = async (req, res) => {
    const { businessId } = req.user;
    try {
        const [rows] = await pool.execute('SELECT * FROM negocios WHERE id = ?', [businessId]);
        if (rows.length === 0) {
            return res.status(404).json({ msg: 'Negocio no encontrado.' });
        }
        res.json(rows[0]);
    } catch (error) {
        console.error('Error en getNegocio:', error);
        res.status(500).json({ msg: 'Error interno del servidor' });
    }
};

exports.updateNegocio = async (req, res) => {
    const { businessId } = req.user;
    const { nombre, telefono_contacto, email_contacto, descripcion, url_logo, url_banner } = req.body;
    
    const fields = [];
    const values = [];
    if (nombre) { fields.push('nombre = ?'); values.push(nombre); }
    if (telefono_contacto) { fields.push('telefono_contacto = ?'); values.push(telefono_contacto); }
    if (email_contacto) { fields.push('email_contacto = ?'); values.push(email_contacto); }
    if (descripcion) { fields.push('descripcion = ?'); values.push(descripcion); }
    if (url_logo) { fields.push('url_logo = ?'); values.push(url_logo); }
    if (url_banner) { fields.push('url_banner = ?'); values.push(url_banner); }

    if (fields.length === 0) {
        return res.status(400).json({ msg: 'No hay campos para actualizar.' });
    }
    
    values.push(businessId);
    const query = `UPDATE negocios SET ${fields.join(', ')} WHERE id = ?`;

    try {
        const [result] = await pool.execute(query, values);
        if (result.affectedRows === 0) {
            return res.status(404).json({ msg: 'Negocio no encontrado.' });
        }
        res.json({ msg: 'Perfil del negocio actualizado con éxito.' });
    } catch (error) {
        console.error('Error en updateNegocio:', error);
        res.status(500).json({ msg: 'Error interno del servidor' });
    }
};

// --- Gestión de Equipo ---

exports.getTeam = async (req, res) => {
    const { businessId } = req.user;
    try {
        const [rows] = await pool.execute('SELECT id, nombre_completo, email, telefono, dias_laborales, activo FROM equipo WHERE id_negocio = ?', [businessId]);
        res.json(rows);
    } catch (error) {
        console.error('Error en getTeam:', error);
        res.status(500).json({ msg: 'Error interno del servidor' });
    }
};

exports.addMember = async (req, res) => {
    const { businessId } = req.user;
    const { nombre_completo, email, telefono, dias_laborales } = req.body;
    if (!nombre_completo || !email) return res.status(400).json({ msg: 'Nombre y email son obligatorios.' });
    try {
        const id = uuidv4();
        await pool.execute(
            'INSERT INTO equipo (id, id_negocio, nombre_completo, telefono, email, dias_laborales, activo) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [id, businessId, nombre_completo, telefono || null, email, JSON.stringify(dias_laborales) || null, true]
        );
        res.status(201).json({ msg: 'Miembro del equipo creado con éxito.', id });
    } catch (error) {
        console.error('Error en addMember:', error);
        res.status(500).json({ msg: 'Error interno del servidor' });
    }
};

exports.deleteMember = async (req, res) => {
    const { businessId } = req.user;
    const { id } = req.params;
    try {
        // Soft delete
        const [result] = await pool.execute('UPDATE equipo SET activo = false WHERE id = ? AND id_negocio = ?', [id, businessId]);
        if (result.affectedRows === 0) return res.status(404).json({ msg: 'Miembro no encontrado o no pertenece a tu negocio.' });
        res.json({ msg: 'Miembro del equipo desactivado.' });
    } catch (error) {
        console.error('Error en deleteMember:', error);
        res.status(500).json({ msg: 'Error interno del servidor' });
    }
};

exports.getEquipoDisponible = async (req, res) => {
    const { businessId } = req.user;
    const { fecha_hora_inicio, fecha_hora_fin } = req.query;

    if (!fecha_hora_inicio || !fecha_hora_fin) {
        return res.status(400).json({ msg: 'Los parámetros fecha_hora_inicio y fecha_hora_fin son obligatorios.' });
    }

    try {
        const query = `
            SELECT e.id, e.nombre_completo
            FROM equipo e
            WHERE e.id_negocio = ? AND e.activo = true AND e.id NOT IN (
                SELECT cpa.id_equipo
                FROM citas_personal_asignado cpa
                JOIN citas c ON cpa.id_cita = c.id
                WHERE (c.fecha_hora_inicio < ? AND c.fecha_hora_fin > ?)
            )
        `;
        const [rows] = await pool.execute(query, [businessId, fecha_hora_fin, fecha_hora_inicio]);
        res.json(rows);
    } catch (error)
        {
        console.error('Error en getEquipoDisponible:', error);
        res.status(500).json({ msg: 'Error interno del servidor' });
    }
};


// --- Catálogos ---

exports.getTiposServicio = async (req, res) => {
    const { businessId } = req.user;
    try {
        const [rows] = await pool.execute('SELECT * FROM tipos_servicio WHERE id_negocio = ?', [businessId]);
        res.json(rows);
    } catch (error) {
        console.error('Error en getTiposServicio:', error);
        res.status(500).json({ msg: 'Error interno del servidor' });
    }
};

exports.createTipoServicio = async (req, res) => {
    const { businessId } = req.user;
    const { nombre, descripcion, url_imagen } = req.body;

    if (!nombre || !descripcion) {
        return res.status(400).json({ msg: 'Nombre y descripción son obligatorios.' });
    }

    try {
        const [result] = await pool.execute(
            'INSERT INTO tipos_servicio (id_negocio, nombre, descripcion, url_imagen) VALUES (?, ?, ?, ?)',
            [businessId, nombre, descripcion, url_imagen || null]
        );
        res.status(201).json({ msg: 'Tipo de servicio creado.', id: result.insertId });
    } catch (error) {
        console.error('Error en createTipoServicio:', error);
        res.status(500).json({ msg: 'Error interno del servidor' });
    }
};

exports.updateTipoServicio = async (req, res) => {
    const { businessId } = req.user;
    const { id } = req.params;
    const { nombre, descripcion, url_imagen } = req.body;

    const fields = [];
    const values = [];
    if (nombre) { fields.push('nombre = ?'); values.push(nombre); }
    if (descripcion) { fields.push('descripcion = ?'); values.push(descripcion); }
    if (url_imagen) { fields.push('url_imagen = ?'); values.push(url_imagen); }

    if (fields.length === 0) {
        return res.status(400).json({ msg: 'No hay campos para actualizar.' });
    }

    values.push(id, businessId);
    try {
        const [result] = await pool.execute(`UPDATE tipos_servicio SET ${fields.join(', ')} WHERE id = ? AND id_negocio = ?`, values);
        if (result.affectedRows === 0) {
            return res.status(404).json({ msg: 'Tipo de servicio no encontrado o no pertenece a tu negocio.' });
        }
        res.json({ msg: 'Tipo de servicio actualizado.' });
    } catch (error) {
        console.error('Error en updateTipoServicio:', error);
        res.status(500).json({ msg: 'Error interno del servidor' });
    }
};

exports.deleteTipoServicio = async (req, res) => {
    const { businessId } = req.user;
    const { id } = req.params;
    try {
        const [result] = await pool.execute('DELETE FROM tipos_servicio WHERE id = ? AND id_negocio = ?', [id, businessId]);
        if (result.affectedRows === 0) return res.status(404).json({ msg: 'Tipo de servicio no encontrado o no pertenece a tu negocio.' });
        res.json({ msg: 'Tipo de servicio eliminado.' });
    } catch (error) {
        console.error('Error en deleteTipoServicio:', error);
        res.status(500).json({ msg: 'Error interno del servidor' });
    }
};

// --- Gestión de Métodos de Pago ---

exports.getMetodosPago = async (req, res) => {
    const { businessId } = req.user;
    try {
        const [rows] = await pool.execute('SELECT * FROM metodos_pago WHERE id_negocio = ?', [businessId]);
        res.json(rows);
    } catch (error) {
        console.error('Error en getMetodosPago:', error);
        res.status(500).json({ msg: 'Error interno del servidor' });
    }
};

exports.createMetodoPago = async (req, res) => {
    const { businessId } = req.user;
    const { nombre } = req.body;

    if (!nombre) {
        return res.status(400).json({ msg: 'El nombre del método de pago es obligatorio.' });
    }

    try {
        const [result] = await pool.execute(
            'INSERT INTO metodos_pago (id_negocio, nombre) VALUES (?, ?)',
            [businessId, nombre]
        );
        res.status(201).json({ msg: 'Método de pago creado con éxito.', id: result.insertId });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ msg: 'Ya existe un método de pago con este nombre para tu negocio.' });
        }
        console.error('Error al crear método de pago:', error);
        res.status(500).json({ msg: 'Error interno del servidor.' });
    }
};

exports.deleteMetodoPago = async (req, res) => {
    const { businessId } = req.user;
    const { id } = req.params;
    try {
        const [result] = await pool.execute('DELETE FROM metodos_pago WHERE id = ? AND id_negocio = ?', [id, businessId]);
        if (result.affectedRows === 0) return res.status(404).json({ msg: 'Método de pago no encontrado para este negocio.' });
        res.json({ msg: 'Método de pago deshabilitado.' });
    } catch (error) {
        console.error('Error en deleteMetodoPago:', error);
        res.status(500).json({ msg: 'Error interno del servidor' });
    }
};


// --- Gestión de Galería ---

exports.getGaleria = async (req, res) => {
    const { businessId } = req.user;
    try {
        const [rows] = await pool.execute('SELECT * FROM negocios_galeria WHERE id_negocio = ?', [businessId]);
        res.json(rows);
    } catch (error) {
        console.error('Error en getGaleria:', error);
        res.status(500).json({ msg: 'Error interno del servidor' });
    }
};

exports.addImagenGaleria = async (req, res) => {
    const { businessId } = req.user;
    const { id_imagen, orden } = req.body;
    if (!id_imagen) return res.status(400).json({ msg: 'id_imagen es obligatorio.' });
    try {
        const id = uuidv4();
        await pool.execute(
            'INSERT INTO negocios_galeria (id, id_negocio, id_imagen, orden) VALUES (?, ?, ?, ?)',
            [id, businessId, id_imagen, orden || 0]
        );
        res.status(201).json({ msg: 'Imagen agregada a la galería.', id });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ msg: 'Esta imagen ya está en la galería.' });
        }
        console.error('Error en addImagenGaleria:', error);
        res.status(500).json({ msg: 'Error interno del servidor' });
    }
};

exports.deleteImagenGaleria = async (req, res) => {
    const { businessId } = req.user;
    const { id } = req.params;
    try {
        const [result] = await pool.execute('DELETE FROM negocios_galeria WHERE id = ? AND id_negocio = ?', [id, businessId]);
        if (result.affectedRows === 0) return res.status(404).json({ msg: 'Entrada de galería no encontrada o no pertenece a tu negocio.' });
        res.json({ msg: 'Imagen eliminada de la galería.' });
    } catch (error) {
        console.error('Error en deleteImagenGaleria:', error);
        res.status(500).json({ msg: 'Error interno del servidor' });
    }
};

// --- Agenda ---
exports.getCitasNegocio = async (req, res) => {
    const { businessId } = req.user;
    const connection = await pool.getConnection();
    try {
        const query = `
            SELECT 
                c.id, 
                c.fecha_hora_inicio, 
                c.fecha_hora_fin, 
                c.titulo,
                s.id as id_solicitud,
                u.nombre_completo as nombre_cliente,
                s.servicio_calle, 
                s.servicio_ciudad,
                es.nombre as nombre_estado
            FROM citas c
            JOIN solicitudes_servicio s ON c.id_solicitud = s.id
            JOIN usuarios u ON s.id_usuario = u.id
            JOIN estados_solicitud es ON s.id_estado = es.id
            WHERE s.id_negocio = ?
            ORDER BY c.fecha_hora_inicio DESC
        `;
        const [citas] = await connection.execute(query, [businessId]);

        const citasConPersonal = await Promise.all(citas.map(async (cita) => {
            const [personal] = await connection.execute(
                `SELECT e.nombre_completo 
                 FROM equipo e
                 JOIN citas_personal_asignado cpa ON e.id = cpa.id_equipo
                 WHERE cpa.id_cita = ?`,
                [cita.id]
            );
            return {
                ...cita,
                personal: personal.map(p => p.nombre_completo)
            };
        }));

        res.json(citasConPersonal);
    } catch (error) {
        console.error('Error en getCitasNegocio:', error);
        res.status(500).json({ msg: 'Error interno del servidor.' });
    } finally {
        if (connection) connection.release();
    }
};