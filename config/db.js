// config/db.js
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Crear cliente de Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: SUPABASE_URL o SUPABASE_KEY no están definidos en .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Prueba de conexión
supabase.auth.getUser()
  .then(() => {
    console.log('✅ Conexión a Supabase establecida correctamente.');
  })
  .catch(err => {
    console.error('❌ Error al conectar con Supabase:', err.message);
    process.exit(1);
  });

module.exports = supabase;
