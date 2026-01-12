const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

(async () => {
  try {
    const userId = 'b2c41e60-7927-4b8f-b975-a0526f5b81eb';

    // 1. Insertar negocio
    const { data: negocio, error: negError } = await supabase
      .from('negocios')
      .insert({
        id_usuario_owner: userId,
        nombre: 'MubClean Prueba',
        descripcion: 'Negocio de limpieza de muebles',
        url_logo: 'https://via.placeholder.com/200',
        url_banner: 'https://via.placeholder.com/1200x300',
        nombre_dueno: 'Juan Pérez',
        telefono_contacto: '5551234567',
        email_contacto: 'test@example.com',
      })
      .select();

    if (negError) {
      console.error('❌ Error al insertar negocio:', negError);
      throw negError;
    }
    console.log('✅ Negocio insertado:', negocio[0]?.id);

    const negocioId = negocio[0].id;

    console.log('✅ Negocio listo para pruebas');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
})();
