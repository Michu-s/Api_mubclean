// controllers/marketplace.controller.js
const supabase = require('../config/db');

/**
 * Obtiene el perfil público de un negocio, incluyendo su galería,
 * servicios y métodos de pago.
 */
exports.getPerfilNegocioPublico = async (req, res) => {
    const { id: id_negocio } = req.params;

    try {
        // Usar supabase para obtener perfil, galería, servicios y métodos de pago
        const { data: perfil, error: perfilErr } = await supabase
            .from('negocios')
            .select('id, nombre, descripcion, url_logo, url_banner, telefono_contacto, email_contacto')
            .eq('id', id_negocio)
            .single();

        if (perfilErr) throw perfilErr;
        if (!perfil) return res.status(404).json({ msg: 'Negocio no encontrado.' });

        const { data: galeria, error: galeriaErr } = await supabase
            .from('negocios_galeria')
            .select('id, url_imagen, descripcion, fecha_subida')
            .eq('id_negocio', id_negocio);
        if (galeriaErr) throw galeriaErr;

        const { data: servicios, error: serviciosErr } = await supabase
            .from('tipos_servicio')
            .select('id, nombre, descripcion, url_imagen')
            .eq('id_negocio', id_negocio);
        if (serviciosErr) throw serviciosErr;

        const { data: metodos_pago, error: metodosErr } = await supabase
            .from('metodos_pago')
            .select('id, nombre')
            .eq('id_negocio', id_negocio);
        if (metodosErr) throw metodosErr;

        res.json({ perfil, galeria: galeria || [], servicios: servicios || [], metodos_pago: metodos_pago || [] });
    } catch (error) {
        console.error('Error al obtener el perfil público del negocio:', error);
        res.status(500).json({ msg: 'Error interno del servidor.', error: error.message });
    }
};

/**
 * Obtiene una lista de todos los negocios disponibles en la plataforma.
 * Devuelve solo la información básica para mostrar en tarjetas.
 */
exports.getAllNegocios = async (req, res) => {
    try {
        const { data: negocios, error } = await supabase
            .from('negocios')
            .select('id, nombre, descripcion, url_logo');
        if (error) throw error;
        res.json(negocios || []);
    } catch (error) {
        console.error('Error al obtener todos los negocios:', error);
        res.status(500).json({ msg: 'Error interno del servidor.', error: error.message });
    }
};
