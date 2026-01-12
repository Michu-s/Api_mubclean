const http = require('http');

const data = JSON.stringify({
  nombre_negocio: "Test Duplicate",
  nombre_completo: "Test User",
  email: "admin999@gmail.com", // A user we know exists based on previous attempts/screenshots
  password: "password123",
  telefono: "5555555555"
});

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/v1/auth/register',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = http.request(options, (res) => {
  let body = '';
  res.on('data', (chunk) => { body += chunk; });
  res.on('end', () => {
    console.log(`Status Code: ${res.statusCode}`);
    console.log(`Response Body: ${body}`);
    if (res.statusCode === 409 && body.includes('El email ya está registrado')) {
      console.log('✅ TEST PASSED: Duplicate check works (via Auth).');
    } else {
      console.log('❌ TEST FAILED: Unexpected response.');
    }
  });
});

req.on('error', (error) => {
  console.error('Error:', error);
});

req.write(data);
req.end();
