// controllers/cliente.controller.js
const supabase = require('../config/db');
const { v4: uuidv4 } = require('uuid');

// --- Operaciones de Perfil Global (Usuario) ---

// Obtiene el perfil del usuario logueado
exports.getMiPerfil = async (req, res) => {
    const { id: userId } = req.user;
    try {
        const { data: rows, error } = await supabase
            .from('usuarios')
            .select('id, nombre_completo, email, telefono, url_foto_perfil, fecha_creacion')
            .eq('id', userId);
        
        if (error) throw error;
        
        if (!rows || rows.length === 0) {
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
    
    const updateData = {};
    
    if (nombre_completo) updateData.nombre_completo = nombre_completo;
    if (telefono) updateData.telefono = telefono;
    if (url_foto_perfil) updateData.url_foto_perfil = url_foto_perfil;

    if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ msg: 'Proporcione al menos un campo para actualizar.' });
    }

    try {
        const { error } = await supabase
            .from('usuarios')
            .update(updateData)
            .eq('id', userId);
        
        if (error) throw error;
        
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
        const { data: rows, error } = await supabase
            .from('direcciones')
            .select('*')
            .eq('id_usuario', id_usuario)
            .eq('id_negocio', id_negocio);
        
        if (error) throw error;
        
        res.json(rows || []);
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
        const { error } = await supabase
            .from('direcciones')
            .insert({
                id: id_direccion,
                id_usuario,
                id_negocio,
                calle_y_numero,
                colonia: colonia || null,
                ciudad,
                estado,
                codigo_postal: codigo_postal || null,
                referencias: referencias || null,
                es_predeterminada: es_predeterminada || false
            });
        
        if (error) throw error;
        
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

    const updateData = {};

    if (calle_y_numero) updateData.calle_y_numero = calle_y_numero;
    if (ciudad) updateData.ciudad = ciudad;
    if (estado) updateData.estado = estado;
    if (codigo_postal) updateData.codigo_postal = codigo_postal;
    if (colonia) updateData.colonia = colonia;
    if (referencias) updateData.referencias = referencias;
    if (es_predeterminada !== undefined) updateData.es_predeterminada = es_predeterminada;

    if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ msg: 'Proporcione al menos un campo para actualizar.' });
    }

    try {
        const { error } = await supabase
            .from('direcciones')
            .update(updateData)
            .eq('id', id)
            .eq('id_usuario', id_usuario);
        
        if (error) throw error;
        
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
        const { error } = await supabase
            .from('direcciones')
            .delete()
            .eq('id', id)
            .eq('id_usuario', id_usuario);
        
        if (error) throw error;
        
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
        const { data: rows, error } = await supabase
            .from('negocios')
            .select(`
                id,
                nombre,
                descripcion,
                url_logo,
                url_banner,
                nombre_dueno,
                email_contacto,
                telefono_contacto,
                fecha_creacion
            `)
            .in('id', 
                supabase
                    .from('solicitudes_servicio')
                    .select('id_negocio')
                    .eq('id_usuario', id_cliente)
            );
        
        if (error) throw error;

        if (!rows || rows.length === 0) {
        }

        res.json(rows);
    } catch (error) {
        console.error('Error en getMisNegocios:', error);
        res.status(500).json({ msg: 'Error interno del servidor' });
    }
};
