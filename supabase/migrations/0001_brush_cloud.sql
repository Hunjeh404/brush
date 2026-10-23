-- Uses the existing Sudoku login and family-profile permissions; no Sudoku data is changed.
create table public.brush_saves (
 profile_id uuid primary key references public.profiles(id) on delete cascade,
 payload jsonb not null,
 version bigint not null check(version > 0),
 updated_at timestamptz not null default now(),
 constraint brush_save_size check(octet_length(payload::text) <= 1048576)
);
create table public.brush_save_history (
 profile_id uuid not null references public.profiles(id) on delete cascade,
 version bigint not null,
 payload jsonb not null,
 saved_at timestamptz not null,
 primary key(profile_id, version)
);
alter table public.brush_saves enable row level security;
alter table public.brush_save_history enable row level security;
revoke all on public.brush_saves, public.brush_save_history from public, anon, authenticated;
grant select on public.brush_saves, public.brush_save_history to authenticated;
create policy brush_own_read on public.brush_saves for select to authenticated using(private.can_act(profile_id));
create policy brush_history_own_read on public.brush_save_history for select to authenticated using(private.can_act(profile_id));

create function public.brush_load(p uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare result jsonb;
begin
 perform private.require_act(p);
 select jsonb_build_object('version',s.version,'payload',s.payload,'updatedAt',s.updated_at) into result
 from public.brush_saves s where s.profile_id=p;
 return coalesce(result,jsonb_build_object('version',0,'payload',null,'updatedAt',null));
end $$;

create function public.brush_save(p uuid, expected_version bigint, data jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare previous public.brush_saves; saved public.brush_saves;
begin
 perform private.require_act(p);
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
revoke all on function public.brush_load(uuid), public.brush_save(uuid,bigint,jsonb) from public, anon;
grant execute on function public.brush_load(uuid), public.brush_save(uuid,bigint,jsonb) to authenticated;
