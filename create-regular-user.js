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
    console.log('⏳ Creando usuario normal: usuario_normal@test.com ...');
    
    // Usamos /register-user que asigna rol de Usuario (2)
    const res = await makeRequest({
      hostname: 'localhost',
      port: 3000, 
      path: '/api/v1/auth/register-user', 
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {
      nombre_completo: "Cliente Normal",
      email: "usuario_normal@test.com",
      password: "Password123!",
      telefono: "5559998888"
    });

    if (res.status === 201 || res.status === 200) {
        console.log('✅ ¡Usuario Normal creado!');
        console.log('📧 Email: usuario_normal@test.com');
        console.log('🔑 Pass:  Password123!');
    } else if (res.status === 409) {
        console.log('⚠️ El usuario ya existe. Puedes usarlo.');
    } else {
        console.log('❌ Error al crear usuario:', res.body);
    }
  } catch (err) {
    console.error('Error de conexión:', err.message);
  }
})();
