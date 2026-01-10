// middleware/auth.middleware.js
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
require('dotenv').config();

const proteger = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ msg: 'Acceso no autorizado, token no proporcionado.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    // 1. Verificar y decodificar el token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 2. Consultar la base de datos para obtener los datos personales del usuario
    const [users] = await pool.execute(
      'SELECT id, nombre_completo, email, url_foto_perfil FROM usuarios WHERE id = ? AND activo = true',
      [decoded.userId]
    );

    if (users.length === 0) {
      return res.status(401).json({ msg: 'Usuario no encontrado o inactivo.' });
    }

    // 3. Reconstruir req.user con datos de la BD y del contexto del token
    req.user = {
      ...users[0], // Contiene id, nombre_completo, email, url_foto_perfil
      roleId: decoded.roleId,
      businessId: decoded.businessId
    };
    
    next();
  } catch (error) {
    console.error('Error de verificación de token:', error.message);
    return res.status(401).json({ msg: 'Token inválido o expirado.' });
  }
};

const esAdmin = (req, res, next) => {
  if (req.user && req.user.roleId === 1) {
    next();
  } else {
    return res.status(403).json({ msg: 'Acceso denegado. Se requiere rol de Administrador.' });
  }
};

module.exports = { proteger, esAdmin };