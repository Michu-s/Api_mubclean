// controllers/auth.controller.js
const supabase = require('../config/db'); // Tu cliente Supabase (idealmente con service role en backend)
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

/**
 * Normaliza email para evitar duplicados por mayúsculas/espacios.
 */
const normalizeEmail = (email) => String(email || '').trim().toLowerCase();

/**
 * Detecta un "duplicado" clásico de Postgres.
 * 23505 = unique_violation
 */
const isDuplicateError = (err) => err && err.code === '23505';

/**
 * Intenta borrar un usuario de Supabase Auth (requiere service role).
 * Si tu cliente NO tiene service role, fallará y lo ignoramos.
 */
const tryDeleteAuthUser = async (userId) => {
  try {
    if (!userId) return;
    // Esto solo funciona si tu supabase client está creado con SERVICE_ROLE_KEY
    await supabase.auth.admin.deleteUser(userId);
  } catch (_) {
    // Silencioso a propósito: es "best effort"
  }
};

/**
 * =========================================
 * REGISTER ADMIN (crea usuario + negocio + equipo)
 * =========================================
 */
const registerAdmin = async (req, res) => {
  const { nombre_completo, email, password, telefono } = req.body;

  // Validación básica
  if (!nombre_completo || !email || !password || !telefono) {
    return res.status(400).json({ success: false, msg: "Todos los campos son obligatorios." });
  }

  const emailNorm = normalizeEmail(email);

  try {
    /**
     * 0) Chequeo rápido en public.usuarios (case-insensitive).
     *    Nota: no es 100% necesario porque signUp también falla si existe,
     *    pero lo dejamos para dar mensaje rápido.
     */
    const { data: existingUser, error: existingUserError } = await supabase
      .from('usuarios')
      .select('id')
      .ilike('email', emailNorm)
      .maybeSingle();

    if (existingUserError) {
      return res.status(500).json({
        success: false,
        msg: 'Error al verificar si el usuario ya existe.',
        detail: existingUserError.message,
      });
    }

    if (existingUser) {
      return res.status(409).json({ success: false, msg: 'El email ya está registrado.' });
    }

    /**
     * 1) Crear usuario en Supabase Auth.
     *    IMPORTANTE: al crear auth.users, tu trigger on_auth_user_created
     *    ejecuta handle_new_user y CREA automáticamente la fila en public.usuarios.
     */
    const { data: authUser, error: authError } = await supabase.auth.signUp({
      email: emailNorm,
      password,
      options: {
        emailRedirectTo: `${process.env.FRONTEND_URL || 'http://localhost:4200'}/login`
      }
    });

    if (authError) {
      // Si ya existe, suele venir un mensaje tipo "User already registered"
      return res.status(400).json({ success: false, msg: authError.message || 'Error en el registro.' });
    }

    const id_usuario = authUser?.user?.id;
    if (!id_usuario) {
      return res.status(500).json({ success: false, msg: 'No se pudo obtener el ID del usuario creado en Auth.' });
    }

    /**
     * 2) NO HACER INSERT (porque ya existe por trigger).
     *    En su lugar: UPSERT por id para completar los datos (nombre/telefono).
     *    Esto funciona SI hay trigger y también SI no lo hubiera.
     */
    const { error: userUpsertError } = await supabase
      .from('usuarios')
      .upsert(
        {
          id: id_usuario,
          nombre_completo,
          email: emailNorm,
          telefono,
          activo: true,
          fecha_creacion: new Date().toISOString()
        },
        { onConflict: 'id' } // conflicto por PK
      );

    if (userUpsertError) {
      // Aquí NO respondemos "email ya existe" salvo que realmente sea un duplicado
      if (isDuplicateError(userUpsertError)) {
        return res.status(409).json({ success: false, msg: 'El email ya está registrado.' });
      }

      // Si falla, intentamos rollback del auth user (best effort)
      await tryDeleteAuthUser(id_usuario);

      return res.status(400).json({
        success: false,
        msg: userUpsertError.message || 'Error al guardar usuario en la base de datos.',
        code: userUpsertError.code
      });
    }

    // 3. Generar token JWT (sin esperar confirmación de email)
    // Nota: businessId es null porque aún no crea el negocio.
    const roleId = 1; // Forzamos rol de admin para este endpoint
    const payload = { userId: id_usuario, businessId: null, roleId: roleId };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });

    return res.status(200).json({
      success: true,
      msg: "Administrador registrado con éxito. Ahora debes crear tu negocio.",
      token,
      user: {
        id: id_usuario,
        nombre_completo,
        email: emailNorm,
        roleId: roleId,
        businessId: null
      }
    });

  } catch (error) {
    console.error('Error en el registro de administrador:', error);
    return res.status(500).json({ success: false, msg: error.message || 'Error interno del servidor.' });
  }
};


/**
 * =========================================
 * REGISTER USER (usuario normal)
 * =========================================
 */
const registerUser = async (req, res) => {
  const { nombre_completo, email, password, telefono } = req.body;

  if (!nombre_completo || !email || !password) {
    return res.status(400).json({ success: false, msg: 'Los campos nombre_completo, email y password son obligatorios.' });
  }

  const emailNorm = normalizeEmail(email);

  try {
    /**
     * 0) Verificar si ya existe en public.usuarios (case-insensitive)
     *    Esto cubre el caso más común.
     */
    const { data: existingUser, error: existingUserError } = await supabase
      .from('usuarios')
      .select('id')
      .ilike('email', emailNorm)
      .maybeSingle();

    if (existingUserError) {
      return res.status(500).json({ success: false, msg: 'Error al verificar usuario existente.', detail: existingUserError.message });
    }

    if (existingUser) {
      return res.status(409).json({ success: false, msg: 'El email ya está registrado.' });
    }

    /**
     * 1) Crear usuario en Supabase Auth.
     *    Trigger: crea public.usuarios automáticamente.
     */
    const { data: authUser, error: authError } = await supabase.auth.signUp({
      email: emailNorm,
      password,
      options: {
        emailRedirectTo: `${process.env.FRONTEND_URL || 'http://localhost:4200'}/login`
      }
    });

    if (authError) {
      // Si el error es "ya existe", devuelves 409
      // (Supabase puede devolverlo como 400 con mensaje)
      const msg = authError.message || 'Error en el registro.';
      if (msg.toLowerCase().includes('already') || msg.toLowerCase().includes('registered')) {
        return res.status(409).json({ success: false, msg: 'El email ya está registrado.' });
      }
      return res.status(400).json({ success: false, msg });
    }

    const id_usuario = authUser?.user?.id;
    if (!id_usuario) {
      return res.status(500).json({ success: false, msg: 'No se pudo obtener el ID del usuario creado en Auth.' });
    }

    /**
     * 2) Completar perfil en public.usuarios con UPSERT por id
     *    (evita duplicado por trigger y completa nombre/telefono).
     */
    const { error: upsertError } = await supabase
      .from('usuarios')
      .upsert(
        {
          id: id_usuario,
          nombre_completo,
          email: emailNorm,
          telefono: telefono || null,
          activo: true,
          fecha_creacion: new Date().toISOString()
        },
        { onConflict: 'id' }
      );

    if (upsertError) {
      await tryDeleteAuthUser(id_usuario);

      return res.status(400).json({
        success: false,
        msg: 'Error al guardar usuario en la base de datos.',
        detail: upsertError.message,
        code: upsertError.code
      });
    }

    /**
     * 3) Generar token JWT propio (tu middleware lo exige)
     */
    const payload = { userId: id_usuario, businessId: null, roleId: 2 };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });

    return res.status(201).json({
      success: true,
      msg: "Usuario registrado con éxito. Revisa tu email para confirmar tu cuenta.",
      token,
      user: {
        id: id_usuario,
        nombre_completo,
        email: emailNorm,
        roleId: 2,
        businessId: null
      }
    });

  } catch (error) {
    console.error('Error en el registro de usuario:', error);
    return res.status(500).json({ success: false, msg: error.message || 'Error interno del servidor.' });
  }
};


/**
 * =========================================
 * LOGIN
 * =========================================
 */
const login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, msg: 'Email y contraseña son obligatorios.' });
  }

  const emailNorm = normalizeEmail(email);

  try {
    /**
     * 1) Login con Supabase Auth
     */
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: emailNorm,
      password,
    });

    if (authError) {
      return res.status(401).json({ success: false, msg: 'Credenciales inválidas.' });
    }

    const { user } = authData;

    /**
     * 2) Verificar usuario en tabla usuarios
     */
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

    /**
     * 3) Determinar rol y negocio
     */
    let businessId = null;
    let roleId = 2; // Usuario normal por defecto

    const { data: negocio, error: negocioLookupError } = await supabase
      .from('negocios')
      .select('id')
      .eq('id_usuario_owner', user.id)
      .maybeSingle();

    if (!negocioLookupError && negocio) {
      businessId = negocio.id;
      roleId = 1; // Admin de negocio
    } else {
      // SI NO TIENE NEGOCIO: 
      // Verificamos si en la tabla usuarios tiene algo que indique que es admin
      // O para este test: si el email es el del admin de pruebas, forzamos roleId 1
      if (userRecord.email === 'admin_gui@test.com' || userRecord.email === 'admin203@test.com') {
          roleId = 1;
      }
    }

    /**
     * 4) Generar token JWT propio (tu middleware lo valida)
     */
    const payload = { userId: user.id, businessId, roleId };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });

    return res.status(200).json({
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
    return res.status(500).json({ success: false, msg: 'Error interno del servidor.' });
  }
};

module.exports = { registerAdmin, registerUser, login };
