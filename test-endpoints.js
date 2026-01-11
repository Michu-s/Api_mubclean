const http = require('http');

function makeRequest(options, body = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: JSON.parse(data)
          });
        } catch {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: data
          });
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
    // Login con usuario existente (creado en Supabase)
    console.log('🔐 Intentando login con usuario de prueba...');
    const loginRes = await makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/v1/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {
      email: 'test@example.com',
      password: '123456'
    });

    console.log('Status:', loginRes.status);
    if (loginRes.status !== 200) {
      console.log('❌ Login fallido:', loginRes.body);
      console.log('\n⚠️ El usuario test@example.com no tiene contraseña establecida.');
      console.log('Usando el negocio de prueba insertado anteriormente...\n');
      
      // Obtener lista de negocios directamente de la BD
      console.log('📊 Negocios en la base de datos:');
      const negociosRes = await makeRequest({
        hostname: 'localhost',
        port: 3000,
        path: '/api/v1/marketplace',
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      console.log('Status:', negociosRes.status);
      console.log(JSON.stringify(negociosRes.body, null, 2));
      process.exit(0);
    }

    console.log('✅ Login exitoso');

    // 3. Obtener negocios
    console.log('\n🏪 Obteniendo negocios...');
    const token = loginRes.body.token;
    const negociosRes = await makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/v1/negocio',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('Status:', negociosRes.status);
    console.log('\n📊 NEGOCIOS:');
    console.log(JSON.stringify(negociosRes.body, null, 2));

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
})();
