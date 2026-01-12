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
    const randomId = Math.floor(Math.random() * 10000);
    const email = `admin${randomId}@test.com`;
    const password = 'Password123!';
    
    console.log(`🔐 Registrando nuevo admin: ${email}...`);
    
    // 1. Register Admin
    const registerRes = await makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/v1/auth/register',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {
      nombre_completo: `Admin Test ${randomId}`,
      email: email,
      password: password,
      telefono: '5555555555'
    });

    if (registerRes.status !== 200 && registerRes.status !== 201) {
        console.log('❌ Registro fallido:', registerRes.body);
        
        // Si falla porque ya existe, intentamos login
        if(registerRes.status === 409) {
             console.log("⚠️ Usuario ya existe, intentando login...");
        } else {
             process.exit(1);
        }
    } else {
        console.log('✅ Registro exitoso.');
    }

    // 2. Login (o usar token del registro si lo devuelve, pero auth controller lo devuelve)
    // El controller devuelve el token en el registro: registerRes.body.token
    let token = registerRes.body.token;

    if (!token) {
        // Fallback login
        const loginRes = await makeRequest({
            hostname: 'localhost',
            port: 3000,
            path: '/api/v1/auth/login',
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, {
            email: email,
            password: password
        });
        token = loginRes.body.token;
    }

    if(!token) {
        console.error("❌ No se pudo obtener token.");
        process.exit(1);
    }

    console.log("🔑 Token obtenido.");

    // 3. Crear Negocio
    console.log("🏢 Creando negocio...");
    const createBizRes = await makeRequest({
        hostname: 'localhost',
        port: 3000,
        path: '/api/v1/negocio',
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    }, {
        nombre: `Negocio Test ${randomId}`,
        telefono_contacto: "1234567890",
        email_contacto: email
    });

    let businessId = createBizRes.body.id;
    console.log('Create Business Status:', createBizRes.status);
    
    if (createBizRes.status === 201 && businessId) {
        console.log(`✅ Negocio creado con ID: ${businessId}`);
    } else {
        // Maybe user already has a business?
        console.log("⚠️ No se pudo crear negocio (quizás ya tiene uno?), intentando obtener perfil...");
        const myBizRes = await makeRequest({
            hostname: 'localhost',
            port: 3000,
            path: '/api/v1/negocio',
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        if(myBizRes.status === 200 && myBizRes.body.id) {
            businessId = myBizRes.body.id;
            console.log(`✅ Negocio existente encontrado: ${businessId}`);
        } else {
            console.error("❌ No se pudo obtener negocio.");
            process.exit(1);
        }
    }

    // 4. Actualizar Negocio usando ID en URL
    console.log(`\n📝 Probando UPDATE con ID en URL: /api/v1/negocio/${businessId}`);
    const newName = `Negocio Updated ${randomId}`;

    const updateRes = await makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: `/api/v1/negocio/${businessId}`, // <--- AQUÍ ESTÁ EL TEST CLAVE
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    }, {
      nombre: newName
    });

    console.log('Status Update:', updateRes.status);
    console.log('Body Update:', JSON.stringify(updateRes.body, null, 2));

    if (updateRes.status === 200) {
        console.log("✅ Update exitoso con ID en URL.");
    } else {
        console.log("❌ Update falló.");
        process.exit(1);
    }
    
    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
})();