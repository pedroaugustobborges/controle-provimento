const https = require('https');

const SUPABASE_URL = 'npmqwwxhqwejgdodinba.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5wbXF3d3hocXdlamdkb2RpbmJhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcwNDIyOTIsImV4cCI6MjA5MjYxODI5Mn0.GdOJpkpQW9r8r-ToD3LMAQQbY3CK5rstVOqRsHDj4a4';

function query(path) {
  return new Promise((resolve, reject) => {
    const opt = {
      hostname: SUPABASE_URL,
      path,
      headers: {
        'apikey': ANON_KEY,
        'Authorization': `Bearer ${ANON_KEY}`,
      }
    };
    https.get(opt, r => {
      let d = '';
      r.on('data', c => d += c);
      r.on('end', () => resolve(JSON.parse(d)));
    }).on('error', reject);
  });
}

async function main() {
  console.log('=== Querying profiles table for ana.nunes@agirsaude.org.br ===');
  const profiles = await query('/rest/v1/profiles?email=eq.ana.nunes%40agirsaude.org.br&select=id,email,nome_completo,cargo,perfil,status');
  console.log('Profile rows found:', profiles.length);
  console.log(JSON.stringify(profiles, null, 2));
}

main().catch(console.error);
