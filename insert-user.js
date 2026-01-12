const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

(async () => {
  try {
    const userId = 'b2c41e60-7927-4bbf-b975-a0526f5d81eb';

    // Verificar si el usuario ya existe
    const { data: existingUser, error: checkError } = await supabase
      .from('usuarios')
      .select('*')
      .eq('id', userId)
      .single();

    if (existingUser) {
      console.log('✅ Usuario ya existe:', existingUser.id);
    } else if (checkError?.code === 'PGRST116') {
      // No existe, insertar
      const { data: newUser, error: insertError } = await supabase
        .from('usuarios')
        .insert({
          id: userId,
          email: 'test@example.com',
          nombre: 'Usuario Test',
          tipo_usuario: 'negocio',
          estado: 'activo',
        })
        .select();

      if (insertError) {
        console.error('❌ Error al insertar usuario:', insertError);
        throw insertError;
      }
      console.log('✅ Usuario insertado:', newUser[0]?.id);
    } else if (checkError) {
      throw checkError;
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
})();
