// controllers/negocio.controller.js
const supabase = require("../config/db");
const { v4: uuidv4 } = require("uuid");

// --- Perfil del Negocio ---

exports.getNegocio = async (req, res) => {
  const { businessId } = req.user;
  try {
    const { data: rows, error } = await supabase
      .from("negocios")
      .select("*")
      .eq("id", businessId);

    if (error) throw error;

    if (!rows || rows.length === 0) {
      return res.status(404).json({ msg: "Negocio no encontrado." });
    }
    res.json(rows[0]);
  } catch (error) {
    console.error("Error en getNegocio:", error);
    res.status(500).json({ msg: "Error interno del servidor" });
  }
};

exports.createNegocio = async (req, res) => {
  const { id: userId } = req.user; // Fix: req.user tiene 'id', no 'userId'
  const {
    nombre,
    telefono_contacto,
    email_contacto,
    descripcion,
    url_logo,
    url_banner,
  } = req.body;

  if (!nombre || !telefono_contacto || !email_contacto) {
    return res.status(400).json({ msg: "Nombre, teléfono y email son obligatorios para crear el negocio." });
  }

  try {
     // 1. Obtener nombre del dueño para guardar en 'nombre_dueno'
     // (Opcional, pero se usaba antes)
     const { data: userData } = await supabase
       .from('usuarios')
       .select('nombre_completo')
       .eq('id', userId)
       .single();
     
     const nombreDueno = userData ? userData.nombre_completo : 'Admin';

    const id_negocio = uuidv4();
    
    // 2. Crear Negocio
    const { error: insertError } = await supabase
      .from("negocios")
      .insert({
        id: id_negocio,
        id_usuario_owner: userId,
        nombre,
        nombre_dueno: nombreDueno,
        telefono_contacto,
        email_contacto,
        descripcion: descripcion || null,
        url_logo: url_logo || null,
        url_banner: url_banner || null,
        fecha_creacion: new Date().toISOString()
      });

    if (insertError) throw insertError;

    // 3. Agregar al dueño como primer miembro del equipo (como se hacía antes)
    await supabase.from("equipo").insert({
        id: uuidv4(),
        id_negocio,
        nombre_completo: nombreDueno,
        telefono: telefono_contacto,
        email: email_contacto,
        activo: true,
    });

    res.status(201).json({ 
        msg: "Negocio creado con éxito.", 
        id: id_negocio 
    });

  } catch (error) {
    console.error("Error en createNegocio:", error);
    res.status(500).json({ msg: "Error al crear el negocio: " + error.message });
  }
};

exports.updateNegocio = async (req, res) => {
  // Ahora soportamos ID por parámetro o fallback a req.user.businessId
  let targetBusinessId = req.params.id; 
  if (!targetBusinessId) {
      targetBusinessId = req.user.businessId;
  }

  if (!targetBusinessId) {
      return res.status(400).json({ msg: "No se especificó el ID del negocio." });
  }

  const {
    nombre,
    telefono_contacto,
    email_contacto,
    descripcion,
    url_logo,
    url_banner,
  } = req.body;

  const updateData = {};
  if (nombre) updateData.nombre = nombre;
  if (telefono_contacto) updateData.telefono_contacto = telefono_contacto;
  if (email_contacto) updateData.email_contacto = email_contacto;
  if (descripcion) updateData.descripcion = descripcion;
  if (url_logo) updateData.url_logo = url_logo;
  if (url_banner) updateData.url_banner = url_banner;

  if (Object.keys(updateData).length === 0) {
    return res.status(400).json({ msg: "No hay campos para actualizar." });
  }

  try {
    const { error } = await supabase
      .from("negocios")
      .update(updateData)
      .eq("id", targetBusinessId); // Usamos el ID objetivo

    if (error) throw error;

    res.json({ msg: "Perfil del negocio actualizado con éxito." });
  } catch (error) {
    console.error("Error en updateNegocio:", error);
    res.status(500).json({ msg: "Error interno del servidor" });
  }
};

exports.deleteNegocio = async (req, res) => {
    const { id } = req.params; // ID UUID del negocio a eliminar
    if (!id) return res.status(400).json({ msg: "ID de negocio requerido." });

    try {
        // Opción A: Borrado físico (DELETE)
        // Opción B: Borrado lógico (si tienes columna activo). Supabase suele ser físico si no hay soft delete.
        // Asumiremos DELETE físico como solicitaste "eliminar".
        // NOTA: Esto puede fallar si hay claves foráneas (citas, equipo) sin ON DELETE CASCADE.
        
        const { error } = await supabase
            .from('negocios')
            .delete()
            .eq('id', id);

        if (error) throw error;

        res.json({ msg: "Negocio eliminado con éxito." });
    } catch (error) {
        console.error("Error en deleteNegocio:", error);
        res.status(500).json({ msg: "Error al eliminar negocio." });
    }
};

// --- Gestión de Equipo ---

exports.getTeam = async (req, res) => {
  const { businessId } = req.user;
  try {
    const { data: rows, error } = await supabase
      .from("equipo")
      .select("id, nombre_completo, email, telefono, dias_laborales, activo")
      .eq("id_negocio", businessId);

    if (error) throw error;

    res.json(rows || []);
  } catch (error) {
    console.error("Error en getTeam:", error);
    res.status(500).json({ msg: "Error interno del servidor" });
  }
};

exports.addMember = async (req, res) => {
  const { businessId } = req.user;
  const { nombre_completo, email, telefono, dias_laborales } = req.body;
  if (!nombre_completo || !email)
    return res.status(400).json({ msg: "Nombre y email son obligatorios." });
  try {
    const id = uuidv4();
    const { error } = await supabase.from("equipo").insert({
      id,
      id_negocio: businessId,
      nombre_completo,
      telefono: telefono || null,
      email,
      dias_laborales: dias_laborales ? dias_laborales : null,
      activo: true,
    });

    if (error) throw error;

    res.status(201).json({ msg: "Miembro del equipo creado con éxito.", id });
  } catch (error) {
    console.error("Error en addMember:", error);
    res.status(500).json({ msg: "Error interno del servidor" });
  }
};

exports.updateMember = async (req, res) => {
  const { businessId } = req.user;
  const { id } = req.params;
  const { nombre_completo, email, telefono, dias_laborales } = req.body;

  const updateData = {};
  if (nombre_completo) updateData.nombre_completo = nombre_completo;
  if (email) updateData.email = email;
  if (telefono) updateData.telefono = telefono;
  if (dias_laborales) updateData.dias_laborales = dias_laborales;

  if (Object.keys(updateData).length === 0) {
    return res.status(400).json({ msg: "No hay campos para actualizar." });
  }

  try {
    const { error } = await supabase
      .from("equipo")
      .update(updateData)
      .eq("id", id)
      .eq("id_negocio", businessId);

    if (error) throw error;

    res.json({ msg: "Miembro del equipo actualizado con éxito." });
  } catch (error) {
    console.error("Error en updateMember:", error);
    res.status(500).json({ msg: "Error interno del servidor" });
  }
};

exports.deleteMember = async (req, res) => {
  const { businessId } = req.user;
  const { id } = req.params;
  try {
    // Soft delete
    const { error } = await supabase
      .from("equipo")
      .update({ activo: false })
      .eq("id", id)
      .eq("id_negocio", businessId);

    if (error) throw error;

    res.json({ msg: "Miembro del equipo desactivado." });
  } catch (error) {
    console.error("Error en deleteMember:", error);
    res.status(500).json({ msg: "Error interno del servidor" });
  }
};

exports.getEquipoDisponible = async (req, res) => {
  const { businessId } = req.user;
  const { fecha_hora_inicio, fecha_hora_fin } = req.query;

  if (!fecha_hora_inicio || !fecha_hora_fin) {
    return res
      .status(400)
      .json({
        msg: "Los parámetros fecha_hora_inicio y fecha_hora_fin son obligatorios.",
      });
  }

  try {
    // Obtener equipo activo del negocio que NO está en citas en ese horario
    const { data: rows, error } = await supabase
      .from("equipo")
      .select("id, nombre_completo")
      .eq("id_negocio", businessId)
      .eq("activo", true);

    if (error) throw error;

    // Filtrar aquellos que no tienen conflictos de citas
    // TODO: Implement availability check with citas table
    res.json(rows || []);
  } catch (error) {
    console.error("Error en getEquipoDisponible:", error);
    res.status(500).json({ msg: "Error interno del servidor" });
  }
};

// --- Catálogos ---

exports.getTiposServicio = async (req, res) => {
  const { businessId } = req.user;
  try {
    const { data: rows, error } = await supabase
      .from("tipos_servicio")
      .select("*")
      .eq("id_negocio", businessId);

    if (error) throw error;

    res.json(rows || []);
  } catch (error) {
    console.error("Error en getTiposServicio:", error);
    res.status(500).json({ msg: "Error interno del servidor" });
  }
};

exports.createTipoServicio = async (req, res) => {
  const { businessId } = req.user;
  const { nombre, descripcion, url_imagen } = req.body;

  if (!nombre || !descripcion) {
    return res
      .status(400)
      .json({ msg: "Nombre y descripción son obligatorios." });
  }

  try {
    const { data, error } = await supabase
      .from("tipos_servicio")
      .insert({
        id_negocio: businessId,
        nombre,
        descripcion,
        url_imagen: url_imagen || null,
      })
      .select();

    if (error) throw error;

    res.status(201).json({ msg: "Tipo de servicio creado.", id: data[0].id });
  } catch (error) {
    console.error("Error en createTipoServicio:", error);
    res.status(500).json({ msg: "Error interno del servidor" });
  }
};

exports.updateTipoServicio = async (req, res) => {
  const { businessId } = req.user;
  const { id } = req.params;
  const { nombre, descripcion, url_imagen } = req.body;

  const updateData = {};
  if (nombre) updateData.nombre = nombre;
  if (descripcion) updateData.descripcion = descripcion;
  if (url_imagen) updateData.url_imagen = url_imagen;

  if (Object.keys(updateData).length === 0) {
    return res.status(400).json({ msg: "No hay campos para actualizar." });
  }

  try {
    const { error } = await supabase
      .from("tipos_servicio")
      .update(updateData)
      .eq("id", id)
      .eq("id_negocio", businessId);

    if (error) throw error;

    res.json({ msg: "Tipo de servicio actualizado." });
  } catch (error) {
    console.error("Error en updateTipoServicio:", error);
    res.status(500).json({ msg: "Error interno del servidor" });
  }
};

exports.deleteTipoServicio = async (req, res) => {
  const { businessId } = req.user;
  const { id } = req.params;
  try {
    const { error } = await supabase
      .from("tipos_servicio")
      .delete()
      .eq("id", id)
      .eq("id_negocio", businessId);

    if (error) throw error;

    res.json({ msg: "Tipo de servicio eliminado." });
  } catch (error) {
    console.error("Error en deleteTipoServicio:", error);
    res.status(500).json({ msg: "Error interno del servidor" });
  }
};

// --- Gestión de Métodos de Pago ---

exports.getMetodosPago = async (req, res) => {
  const { businessId } = req.user;
  try {
    const { data: rows, error } = await supabase
      .from("metodos_pago")
      .select("*")
      .eq("id_negocio", businessId);

    if (error) throw error;

    res.json(rows || []);
  } catch (error) {
    console.error("Error en getMetodosPago:", error);
    res.status(500).json({ msg: "Error interno del servidor" });
  }
};

exports.createMetodoPago = async (req, res) => {
  const { businessId } = req.user;
  const { nombre } = req.body;

  if (!nombre) {
    return res
      .status(400)
      .json({ msg: "El nombre del método de pago es obligatorio." });
  }

  try {
    const { data, error } = await supabase
      .from("metodos_pago")
      .insert({
        id_negocio: businessId,
        nombre,
      })
      .select();

    if (error) throw error;

    res
      .status(201)
      .json({ msg: "Método de pago creado con éxito.", id: data[0].id });
  } catch (error) {
    if (error.code === "PGRST116" || error.message.includes("duplicate")) {
      return res
        .status(409)
        .json({
          msg: "Ya existe un método de pago con este nombre para tu negocio.",
        });
    }
    console.error("Error al crear método de pago:", error);
    res.status(500).json({ msg: "Error interno del servidor." });
  }
};

exports.updateMetodoPago = async (req, res) => {
  const { businessId } = req.user;
  const { id } = req.params;
  const { nombre } = req.body;

  if (!nombre) {
    return res.status(400).json({ msg: "El nombre del método de pago es obligatorio." });
  }

  try {
    const { error } = await supabase
      .from("metodos_pago")
      .update({ nombre })
      .eq("id", id)
      .eq("id_negocio", businessId);

    if (error) throw error;

    res.json({ msg: "Método de pago actualizado." });
  } catch (error) {
    console.error("Error en updateMetodoPago:", error);
    res.status(500).json({ msg: "Error interno del servidor" });
  }
};

exports.deleteMetodoPago = async (req, res) => {
  const { businessId } = req.user;
  const { id } = req.params;
  try {
    const { error } = await supabase
      .from("metodos_pago")
      .delete()
      .eq("id", id)
      .eq("id_negocio", businessId);

    if (error) throw error;

    res.json({ msg: "Método de pago deshabilitado." });
  } catch (error) {
    console.error("Error en deleteMetodoPago:", error);
    res.status(500).json({ msg: "Error interno del servidor" });
  }
};

// --- Gestión de Galería ---

exports.getGaleria = async (req, res) => {
  const { businessId } = req.user;
  try {
    const { data: rows, error } = await supabase
      .from("negocios_galeria")
      .select("*")
      .eq("id_negocio", businessId);

    if (error) throw error;

    res.json(rows || []);
  } catch (error) {
    console.error("Error en getGaleria:", error);
    res.status(500).json({ msg: "Error interno del servidor" });
  }
};

exports.addImagenGaleria = async (req, res) => {
  const { businessId } = req.user;
  const { id_imagen, orden } = req.body;
  if (!id_imagen)
    return res.status(400).json({ msg: "id_imagen es obligatorio." });
  try {
    const id = uuidv4();
    const { error } = await supabase.from("negocios_galeria").insert({
      id,
      id_negocio: businessId,
      id_imagen,
      orden: orden || 0,
    });

    if (error) throw error;

    res.status(201).json({ msg: "Imagen agregada a la galería.", id });
  } catch (error) {
    console.error("Error en addImagenGaleria:", error);
    res.status(500).json({ msg: "Error interno del servidor" });
  }
};

exports.deleteImagenGaleria = async (req, res) => {
  const { businessId } = req.user;
  const { id } = req.params;
  try {
    const { error } = await supabase
      .from("negocios_galeria")
      .delete()
      .eq("id", id)
      .eq("id_negocio", businessId);

    if (error) throw error;

    res.json({ msg: "Imagen eliminada de la galería." });
  } catch (error) {
    console.error("Error en deleteImagenGaleria:", error);
    res.status(500).json({ msg: "Error interno del servidor" });
  }
};

// --- Agenda ---
exports.getCitasNegocio = async (req, res) => {
  const { businessId } = req.user;
  try {
    const { data: citas, error } = await supabase
      .from("citas")
      .select(
        `
                id,
                fecha_hora_inicio,
                fecha_hora_fin,
                titulo,
                id_solicitud,
                solicitudes_servicio(
                    id,
                    id_usuario,
                    id_negocio,
                    servicio_calle,
                    servicio_ciudad,
                    id_estado
                ),
                usuarios(nombre_completo),
                estados_solicitud(nombre)
            `
      )
      .eq("solicitudes_servicio.id_negocio", businessId)
      .order("fecha_hora_inicio", { ascending: false });

    if (error) throw error;

    res.json(citas || []);
  } catch (error) {
    console.error("Error en getCitasNegocio:", error);
    res.status(500).json({ msg: "Error interno del servidor." });
  }
};
