// controllers/solicitud.controller.js
const pool = require('../config/db');
const { v4: uuidv4 } = require('uuid');

/**
 * Crea una nueva solicitud de servicio.
 * El usuario (cliente) crea una solicitud para un negocio específico.
 */
exports.createSolicitud = async (req, res) => {
    const { id: id_usuario } = req.user; // ID del usuario logueado (cliente)
    const { id_negocio, id_tipo_servicio, id_metodo_pago_preferido, fecha_deseada, es_urgente, pago_anticipado, direccion_servicio, detalles } = req.body;

    // Validación de campos obligatorios
    if (!id_negocio || !id_tipo_servicio || !direccion_servicio) {
        return res.status(400).json({ msg: 'Los campos id_negocio, id_tipo_servicio y direccion_servicio son obligatorios.' });
    }
    const { calle, numero, ciudad, estado } = direccion_servicio;
    if (!calle || !ciudad || !estado) {
        return res.status(400).json({ msg: 'Los campos de dirección calle, ciudad y estado son obligatorios.' });
    }

    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const idSolicitud = uuidv4();
        const solicitudQuery = `
            INSERT INTO solicitudes_servicio 
            (id, id_usuario, id_negocio, id_tipo_servicio, id_estado, id_metodo_pago_preferido, fecha_deseada, es_urgente, pago_anticipado, servicio_calle, servicio_numero, servicio_colonia, servicio_ciudad, servicio_estado, servicio_codigo_postal, servicio_referencias) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
        
        await connection.execute(solicitudQuery, [
            idSolicitud,
            id_usuario, // Directamente del token
            id_negocio, // Directamente del body
            id_tipo_servicio,
            1, // Estado inicial: "Pendiente"
            id_metodo_pago_preferido || null,
            fecha_deseada || null,
            es_urgente ? 1 : 0,
            pago_anticipado ? 1 : 0,
            direccion_servicio.calle,
            direccion_servicio.numero || 'S/N',
            direccion_servicio.colonia || null,
            direccion_servicio.ciudad,
            direccion_servicio.estado,
            direccion_servicio.codigo_postal || null,
            direccion_servicio.referencias || null
        ]);

        // Lógica para detalles e imágenes (sin cambios)
        if (detalles && Array.isArray(detalles)) {
            for (const detalle of detalles) {
                const idDetalle = uuidv4();
                await connection.execute('INSERT INTO detalles_solicitud (id, id_solicitud, descripcion, tipo_mueble, tamano_mueble) VALUES (?, ?, ?, ?, ?)', [idDetalle, idSolicitud, detalle.descripcion, detalle.tipo_mueble || null, detalle.tamano_mueble || null]);
                if (detalle.imagenes && Array.isArray(detalle.imagenes)) {
                    for (const imagen of detalle.imagenes) {
                        if (imagen.url_imagen) {
                            const idImagen = uuidv4();
                            await connection.execute('INSERT INTO imagenes (id, id_usuario_subida, url_imagen, tipo_mime) VALUES (?, ?, ?, ?)', [idImagen, id_usuario, imagen.url_imagen, imagen.tipo_mime || null]);
                            await connection.execute('INSERT INTO detalles_solicitud_imagenes (id_detalle_solicitud, id_imagen) VALUES (?, ?)', [idDetalle, idImagen]);
                        }
                    }
                }
            }
        }

        await connection.commit();
        res.status(201).json({ msg: 'Solicitud creada con éxito.', id_solicitud: idSolicitud });
    } catch (error) {
        await connection.rollback();
        console.error('Error al crear la solicitud:', error);
        res.status(500).json({ msg: 'Error interno del servidor.', error: error.message });
    } finally {
        if (connection) connection.release();
    }
};

/**
 * Obtiene una lista de solicitudes.
 * - Si el usuario es Admin, ve todas las solicitudes de su negocio.
 * - Si el usuario es Cliente, ve todas las solicitudes que ha creado.
 */
exports.getSolicitudes = async (req, res) => {
    const { roleId, id: userId, businessId } = req.user;
    try {
        let query, params;
        if (roleId === 1) { // Rol de Dueño de Negocio (Admin)
            query = `
                SELECT s.id, s.fecha_solicitud, s.es_urgente, u.nombre_completo as nombre_cliente, es.nombre as estado, s.servicio_calle, s.servicio_numero
                FROM solicitudes_servicio s 
                JOIN usuarios u ON s.id_usuario = u.id 
                JOIN estados_solicitud es ON s.id_estado = es.id 
                WHERE s.id_negocio = ? 
                ORDER BY s.fecha_solicitud DESC`;
            params = [businessId];
        } else { // Rol de Cliente
            query = `
                SELECT s.id, s.fecha_solicitud, s.es_urgente, n.nombre as nombre_negocio, es.nombre as estado, s.servicio_calle, s.servicio_numero
                FROM solicitudes_servicio s 
                JOIN negocios n ON s.id_negocio = n.id 
                JOIN estados_solicitud es ON s.id_estado = es.id 
                WHERE s.id_usuario = ? 
                ORDER BY s.fecha_solicitud DESC`;
            params = [userId];
        }
        const [solicitudes] = await pool.execute(query, params);
        res.json(solicitudes);
    } catch (error) {
        console.error('Error al obtener solicitudes:', error);
        res.status(500).json({ msg: 'Error interno del servidor.' });
    }
};

/**
 * Obtiene los detalles de una solicitud específica.
 * La visibilidad está restringida al dueño del negocio o al cliente que la creó.
 */
exports.getSolicitudById = async (req, res) => {
    const { id: id_solicitud } = req.params;
    const { roleId, id: userId, businessId } = req.user;
    const connection = await pool.getConnection();

    try {
        // --- CONSULTA SQL PRINCIPAL ---
        const mainQuery = `
            SELECT 
                s.id,
                s.id_usuario,
                s.id_negocio,
                s.id_tipo_servicio,
                s.id_estado,
                s.id_metodo_pago_preferido,
                s.fecha_solicitud,
                s.fecha_deseada,
                s.es_urgente,
                s.pago_anticipado,
                s.servicio_calle,
                s.servicio_numero,
                s.servicio_colonia,
                s.servicio_ciudad,
                s.servicio_estado,
                s.servicio_codigo_postal,
                s.servicio_referencias,
                u.nombre_completo as nombre_cliente,
                u.telefono as telefono_cliente,
                es.nombre as nombre_estado,
                ts.nombre as nombre_servicio,
                mp.nombre as nombre_metodo_pago
            FROM solicitudes_servicio s
            JOIN usuarios u ON s.id_usuario = u.id
            JOIN estados_solicitud es ON s.id_estado = es.id
            JOIN tipos_servicio ts ON s.id_tipo_servicio = ts.id
            LEFT JOIN metodos_pago mp ON s.id_metodo_pago_preferido = mp.id
            WHERE s.id = ?
        `;
        const [solicitudes] = await connection.execute(mainQuery, [id_solicitud]);

        if (solicitudes.length === 0) {
            return res.status(404).json({ msg: 'Solicitud no encontrada.' });
        }

        const solicitud = solicitudes[0];

        // --- REQUERIMIENTO DE SEGURIDAD ---
        if ((roleId === 2 && solicitud.id_usuario !== userId) || (roleId === 1 && solicitud.id_negocio !== businessId)) {
            return res.status(403).json({ msg: 'No tienes permiso para ver esta solicitud.' });
        }

        // --- SUB-CONSULTAS Y CÁLCULO ---
        const [
            detallesResult, 
            cotizacionResult, 
            citasResult, 
            pagosResult, 
            incidentesResult
        ] = await Promise.all([
            connection.execute('SELECT * FROM detalles_solicitud WHERE id_solicitud = ?', [id_solicitud]),
            connection.execute('SELECT * FROM cotizaciones WHERE id_solicitud = ? ORDER BY fecha_creacion DESC LIMIT 1', [id_solicitud]),
            connection.execute('SELECT * FROM citas WHERE id_solicitud = ? ORDER BY fecha_hora_inicio ASC', [id_solicitud]),
            connection.execute('SELECT * FROM pagos WHERE id_solicitud = ? ORDER BY fecha_pago', [id_solicitud]),
            connection.execute('SELECT * FROM incidentes WHERE id_solicitud_servicio = ? ORDER BY fecha_creacion DESC', [id_solicitud]) // CORRECCIÓN APLICADA AQUÍ
        ]);

        // 1. Procesar Detalles e Imágenes
        const [detalles] = detallesResult;
        for (const detalle of detalles) {
            const [imagenes] = await connection.execute(
                `SELECT i.url_imagen, i.tipo_mime 
                 FROM detalles_solicitud_imagenes dsi
                 JOIN imagenes i ON dsi.id_imagen = i.id
                 WHERE dsi.id_detalle_solicitud = ?`,
                [detalle.id]
            );
            detalle.imagenes = imagenes;
        }
        solicitud.detalles = detalles;

        // 2. Procesar Cotización y Líneas
        const [cotizaciones] = cotizacionResult;
        if (cotizaciones.length > 0) {
            const cotizacion = cotizaciones[0];
            const [lineas] = await connection.execute('SELECT * FROM lineas_cotizacion WHERE id_cotizacion = ?', [cotizacion.id]);
            cotizacion.lineas = lineas;

            cotizacion.monto_total_calculado = lineas.reduce((total, linea) => {
                const cantidad = parseFloat(linea.cantidad) || 0;
                const precio_unitario = parseFloat(linea.precio_unitario) || 0;
                return total + (cantidad * precio_unitario);
            }, 0);
            solicitud.cotizacion = cotizacion;
        } else {
            solicitud.cotizacion = null;
        }

        // 3. Procesar Citas y su Personal Asignado
        const [citas] = citasResult;
        for (const cita of citas) {
            const [personal] = await connection.execute(
                `SELECT e.id, e.nombre_completo, e.telefono
                 FROM equipo e
                 JOIN citas_personal_asignado cpa ON e.id = cpa.id_equipo
                 WHERE cpa.id_cita = ?`,
                [cita.id]
            );
            cita.personal_asignado = personal;
        }
        solicitud.citas = citas;

        // 4 y 5. Asignar resultados de pagos e incidentes
        solicitud.pagos = pagosResult[0];
        solicitud.incidentes = incidentesResult[0];

        res.json(solicitud);

    } catch (error) {
        console.error('Error al obtener el detalle de la solicitud:', error);
        res.status(500).json({ msg: 'Error interno del servidor.', error: error.message });
    } finally {
        if (connection) connection.release();
    }
};

/**
 * Permite a un cliente aceptar o rechazar una cotización.
 * La validación de seguridad se hace contra el id_usuario en la solicitud de servicio.
 */
exports.responderCotizacion = async (req, res) => {
    const { id: id_cotizacion } = req.params;
    const { id: userId, roleId } = req.user;
    const { accion, motivo_rechazo } = req.body;

    if (roleId !== 2) {
        return res.status(403).json({ msg: 'Esta acción solo puede ser realizada por un cliente.' });
    }
    if (!accion || !['aceptar', 'rechazar'].includes(accion)) {
        return res.status(400).json({ msg: "La 'accion' es obligatoria y debe ser 'aceptar' o 'rechazar'." });
    }

    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const [cotizaciones] = await connection.execute(
            `SELECT s.id as id_solicitud, c.estado 
             FROM solicitudes_servicio s 
             JOIN cotizaciones c ON s.id = c.id_solicitud 
             WHERE c.id = ? AND s.id_usuario = ?`, [id_cotizacion, userId]
        );

        if (cotizaciones.length === 0) {
            await connection.rollback();
            return res.status(403).json({ msg: 'No tienes permiso para responder a esta cotización o la cotización no existe.' });
        }

        const cotizacion = cotizaciones[0];
        
        if (cotizacion.estado !== 'pendiente') {
            await connection.rollback();
            return res.status(409).json({ msg: `Esta cotización ya fue respondida (estado actual: ${cotizacion.estado}).` });
        }

        if (accion === 'aceptar') {
            await connection.execute("UPDATE cotizaciones SET estado = 'aceptada', fecha_respuesta = NOW() WHERE id = ?", [id_cotizacion]);
            await connection.execute("UPDATE solicitudes_servicio SET id_estado = 3 WHERE id = ?", [cotizacion.id_solicitud]); // 3: Aceptada
        } else {
            if (!motivo_rechazo) {
                await connection.rollback();
                return res.status(400).json({ msg: "El 'motivo_rechazo' es obligatorio al rechazar una cotización." });
            }
            await connection.execute("UPDATE cotizaciones SET estado = 'rechazada', fecha_respuesta = NOW(), motivo_rechazo = ? WHERE id = ?", [motivo_rechazo, id_cotizacion]);
            await connection.execute("UPDATE solicitudes_servicio SET id_estado = 8 WHERE id = ?", [cotizacion.id_solicitud]); // 8: Rechazada
        }

        await connection.commit();
        res.status(200).json({ msg: `Cotización ${accion === 'aceptar' ? 'aceptada' : 'rechazada'} con éxito.` });
    } catch (error) {
        await connection.rollback();
        console.error('Error al responder cotización:', error);
        res.status(500).json({ msg: 'Error interno del servidor.', error: error.message });
    } finally {
        if (connection) connection.release();
    }
};

// --- Otras funciones del controlador (se mantienen si no tienen dependencias conflictivas) ---

exports.updateEstadoSolicitud = async (req, res) => {
    const { id: id_solicitud } = req.params;
    const { businessId, roleId } = req.user;
    const { id_estado } = req.body;

    if (roleId !== 1) {
        return res.status(403).json({ msg: 'Esta operación solo puede ser realizada por un administrador.' });
    }
    if (!id_estado) {
        return res.status(400).json({ msg: 'El id_estado es obligatorio.' });
    }
    try {
        const [result] = await pool.execute('UPDATE solicitudes_servicio SET id_estado = ? WHERE id = ? AND id_negocio = ?', [id_estado, id_solicitud, businessId]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ msg: 'Solicitud no encontrada o no pertenece a tu negocio.' });
        }
        res.json({ msg: 'Estado de la solicitud actualizado.' });
    } catch (error) {
        console.error('Error en updateEstadoSolicitud:', error);
        res.status(500).json({ msg: 'Error interno del servidor.' });
    }
};

// --- Funciones Simuladas (Placeholder) ---

exports.createCotizacion = async (req, res) => {
    const { id: id_solicitud } = req.params;
    const { businessId, id: adminId } = req.user; // Obtener id_admin_creador del token
    const { detalles, moneda, lineas } = req.body;

    // 1. Validación
    if (!Array.isArray(lineas) || lineas.length === 0) {
        return res.status(400).json({ msg: 'El campo "lineas" debe ser un arreglo con al menos una partida.' });
    }

    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        // Verificar que la solicitud pertenece al negocio
        const [solicitudes] = await connection.execute('SELECT id FROM solicitudes_servicio WHERE id = ? AND id_negocio = ?', [id_solicitud, businessId]);
        if (solicitudes.length === 0) {
            await connection.rollback();
            return res.status(404).json({ msg: 'Solicitud no encontrada o no pertenece a tu negocio.' });
        }

        // 2. Calcular el monto total desde las líneas (para referencia, no se guarda en la tabla cotizaciones)
        const monto_total_calculado = lineas.reduce((total, linea) => {
            const cantidad = parseFloat(linea.cantidad) || 0;
            const precio = parseFloat(linea.precio_unitario) || 0;
            if (linea.descripcion === undefined || linea.precio_unitario === undefined) {
                throw new Error('Cada línea debe tener "descripcion" y "precio_unitario".');
            }
            return total + (cantidad * precio);
        }, 0);

        // 3. Insertar la cotización principal con la estructura corregida
        const id_cotizacion = uuidv4();
        await connection.execute(
            'INSERT INTO cotizaciones (id, id_solicitud, id_admin_creador, detalles, moneda, estado) VALUES (?, ?, ?, ?, ?, ?)',
            [id_cotizacion, id_solicitud, adminId, detalles || null, moneda || 'MXN', 'pendiente'] // Estado por defecto 'pendiente'
        );

        // 4. Insertar las líneas de la cotización
        const lineasPromises = lineas.map(linea => {
            return connection.execute(
                'INSERT INTO lineas_cotizacion (id, id_cotizacion, id_detalle_solicitud, descripcion, cantidad, precio_unitario) VALUES (?, ?, ?, ?, ?, ?)',
                [uuidv4(), id_cotizacion, linea.id_detalle_solicitud || null, linea.descripcion, linea.cantidad, linea.precio_unitario]
            );
        });
        await Promise.all(lineasPromises);

        // 5. Actualizar el estado de la solicitud a "Cotizado" (ID 2)
        await connection.execute('UPDATE solicitudes_servicio SET id_estado = 2 WHERE id = ?', [id_solicitud]);

        await connection.commit();
        res.status(201).json({ msg: 'Cotización creada y enviada con éxito.', id_cotizacion, monto_total_calculado });

    } catch (error) {
        await connection.rollback();
        console.error('Error al crear la cotización:', error);
        if (error.message.includes('Cada línea')) {
            return res.status(400).json({ msg: error.message });
        }
        res.status(500).json({ msg: 'Error interno del servidor.', error: error.message });
    } finally {
        if (connection) connection.release();
    }
};

exports.createCita = async (req, res) => {
    const { id: id_solicitud } = req.params;
    const {
        titulo,
        fecha_hora_inicio,
        fecha_hora_fin,
        notas_internas,
        personal_asignado
    } = req.body;

    // 1. Validaciones Previas
    if (!titulo || !fecha_hora_inicio || !fecha_hora_fin) {
        return res.status(400).json({ msg: 'Los campos titulo, fecha_hora_inicio y fecha_hora_fin son obligatorios.' });
    }
    if (!personal_asignado || !Array.isArray(personal_asignado) || personal_asignado.length === 0) {
        return res.status(400).json({ msg: 'El campo personal_asignado debe ser un array con al menos un ID.' });
    }
    if (new Date(fecha_hora_fin) <= new Date(fecha_hora_inicio)) {
        return res.status(400).json({ msg: 'La fecha de finalización debe ser posterior a la fecha de inicio.' });
    }

    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        // 2. Validación de Disponibilidad (Corrección de SQL)
        const placeholders = personal_asignado.map(() => '?').join(',');
        const validationQuery = `
            SELECT COUNT(*) as conflict_count 
            FROM citas c 
            JOIN citas_personal_asignado cpa ON c.id = cpa.id_cita 
            WHERE cpa.id_equipo IN (${placeholders}) 
              AND (c.fecha_hora_inicio < ? AND c.fecha_hora_fin > ?)
        `;
        const validationParams = [...personal_asignado, fecha_hora_fin, fecha_hora_inicio];
        
        const [validationRows] = await connection.execute(validationQuery, validationParams);

        if (validationRows[0].conflict_count > 0) {
            await connection.rollback();
            return res.status(409).json({ msg: 'Conflicto de horario: Uno o más miembros del personal ya tienen una cita en el horario seleccionado.' });
        }

        // 3. Inserción (Transacción)
        const id_cita = uuidv4();
        
        // Insertar en tabla `citas`
        await connection.execute(
            'INSERT INTO citas (id, id_solicitud, titulo, fecha_hora_inicio, fecha_hora_fin, notas_internas) VALUES (?, ?, ?, ?, ?, ?)',
            [id_cita, id_solicitud, titulo, fecha_hora_inicio, fecha_hora_fin, notas_internas || null]
        );

        // Insertar en tabla `citas_personal_asignado`
        const asignacionValues = personal_asignado.map(id_equipo => [id_cita, id_equipo]);
        await connection.query('INSERT INTO citas_personal_asignado (id_cita, id_equipo) VALUES ?', [asignacionValues]);

        // Actualizar `solicitudes_servicio` a estado 4 (Agendada)
        await connection.execute(
            'UPDATE solicitudes_servicio SET id_estado = 4 WHERE id = ?',
            [id_solicitud]
        );

        await connection.commit();

        // 4. Respuesta
        res.status(201).json({ msg: 'Cita creada y agendada con éxito.', id_cita });

    } catch (error) {
        await connection.rollback();
        console.error('Error al crear la cita:', error);
        res.status(500).json({ msg: 'Error interno del servidor.', error: error.message });
    } finally {
        if (connection) connection.release();
    }
};

exports.createPago = async (req, res) => {
    const { id: id_solicitud } = req.params;
    const { monto, id_metodo_pago } = req.body;

    if (!monto || !id_metodo_pago) {
        return res.status(400).json({ msg: 'Los campos monto y id_metodo_pago son obligatorios.' });
    }

    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        // 1. Validación Previa
        const [solicitudes] = await connection.execute('SELECT id, id_estado FROM solicitudes_servicio WHERE id = ?', [id_solicitud]);
        if (solicitudes.length === 0) {
            await connection.rollback();
            return res.status(404).json({ msg: 'La solicitud de servicio no existe.' });
        }
        const solicitud = solicitudes[0];

        // 2. Registro
        await connection.execute(
            'INSERT INTO pagos (id, id_solicitud, monto, id_metodo_pago, fecha_pago) VALUES (?, ?, ?, ?, NOW())',
            [uuidv4(), id_solicitud, monto, id_metodo_pago]
        );

        // 3. Cálculo de Saldo
        const [[totalPagos]] = await connection.execute('SELECT SUM(monto) as total_pagado FROM pagos WHERE id_solicitud = ?', [id_solicitud]);
        const totalPagado = totalPagos.total_pagado || 0;

        const [[cotizacion]] = await connection.execute(
            `SELECT SUM(lc.cantidad * lc.precio_unitario) as total_cotizado 
             FROM cotizaciones c
             JOIN lineas_cotizacion lc ON c.id = lc.id_cotizacion
             WHERE c.id_solicitud = ? AND c.estado = 'aceptada'`,
            [id_solicitud]
        );
        const totalCotizado = cotizacion.total_cotizado || 0;

        // 4. Decisión de Estado
        if (totalPagado >= totalCotizado) {
            await connection.execute('UPDATE solicitudes_servicio SET id_estado = 7 WHERE id = ?', [id_solicitud]); // 7: Pagada/Cerrada
        } else if (totalPagado > 0 && solicitud.id_estado === 4) { // 4: Agendada
            await connection.execute('UPDATE solicitudes_servicio SET id_estado = 5 WHERE id = ?', [id_solicitud]); // 5: Completada/Parcial
        }
        
        await connection.commit();
        res.status(201).json({ msg: 'Pago registrado con éxito y estado de la solicitud actualizado.', total_pagado: totalPagado, total_cotizado: totalCotizado });

    } catch (error) {
        await connection.rollback();
        console.error('Error al registrar el pago:', error);
        res.status(500).json({ msg: 'Error interno del servidor.', error: error.message });
    } finally {
        if (connection) connection.release();
    }
};

exports.createIncidente = async (req, res) => {
    const { id: id_solicitud } = req.params;
    const { descripcion } = req.body;
    if (!descripcion) return res.status(400).json({ msg: 'La descripción es obligatoria.' });
    res.status(201).json({ msg: 'Incidente creado (simulado).', id_solicitud });
};

exports.updateIncidente = async (req, res) => {
    const { id: id_incidente } = req.params;
    const { estado } = req.body;
    if (!estado) return res.status(400).json({ msg: 'El estado es obligatorio.' });
    res.status(200).json({ msg: 'Incidente actualizado (simulado).', id_incidente, estado });
};

module.exports = {
    createSolicitud: exports.createSolicitud,
    getSolicitudes: exports.getSolicitudes,
    getSolicitudById: exports.getSolicitudById,
    updateEstadoSolicitud: exports.updateEstadoSolicitud,
    createCotizacion: exports.createCotizacion,
    responderCotizacion: exports.responderCotizacion,
    createCita: exports.createCita,
    createPago: exports.createPago,
    createIncidente: exports.createIncidente,
    updateIncidente: exports.updateIncidente
};