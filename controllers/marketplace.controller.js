// controllers/marketplace.controller.js
const pool = require('../config/db');

/**
 * Obtiene el perfil público de un negocio, incluyendo su galería,
 * servicios y métodos de pago.
 */
exports.getPerfilNegocioPublico = async (req, res) => {
    const { id: id_negocio } = req.params;

    try {
        // 1. Ejecutar todas las consultas en paralelo
        const [
            perfilResult,
            galeriaResult,
            serviciosResult,
            metodosPagoResult
        ] = await Promise.all([
            pool.query('SELECT id, nombre, descripcion, url_logo, url_banner, telefono_contacto, email_contacto FROM negocios WHERE id = ?', [id_negocio]),
            pool.query('SELECT id, url_imagen, descripcion FROM negocios_galeria WHERE id_negocio = ?', [id_negocio]),
            pool.query('SELECT id, nombre, descripcion, url_imagen FROM tipos_servicio WHERE id_negocio = ?', [id_negocio]),
            pool.query('SELECT id, nombre FROM metodos_pago WHERE id_negocio = ?', [id_negocio])
        ]);

        const [perfilRows] = perfilResult;

        // 2. Validar si el negocio existe
        if (perfilRows.length === 0) {
            return res.status(404).json({ msg: 'Negocio no encontrado.' });
        }

        const [galeriaRows] = galeriaResult;
        const [serviciosRows] = serviciosResult;
        const [metodosPagoRows] = metodosPagoResult;

        // 3. Devolver la respuesta unificada
        res.json({
            perfil: perfilRows[0],
            galeria: galeriaRows,
            servicios: serviciosRows,
            metodos_pago: metodosPagoRows
        });

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
        const [negocios] = await pool.query('SELECT id, nombre, descripcion, url_logo FROM negocios');
        res.json(negocios);
    } catch (error) {
        console.error('Error al obtener todos los negocios:', error);
        res.status(500).json({ msg: 'Error interno del servidor.', error: error.message });
    }
};
