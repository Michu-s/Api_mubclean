const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

(async () => {
  try {
    console.log('🔍 Leyendo usuarios de Supabase...');
    const { data, error } = await supabase
      .from('usuarios')
      .select('*')
      .limit(5);

    if (error) {
      console.error('❌ Error en SELECT:', error);
      process.exit(1);
    }
    console.log('✅ SELECT OK — Filas encontradas:', data.length);
    console.log(JSON.stringify(data, null, 2));
  } catch (e) {
    console.error('❌ Error:', e);
    process.exit(1);
  }
})();