import {build} from 'esbuild';
await build({stdin:{contents:"export {createClient} from '@supabase/supabase-js';",resolveDir:process.cwd()},outfile:'vendor/supabase.mjs',bundle:true,format:'esm',platform:'browser',target:['safari16','chrome100'],minify:true,legalComments:'eof'});
