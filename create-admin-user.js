const http = require('http');

function makeRequest(options, body = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

(async () => {
  try {
    console.log('⏳ Creando usuario administrador: admin_gui@test.com ...');
    
    const res = await makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/v1/auth/register', // Endpoint correcto para admin
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {
      nombre_completo: "Admin Para Pruebas Web",
      email: "admin_gui@test.com",
      password: "Password123!",
      telefono: "5551112222"
    });

    if (res.status === 201 || res.status === 200) {
        console.log('✅ ¡Usuario creado con éxito!');
        console.log('📧 Email: admin_gui@test.com');
        console.log('🔑 Pass:  Password123!');
    } else if (res.status === 409) {
        console.log('⚠️ El usuario ya existía. Puedes usarlo sin problemas.');
        console.log('📧 Email: admin_gui@test.com');
        console.log('🔑 Pass:  Password123!');
    } else {
        console.log('❌ Error al crear usuario:', res.body);
    }
  } catch (err) {
    console.error('Error de conexión:', err.message);
  }
})();
