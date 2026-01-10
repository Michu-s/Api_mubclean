// controllers/auth.controller.js
const pool = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const registerAdmin = async (req, res) => {
  const { nombre_negocio, nombre_completo, email, password, telefono } = req.body;
  if (!nombre_negocio || !nombre_completo || !email || !password || !telefono) {
    return res.status(400).json({ msg: "Todos los campos son obligatorios." });
  }
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [users] = await connection.execute('SELECT id FROM usuarios WHERE email = ?', [email]);
    if (users.length > 0) {
      await connection.rollback();
      return res.status(400).json({ msg: 'El email ya está registrado.' });
    }
    const id_usuario = uuidv4();
    const salt = await bcrypt.genSalt(10);
    const hash_contrasena = await bcrypt.hash(password, salt);
    await connection.execute('INSERT INTO usuarios (id, nombre_completo, email, hash_contrasena, telefono, activo) VALUES (?, ?, ?, ?, ?, ?)', [id_usuario, nombre_completo, email, hash_contrasena, telefono, true]);
    const id_negocio = uuidv4();
    await connection.execute('INSERT INTO negocios (id, id_usuario_owner, nombre, telefono_contacto, email_contacto) VALUES (?, ?, ?, ?, ?)', [id_negocio, id_usuario, nombre_negocio, telefono, email]);
    await connection.execute('INSERT INTO equipo (id, id_negocio, nombre_completo, telefono, email, activo) VALUES (?, ?, ?, ?, ?, ?)', [uuidv4(), id_negocio, nombre_completo, telefono, email, true]);
    await connection.commit();
    const payload = { userId: id_usuario, businessId: id_negocio, roleId: 1 };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ msg: "Administrador y negocio registrados con éxito.", token });
  } catch (error) {
    await connection.rollback();
    console.error('Error en el registro de administrador:', error);
    res.status(500).json({ msg: 'Error interno del servidor.', error: error.message });
  } finally {
    if (connection) connection.release();
  }
};

const registerUser = async (req, res) => {
  const { nombre_completo, email, password, telefono } = req.body;
  if (!nombre_completo || !email || !password) {
    return res.status(400).json({ msg: 'Los campos nombre_completo, email y password son obligatorios.' });
  }
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [existingUsers] = await connection.execute('SELECT id FROM usuarios WHERE email = ?', [email]);
    if (existingUsers.length > 0) {
      await connection.rollback();
      return res.status(400).json({ msg: 'El email ya está registrado.' });
    }
    const id_usuario = uuidv4();
    const salt = await bcrypt.genSalt(10);
    const hash_contrasena = await bcrypt.hash(password, salt);
    await connection.execute('INSERT INTO usuarios (id, nombre_completo, email, hash_contrasena, telefono, activo) VALUES (?, ?, ?, ?, ?, ?)', [id_usuario, nombre_completo, email, hash_contrasena, telefono || null, true]);
    await connection.commit();
    const payload = { userId: id_usuario, businessId: null, roleId: 2 };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ msg: "Usuario registrado con éxito.", token });
  } catch (error) {
    await connection.rollback();
    console.error('Error en el registro de usuario:', error);
    res.status(500).json({ msg: 'Error interno del servidor.', error: error.message });
  } finally {
    if (connection) connection.release();
  }
};

const login = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ msg: 'Email y contraseña son obligatorios.' });
  }
  try {
    const [users] = await pool.execute('SELECT id, nombre_completo, email, hash_contrasena, telefono FROM usuarios WHERE email = ? AND activo = true', [email]);
    if (users.length === 0) {
      return res.status(401).json({ msg: 'Credenciales inválidas.' });
    }
    const user = users[0];
    const isMatch = await bcrypt.compare(password, user.hash_contrasena);
    if (!isMatch) {
      return res.status(401).json({ msg: 'Credenciales inválidas.' });
    }
    
    let payload;
    const [ownerRows] = await pool.execute('SELECT id FROM negocios WHERE id_usuario_owner = ?', [user.id]);

    if (ownerRows.length > 0) {
      // El usuario es dueño de al menos un negocio.
      payload = { userId: user.id, businessId: ownerRows[0].id, roleId: 1 };
    } else {
      // Si no es dueño, se asume que es un cliente.
      payload = { userId: user.id, businessId: null, roleId: 2 };
    }

    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ msg: "Inicio de sesión exitoso", token, user: {
        id: user.id,
        nombre_completo: user.nombre_completo, // <--- Esto hará que aparezca el nombre en el Navbar
        email: user.email,
        url_foto_perfil: user.url_foto_perfil,
        telefono: user.telefono,
        roleId: payload.roleId,
        businessId: payload.businessId
      } });
  } catch (error) {
    console.error('Error en el login:', error);
    res.status(500).json({ msg: 'Error interno del servidor.', error: error.message });
  }
};

module.exports = { registerAdmin, registerUser, login };