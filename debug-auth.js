const supabase = require('./config/db');

(async () => {
    console.log('Supabase check:');
    if (supabase.auth) {
        console.log('supabase.auth exists');
        if (supabase.auth.admin) {
            console.log('supabase.auth.admin exists');
            console.log('Methods:', Object.keys(supabase.auth.admin));
            if (typeof supabase.auth.admin.getUserByEmail === 'function') {
                console.log('getUserByEmail is a function');
            } else {
                console.log('getUserByEmail is NOT a function');
            }
        } else {
            console.log('supabase.auth.admin does NOT exist');
        }
    } else {
        console.log('supabase.auth does NOT exist');
    }
    process.exit(0);
})();
