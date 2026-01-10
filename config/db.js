// config/db.js
const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'mubclean',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Mensaje de éxito para verificar la conexión al iniciar
pool.getConnection()
  .then(connection => {
    console.log('✅ Conexión a la base de datos establecida.');
    connection.release();
  })
  .catch(err => {
    console.error('❌ Error al conectar con la base de datos:', err.message);
    // Salir del proceso si no se puede conectar a la BD es una buena práctica
    process.exit(1);
  });

module.exports = pool;
