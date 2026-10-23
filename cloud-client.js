import {SUPABASE_URL,SUPABASE_KEY} from './cloud-config.js';
let client;
export async function getCloudClient(){
 if(!client){
  const {createClient}=await import('./vendor/supabase.mjs');
  client=createClient(SUPABASE_URL,SUPABASE_KEY,{
   auth:{flowType:'pkce',persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,storageKey:'olympus-brush-auth-v1'},
   global:{fetch:(url,options={})=>fetch(url,{...options,signal:options.signal||AbortSignal.timeout(12000)})}
  });
 }
 return client;
}
export function apiFor(client){return {
 async rpc(name,args={}){const {data,error}=await client.rpc(name,args);if(error)throw error;return data;},
 async load(p){return this.rpc('brush_load',{p});},
 async save(p,version,data){return this.rpc('brush_save',{p,expected_version:version,data});}
};}
export function cloudError(error){
 if(error?.code==='PGRST202'||error?.message?.includes('brush_load'))return '계정 저장소를 준비 중이에요. 기기 기록은 안전하게 보관돼요.';
 if(error?.code==='42501'||error?.message==='forbidden')return '이 프로필에 접근할 수 없어요. 다시 로그인해주세요.';
 if(error?.status===401||error?.code==='PGRST301'||error?.message==='not_signed_in')return '로그인이 만료됐어요. 다시 로그인하면 기기 기록을 이어서 저장해요.';
 return '서버에 연결하지 못했어요. 기기에는 저장됐으며 연결되면 다시 시도해요.';
}
