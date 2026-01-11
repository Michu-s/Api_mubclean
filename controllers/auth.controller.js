// controllers/auth.controller.js
const supabase = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const registerAdmin = async (req, res) => {
  const { nombre_negocio, nombre_completo, email, password, telefono } = req.body;
  if (!nombre_negocio || !nombre_completo || !email || !password || !telefono) {
    return res.status(400).json({ msg: "Todos los campos son obligatorios." });
  }
  
  try {
    // 1. Crear usuario en auth.users (Supabase Auth)
    const { data: authUser, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${process.env.FRONTEND_URL || 'http://localhost:4200'}/login`
      }
    });

    if (authError) {
      return res.status(400).json({ success: false, msg: authError.message || 'Error en el registro.' });
    }

    const id_usuario = authUser.user.id;

    // 2. Insertar usuario en tabla usuarios
    const { error: userError } = await supabase
      .from('usuarios')
      .insert({
        id: id_usuario,
        nombre_completo,
        email,
        telefono,
        activo: true,
        fecha_creacion: new Date().toISOString()
      });

    if (userError) {
      return res.status(400).json({ success: false, msg: userError.message || 'Error al guardar usuario en la base de datos.' });
    }

    // 3. Insertar negocio
    const id_negocio = uuidv4();
    const { error: negocioError } = await supabase
      .from('negocios')
      .insert({
        id: id_negocio,
        id_usuario_owner: id_usuario,
        nombre: nombre_negocio,
        telefono_contacto: telefono,
        email_contacto: email,
        fecha_creacion: new Date().toISOString()
      });

    if (negocioError) {
      return res.status(400).json({ success: false, msg: negocioError.message || 'Error al guardar negocio.' });
    }

    // 4. Insertar en equipo
    const { error: equipoError } = await supabase
      .from('equipo')
      .insert({
        id: uuidv4(),
        id_negocio,
        nombre_completo,
        telefono,
        email,
        activo: true
      });

    if (equipoError) {
      return res.status(400).json({ success: false, msg: equipoError.message || 'Error al guardar equipo.' });
    }

    // 5. Generar token JWT (sin esperar confirmación de email)
    const payload = { userId: id_usuario, businessId: id_negocio, roleId: 1 };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.status(200).json({
      success: true,
      msg: "Administrador y negocio registrados con éxito. Revisa tu email para confirmar tu cuenta.",
      token,
      user: {
        id: id_usuario,
        nombre_completo,
        email,
        roleId: 1,
        businessId: id_negocio
      }
    });
  } catch (error) {
    console.error('Error en el registro de administrador:', error);
    res.status(500).json({ success: false, msg: error.message || 'Error interno del servidor.' });
  }
};

const registerUser = async (req, res) => {
  const { nombre_completo, email, password, telefono } = req.body;
  if (!nombre_completo || !email || !password) {
    return res.status(400).json({ msg: 'Los campos nombre_completo, email y password son obligatorios.' });
  }
  
  try {
    // 0. Verificar si el email ya existe en Supabase Auth
    const { data: authUserLookup, error: authLookupError } = await supabase.auth.admin.getUserByEmail(email);
    // 1. Verificar si el email ya existe en la tabla usuarios
    const { data: existingUsers, error: findUserError } = await supabase
      .from('usuarios')
      .select('id')
      .eq('email', email);
    if (findUserError) {
      return res.status(500).json({ success: false, msg: 'Error al verificar usuario existente.' });
    }

    // Caso 1: Existe en Auth y en usuarios
    if (authUserLookup && authUserLookup.user && existingUsers && existingUsers.length > 0) {
      return res.status(409).json({ success: false, msg: 'El email ya está registrado.' });
    }

    // Caso 2: Existe en Auth pero NO en usuarios
    if (authUserLookup && authUserLookup.user && (!existingUsers || existingUsers.length === 0)) {
      const id_usuario = authUserLookup.user.id;
      // Inserta en usuarios (upsert para máxima robustez)
      const { error: userError } = await supabase
        .from('usuarios')
        .upsert({
          id: id_usuario,
          nombre_completo,
          email,
          telefono: telefono || null,
          activo: true,
          fecha_creacion: new Date().toISOString()
        });
      if (userError) {
        return res.status(400).json({ success: false, msg: 'Error al guardar usuario en la base de datos.' });
      }
      return res.status(200).json({
        success: true,
        msg: "Usuario sincronizado con éxito. Revisa tu email para confirmar tu cuenta.",
      });
    }

    // Caso 3: NO existe en Auth (ni en usuarios)
    const { data: authUser, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${process.env.FRONTEND_URL || 'http://localhost:4200'}/login`
      }
    });
    if (authError) {
      return res.status(400).json({ success: false, msg: authError.message || 'Error en el registro.' });
    }
    const id_usuario = authUser.user.id;
    // Inserta en usuarios (upsert para máxima robustez)
    const { error: userError } = await supabase
      .from('usuarios')
      .upsert({
        id: id_usuario,
        nombre_completo,
        email,
        telefono: telefono || null,
        activo: true,
        fecha_creacion: new Date().toISOString()
      });
    if (userError) {
      return res.status(400).json({ success: false, msg: 'Error al guardar usuario en la base de datos.' });
    }
    // 3. Generar token JWT local (sin esperar confirmación de email)
    const payload = { userId: id_usuario, businessId: null, roleId: 2 };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.status(200).json({
      success: true,
      msg: "Usuario registrado con éxito. Revisa tu email para confirmar tu cuenta.",
      token,
      user: {
        id: id_usuario,
        nombre_completo,
        email,
        roleId: 2,
        businessId: null
      }
    });
  } catch (error) {
    console.error('Error en el registro de usuario:', error);
    res.status(500).json({ success: false, msg: error.message || 'Error interno del servidor.' });
  }
};

const login = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ msg: 'Email y contraseña son obligatorios.' });
  }
  
  try {
    // 1. Login con Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      return res.status(401).json({ success: false, msg: 'Credenciales inválidas.' });
    }

    const { user } = authData;

    // 2. Verificar usuario en tabla usuarios
    const { data: userRecord, error: userError } = await supabase
      .from('usuarios')
      .select('*')
      .eq('id', user.id)
      .single();
    
    if (userError || !userRecord) {
      return res.status(404).json({ success: false, msg: 'Usuario no encontrado en la base de datos.' });
    }

    if (!userRecord.activo) {
      return res.status(403).json({ success: false, msg: 'Usuario inactivo. Contacte al administrador.' });
    }

    // 3. Determinar rol y negocio
    let businessId = null;
    let roleId = 2; // Default: Usuario normal

    const { data: negocio } = await supabase
      .from('negocios')
      .select('id')
      .eq('id_usuario_owner', user.id)
      .maybeSingle();

    if (negocio) {
      businessId = negocio.id;
      roleId = 1; // Admin de negocio
    }

    // 4. Generar token JWT propio
    const payload = { userId: user.id, businessId, roleId };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.status(200).json({
      success: true,
      msg: "Login exitoso.",
      token,
      user: {
        id: user.id,
        nombre_completo: userRecord.nombre_completo,
        email: userRecord.email,
        roleId,
        businessId
      }
    });

  } catch (error) {
    console.error('Error en el login:', error);
    res.status(500).json({ success: false, msg: 'Error interno del servidor.' });
  }
};

module.exports = { registerAdmin, registerUser, login };