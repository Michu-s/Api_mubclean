const supabase = require('./config/db');

(async () => {
  try {
    // Get one row to see the keys
    const { data, error } = await supabase
      .from('negocios')
      .select('*')
      .limit(1);

    if (error) throw error;
    
    if (data.length > 0) {
        console.log('Columns in negocios table:', Object.keys(data[0]));
        console.log('Sample row:', data[0]);
    } else {
        console.log('No rows in negocios table found to infer schema.');
    }
  } catch (err) {
    console.error('Error:', err);
  }
})();
