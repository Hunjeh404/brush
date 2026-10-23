begin;
do $$
declare u uuid:=gen_random_uuid(); partner uuid:=gen_random_uuid(); p uuid:=gen_random_uuid(); other uuid:=gen_random_uuid();
begin
 insert into auth.users(id) values(u),(partner);
 insert into public.profiles(id,nickname) values(p,'brush QA'),(other,'brush QA');
 insert into public.profile_access(profile_id,auth_user_id,role) values(p,u,'self'),(other,u,'guardian');
 insert into public.brush_profile_access(auth_user_id,profile_id,preferred) values(partner,p,true);
 perform set_config('brush_test.partner',partner::text,true);perform set_config('brush_test.owner',u::text,true);perform set_config('brush_test.profile',p::text,true);perform set_config('brush_test.other',other::text,true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',u,'role','authenticated')::text,true);
 if has_function_privilege('anon','public.brush_delete_profile(uuid,text)','EXECUTE') or has_function_privilege('anon','public.brush_restore_profile(uuid)','EXECUTE') or has_function_privilege('anon','public.brush_trash()','EXECUTE') then raise exception 'anonymous RPC'; end if;
 if has_table_privilege('authenticated','public.brush_deleted_profiles','INSERT') or has_table_privilege('authenticated','public.brush_saves','UPDATE') then raise exception 'direct writes'; end if;
end $$;
set local role authenticated;
do $$
declare p uuid:=current_setting('brush_test.profile')::uuid; other uuid:=current_setting('brush_test.other')::uuid; r jsonb; bad boolean; payload jsonb:='{"schema":2,"settings":{},"coins":20,"owned":[],"worldsOwned":[],"currentWorld":"garden","rooms":{},"history":[],"active":null,"decorationMs":0,"completed":0,"attackCount":0,"brushTotalMs":300000,"modifiedAt":100}';
begin
 r:=public.brush_save(p,0,payload);if r->>'version'<>'1' then raise exception 'initial'; end if;
 r:=public.brush_save(p,0,payload);if r->>'version'<>'1' or r->>'conflict'<>'false' then raise exception 'retry not idempotent'; end if;
 r:=public.brush_save(p,1,payload||'{"brushTotalMs":1000,"modifiedAt":99999}');if r->>'conflict'<>'true' then raise exception 'shorter latest overwrote longer'; end if;
 r:=public.brush_save(p,0,payload||'{"brushTotalMs":600000,"modifiedAt":101}');if r->>'version'<>'2' or r->>'conflict'<>'false' then raise exception 'longer stale rejected'; end if;
 payload:=payload||'{"brushTotalMs":600000,"modifiedAt":102,"coins":5}';
 r:=public.brush_save(p,1,payload);if r->>'version'<>'3' then raise exception 'equal time newer purchase lost'; end if;
 r:=public.brush_save(p,2,payload||'{"modifiedAt":101,"coins":20}');if r->>'conflict'<>'true' then raise exception 'old purchase reverted'; end if;
 for i in 1..12 loop r:=public.brush_save(p,(r->>'version')::bigint,payload||jsonb_build_object('modifiedAt',102+i)); end loop;
 if (select count(*) from public.brush_save_history where profile_id=p)<>10 then raise exception 'history retention'; end if;
 bad:=false;begin perform public.brush_save(p,15,payload||'{"auth":{"hash":"forbidden"}}');exception when others then bad:=true;end;if not bad then raise exception 'credentials accepted';end if;
 bad:=false;begin perform public.brush_delete_profile(p,'wrong name');exception when others then bad:=true;end;if not bad then raise exception 'wrong name deletion';end if;
 perform public.brush_delete_profile(p,'brush QA');
 if exists(select 1 from jsonb_array_elements(public.brush_profiles()) x where x->>'id'=p::text) then raise exception 'deleted listed';end if;
 if not exists(select 1 from jsonb_array_elements(public.brush_profiles()) x where x->>'id'=other::text) then raise exception 'duplicate name deleted wrong id';end if;
 if not private.can_act(p) then raise exception 'Sudoku permission changed';end if;
 bad:=false;begin perform public.brush_save(p,15,payload||'{"brushTotalMs":99999999}');exception when others then bad:=true;end;if not bad then raise exception 'deleted resurrected by stale device';end if;
 bad:=false;begin perform public.brush_load(p);exception when others then bad:=true;end;if not bad then raise exception 'deleted load';end if;
 if not exists(select 1 from jsonb_array_elements(public.brush_trash()) x where x->>'id'=p::text) then raise exception 'trash not recoverable';end if;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('brush_test.partner'),'role','authenticated')::text,true);
 perform public.brush_restore_profile(p);if public.brush_load(p)->>'version'<>'15' then raise exception 'restore lost progress';end if;
 if private.can_act(p) then raise exception 'Brush sharing leaked into Sudoku';end if;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',gen_random_uuid(),'role','authenticated')::text,true);
 bad:=false;begin perform public.brush_delete_profile(p,'brush QA');exception when others then bad:=true;end;if not bad then raise exception 'unrelated delete';end if;
 bad:=false;begin perform public.brush_restore_profile(p);exception when others then bad:=true;end;if not bad then raise exception 'unrelated restore';end if;
 bad:=false;begin perform public.brush_save(p,15,payload);exception when others then bad:=true;end;if not bad then raise exception 'unrelated save';end if;
 if public.brush_trash()<>'[]'::jsonb then raise exception 'unrelated trash';end if;
 perform set_config('request.jwt.claims','{}',true);
 bad:=false;begin perform public.brush_delete_profile(p,'brush QA');exception when others then bad:=true;end;if not bad then raise exception 'anonymous delete';end if;
end $$;
reset role;
rollback;
select 'auto sync, same-time purchases, deletion, duplicate names, restore, permissions and retention passed; all synthetic rows rolled back' as result;
