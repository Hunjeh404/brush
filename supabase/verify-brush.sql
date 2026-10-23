-- Integration checks use disposable rows inside a rolled-back transaction.
begin;
do $$
declare u uuid:=gen_random_uuid(); partner uuid:=gen_random_uuid(); p uuid:=gen_random_uuid();
begin
 insert into auth.users(id) values(u),(partner);
 insert into public.profiles(id,nickname) values(p,'brush QA');
 insert into public.profile_access(profile_id,auth_user_id,role) values(p,u,'self');
 insert into public.brush_profile_access(auth_user_id,profile_id,preferred) values(partner,p,true);
 perform set_config('brush_test.partner',partner::text,true);
 perform set_config('brush_test.profile',p::text,true);
 perform set_config('brush_test.owner',u::text,true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',u,'role','authenticated')::text,true);
 if has_function_privilege('anon','public.brush_load(uuid)','EXECUTE') or has_function_privilege('anon','public.brush_save(uuid,bigint,jsonb)','EXECUTE') then raise exception 'anonymous RPC access'; end if;
 if has_table_privilege('authenticated','public.brush_saves','INSERT') or has_table_privilege('authenticated','public.brush_saves','UPDATE') then raise exception 'direct writes enabled'; end if;
end $$;
set local role authenticated;
do $$
declare p uuid:=current_setting('brush_test.profile')::uuid; result jsonb; rejected boolean; payload jsonb:='{"schema":2,"settings":{},"coins":20,"owned":[],"worldsOwned":[],"currentWorld":"garden","rooms":{},"history":[],"active":null,"decorationMs":0,"completed":0,"attackCount":0}';
begin
 if public.brush_load(p)->>'version' <> '0' then raise exception 'initial load'; end if;
 result:=public.brush_save(p,0,payload);
 if result->>'version'<>'1' or result->>'conflict'<>'false' then raise exception 'initial save'; end if;
 result:=public.brush_save(p,0,payload);
 if result->>'conflict'<>'true' or result->>'version'<>'1' then raise exception 'lost update guard'; end if;
 rejected:=false;
 begin perform public.brush_save(p,1,payload||'{"auth":{"hash":"forbidden"}}'); exception when others then rejected:=true; end;
 if not rejected then raise exception 'credential upload accepted'; end if;
 for i in 1..12 loop perform public.brush_save(p,i,payload); end loop;
 if (select count(*) from public.brush_save_history where profile_id=p)<>10 then raise exception 'history retention'; end if;
 if (select count(*) from public.brush_saves where profile_id=p)<>1 then raise exception 'owner RLS access'; end if;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('brush_test.partner'),'role','authenticated')::text,true);
 if private.can_act(p) then raise exception 'Brush sharing leaked into Sudoku'; end if;
 if public.brush_load(p)->>'version'<>'13' then raise exception 'shared profile read failed'; end if;
 if not exists(select 1 from jsonb_array_elements(public.brush_profiles()) entry where entry->>'id'=p::text and entry->>'preferred'='true') then raise exception 'shared profile listing failed'; end if;
 result:=public.brush_save(p,13,payload);
 if result->>'version'<>'14' then raise exception 'shared profile write failed'; end if;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',gen_random_uuid(),'role','authenticated')::text,true);
 if (select count(*) from public.brush_saves where profile_id=p)<>0 then raise exception 'unrelated read allowed'; end if;
 if (select count(*) from public.brush_save_history where profile_id=p)<>0 then raise exception 'unrelated history allowed'; end if;
 rejected:=false;
 begin perform public.brush_load(p); exception when others then rejected:=true; end;
 if not rejected then raise exception 'unrelated RPC read allowed'; end if;
 rejected:=false;
 begin perform public.brush_save(p,13,payload); exception when others then rejected:=true; end;
 if not rejected then raise exception 'unrelated RPC write allowed'; end if;
 perform set_config('request.jwt.claims','{}',true);
 rejected:=false;
 begin perform public.brush_load(p); exception when others then rejected:=true; end;
 if not rejected then raise exception 'missing identity accepted'; end if;
end $$;
reset role;
rollback;
select 'brush permission, version and history checks passed; all test rows rolled back' as result;
