-- Sharing is limited to Brush; existing Sudoku permissions are unchanged.
create table public.brush_profile_access (
 auth_user_id uuid not null references auth.users(id) on delete cascade,
 profile_id uuid not null references public.profiles(id) on delete cascade,
 preferred boolean not null default false,
 created_at timestamptz not null default now(),
 primary key(auth_user_id,profile_id)
);
create index brush_profile_access_profile_idx on public.brush_profile_access(profile_id);
create unique index brush_one_preferred_profile on public.brush_profile_access(auth_user_id) where preferred;
alter table public.brush_profile_access enable row level security;
revoke all on public.brush_profile_access from public,anon,authenticated;
grant select on public.brush_profile_access to authenticated;
create policy brush_access_own_read on public.brush_profile_access for select to authenticated using(auth_user_id=(select auth.uid()));

create function private.brush_can_act(p uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select private.can_act(p) or exists(select 1 from public.brush_profile_access a where a.profile_id=p and a.auth_user_id=(select auth.uid()));
$$;
create function private.brush_require_act(p uuid) returns void
language plpgsql stable security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'not_signed_in'; end if;
 if not private.brush_can_act(p) then raise exception 'forbidden'; end if;
end $$;
revoke all on function private.brush_can_act(uuid),private.brush_require_act(uuid) from public,anon;
grant execute on function private.brush_can_act(uuid) to authenticated;

drop policy brush_own_read on public.brush_saves;
create policy brush_own_read on public.brush_saves for select to authenticated using(private.brush_can_act(profile_id));
drop policy brush_history_own_read on public.brush_save_history;
create policy brush_history_own_read on public.brush_save_history for select to authenticated using(private.brush_can_act(profile_id));

create function public.brush_profiles() returns jsonb
language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(row_to_json(r) order by r.preferred desc,r.mine desc,r.nickname),'[]'::jsonb) from (
  select p.id,p.nickname,p.avatar_id,p.is_child,
   exists(select 1 from public.profile_access pa where pa.profile_id=p.id and pa.auth_user_id=(select auth.uid()) and pa.role='self' and pa.revoked_at is null) as mine,
   coalesce(a.preferred,false) as preferred,(a.profile_id is not null) as shared
  from public.profiles p left join public.brush_profile_access a on a.profile_id=p.id and a.auth_user_id=(select auth.uid())
  where auth.uid() is not null and private.brush_can_act(p.id)
 ) r;
$$;
revoke all on function public.brush_profiles() from public,anon;
grant execute on function public.brush_profiles() to authenticated;

create or replace function public.brush_load(p uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare result jsonb;
begin
 perform private.brush_require_act(p);
 select jsonb_build_object('version',s.version,'payload',s.payload,'updatedAt',s.updated_at) into result
 from public.brush_saves s where s.profile_id=p;
 return coalesce(result,jsonb_build_object('version',0,'payload',null,'updatedAt',null));
end $$;

create or replace function public.brush_save(p uuid, expected_version bigint, data jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare previous public.brush_saves; saved public.brush_saves;
begin
 perform private.brush_require_act(p);
 if expected_version is null or expected_version<0 then raise exception 'invalid_version'; end if;
 if data is null or jsonb_typeof(data) <> 'object' or data->>'schema' is distinct from '2'
    or octet_length(data::text)>1048576
    or not(data ?& array['settings','coins','owned','worldsOwned','currentWorld','rooms','history','active','decorationMs','completed','attackCount'])
    or (data - array['schema','settings','coins','owned','worldsOwned','currentWorld','rooms','placements','damage','history','active','decorationMs','completed','attackCount']) <> '{}'::jsonb
 then raise exception 'invalid_save'; end if;
 -- Serialize first inserts as well as later writes for this profile.
 perform 1 from public.profiles where id=p for update;
 select * into previous from public.brush_saves where profile_id=p;
 if coalesce(previous.version,0) <> expected_version then
  return jsonb_build_object('conflict',true,'version',coalesce(previous.version,0),'payload',previous.payload,'updatedAt',previous.updated_at);
 end if;
 if previous.version is not null then
  insert into public.brush_save_history(profile_id,version,payload,saved_at)
  values(p,previous.version,previous.payload,previous.updated_at);
  delete from public.brush_save_history where profile_id=p and version<=previous.version-10;
 end if;
 insert into public.brush_saves(profile_id,payload,version,updated_at)
 values(p,data,expected_version+1,clock_timestamp())
 on conflict(profile_id) do update set payload=excluded.payload,version=excluded.version,updated_at=excluded.updated_at
 returning * into saved;
 return jsonb_build_object('conflict',false,'version',saved.version,'updatedAt',saved.updated_at);
end $$;
