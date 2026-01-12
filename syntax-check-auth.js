try {
    require('./controllers/auth.controller');
    console.log('✅ Syntax check passed for auth.controller.js');
} catch (error) {
    console.error('❌ Syntax error:', error);
    process.exit(1);
}
