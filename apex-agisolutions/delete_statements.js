require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data, error } = await supabase.from('statements').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  console.log("Deleted statements", error ? error : "Success");
  
  const { error: err2 } = await supabase.from('transactions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  console.log("Deleted transactions", err2 ? err2 : "Success");
}
run();
