-- Reversible, Brush-only deletion. Shared Sudoku identities and records stay intact.
create table public.brush_deleted_profiles (
 profile_id uuid primary key references public.profiles(id) on delete cascade,
 deleted_by uuid references auth.users(id) on delete set null,
 deleted_at timestamptz not null default now()
);
create index brush_deleted_profiles_actor_idx on public.brush_deleted_profiles(deleted_by);
alter table public.brush_deleted_profiles enable row level security;
revoke all on public.brush_deleted_profiles from public,anon,authenticated;

create function private.brush_can_manage(p uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and (
  exists(select 1 from public.profile_access a where a.profile_id=p and a.auth_user_id=(select auth.uid()) and a.revoked_at is null and a.role in ('self','guardian'))
  or exists(select 1 from public.brush_profile_access a where a.profile_id=p and a.auth_user_id=(select auth.uid()))
  or exists(select 1 from public.family_members child join public.family_members adult on adult.family_id=child.family_id and adult.role='guardian'
   join public.profile_access a on a.profile_id=adult.profile_id and a.role='self' and a.revoked_at is null
   where child.profile_id=p and child.role='child' and a.auth_user_id=(select auth.uid()))
 );
$$;
revoke all on function private.brush_can_manage(uuid) from public,anon,authenticated;

create or replace function private.brush_require_act(p uuid) returns void
language plpgsql stable security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'not_signed_in'; end if;
 if not private.brush_can_act(p) then raise exception 'forbidden'; end if;
 if exists(select 1 from public.brush_deleted_profiles where profile_id=p) then raise exception 'profile_deleted'; end if;
end $$;

create or replace function public.brush_profiles() returns jsonb
language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(row_to_json(r) order by r.preferred desc,r.mine desc,r.nickname,r.id),'[]'::jsonb) from (
  select p.id,p.nickname,p.avatar_id,p.is_child,
   exists(select 1 from public.profile_access pa where pa.profile_id=p.id and pa.auth_user_id=(select auth.uid()) and pa.role='self' and pa.revoked_at is null) as mine,
   coalesce(a.preferred,false) as preferred,(a.profile_id is not null) as shared,private.brush_can_manage(p.id) as can_delete
  from public.profiles p left join public.brush_profile_access a on a.profile_id=p.id and a.auth_user_id=(select auth.uid())
  where auth.uid() is not null and private.brush_can_act(p.id) and not exists(select 1 from public.brush_deleted_profiles d where d.profile_id=p.id)
 ) r;
$$;
create function public.brush_trash() returns jsonb
language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('id',p.id,'nickname',p.nickname) order by d.deleted_at desc),'[]'::jsonb)
 from public.brush_deleted_profiles d join public.profiles p on p.id=d.profile_id
 where auth.uid() is not null and private.brush_can_manage(p.id);
$$;
create function public.brush_delete_profile(p uuid,confirm_name text) returns void
language plpgsql security definer set search_path='' as $$
declare actual text;
begin
 if auth.uid() is null then raise exception 'not_signed_in'; end if;
 if not private.brush_can_manage(p) then raise exception 'forbidden'; end if;
 select nickname into actual from public.profiles where id=p for update;
 if actual is null or confirm_name is distinct from actual then raise exception 'name_mismatch'; end if;
 insert into public.brush_deleted_profiles(profile_id,deleted_by) values(p,auth.uid()) on conflict do nothing;
end $$;
create function public.brush_restore_profile(p uuid) returns void
language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'not_signed_in'; end if;
 if not private.brush_can_manage(p) then raise exception 'forbidden'; end if;
 perform 1 from public.profiles where id=p for update;
 delete from public.brush_deleted_profiles where profile_id=p;
end $$;
-- Keep creating children possible even when the account's adult profile is hidden in Brush.
create function public.brush_create_profile(nickname text) returns uuid
language plpgsql security definer set search_path='' as $$
declare guardian uuid;
begin
 if auth.uid() is null then raise exception 'not_signed_in'; end if;
 select a.profile_id into guardian from public.profile_access a join public.profiles p on p.id=a.profile_id
 where a.auth_user_id=auth.uid() and a.role='self' and a.revoked_at is null and not p.is_child limit 1;
 if guardian is null then return public.create_my_profile(nickname,'','hestia'); end if;
 return public.create_child_profile(guardian,nickname,'','hestia');
end $$;
revoke all on function public.brush_trash(),public.brush_delete_profile(uuid,text),public.brush_restore_profile(uuid),public.brush_create_profile(text) from public,anon;
grant execute on function public.brush_trash(),public.brush_delete_profile(uuid,text),public.brush_restore_profile(uuid),public.brush_create_profile(text) to authenticated;

create function private.brush_progress_ms(data jsonb) returns numeric
language sql immutable set search_path='' as $$
 select greatest(coalesce((data->>'brushTotalMs')::numeric,0),coalesce((select sum(greatest(0,least(600,coalesce((h->>'duration')::numeric,0))))*1000 from jsonb_array_elements(data->'history') h),0))
  + coalesce((data->'active'->>'elapsedMs')::numeric,0);
$$;
revoke all on function private.brush_progress_ms(jsonb) from public,anon,authenticated;

create or replace function public.brush_save(p uuid,expected_version bigint,data jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare previous public.brush_saves; saved public.brush_saves; incoming numeric; existing numeric;
begin
 perform private.brush_require_act(p);
 if expected_version is null or expected_version<0 then raise exception 'invalid_version'; end if;
 if data is null or jsonb_typeof(data)<>'object' or data->>'schema' is distinct from '2'
  or octet_length(data::text)>1048576
  or not(data ?& array['settings','coins','owned','worldsOwned','currentWorld','rooms','history','active','decorationMs','completed','attackCount'])
  or (data-array['schema','settings','coins','owned','worldsOwned','currentWorld','rooms','placements','damage','history','active','decorationMs','completed','attackCount','brushTotalMs','modifiedAt'])<>'{}'::jsonb
  or jsonb_typeof(data->'history')<>'array' then raise exception 'invalid_save'; end if;
 if coalesce(data->>'brushTotalMs','0') !~ '^[0-9]+$' or coalesce(data->>'modifiedAt','0') !~ '^[0-9]+$'
  or coalesce((data->>'brushTotalMs')::numeric,0)>9007199254740991 or coalesce((data->>'modifiedAt')::numeric,0)>9007199254740991 then raise exception 'invalid_save'; end if;
 perform 1 from public.profiles where id=p for update;
 -- Check again under the same lock as deletion, so an in-flight save cannot revive a profile.
 perform private.brush_require_act(p);
 select * into previous from public.brush_saves where profile_id=p;
 if previous.version is not null then
  if previous.payload=data then
   return jsonb_build_object('conflict',false,'version',previous.version,'updatedAt',previous.updated_at);
  end if;
  incoming:=private.brush_progress_ms(data);existing:=private.brush_progress_ms(previous.payload);
  if incoming<existing or (incoming=existing and expected_version<>previous.version and coalesce((data->>'modifiedAt')::numeric,0)<=coalesce((previous.payload->>'modifiedAt')::numeric,0)) then
   return jsonb_build_object('conflict',true,'version',previous.version,'payload',previous.payload,'updatedAt',previous.updated_at);
  end if;
  insert into public.brush_save_history(profile_id,version,payload,saved_at) values(p,previous.version,previous.payload,previous.updated_at);
  delete from public.brush_save_history where profile_id=p and version<=previous.version-10;
 end if;
 insert into public.brush_saves(profile_id,payload,version,updated_at) values(p,data,coalesce(previous.version,0)+1,clock_timestamp())
 on conflict(profile_id) do update set payload=excluded.payload,version=excluded.version,updated_at=excluded.updated_at returning * into saved;
 return jsonb_build_object('conflict',false,'version',saved.version,'updatedAt',saved.updated_at);
end $$;
