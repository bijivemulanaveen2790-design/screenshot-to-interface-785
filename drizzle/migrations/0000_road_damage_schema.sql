-- ===== Enums =====
create type public.app_role as enum ('admin', 'inspector');
create type public.complaint_status as enum ('Reported', 'Under Review', 'In Progress', 'Resolved');
create type public.severity_level as enum ('Low', 'Medium', 'High', 'Critical');
create type public.damage_type as enum ('pothole', 'alligator_crack', 'longitudinal_crack', 'transverse_crack', 'rutting', 'patch_failure', 'other');
create type public.location_source as enum ('gps', 'map', 'manual');
create type public.ai_status as enum ('pending', 'completed', 'unavailable', 'failed');
create type public.image_kind as enum ('report', 'after_repair');

-- ===== Profiles =====
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  email text,
  created_at timestamptz not null default now()
);
grant select, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;

-- ===== Roles =====
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create or replace function public.is_staff(_user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role in ('inspector', 'admin'))
$$;

create policy "Users read own roles; admins read all" on public.user_roles
  for select to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(), 'admin'));

create policy "Users read own profile; staff read all" on public.profiles
  for select to authenticated using (id = auth.uid() or public.is_staff(auth.uid()));
create policy "Users update own profile" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- New user: create profile; very first account becomes admin + inspector
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name, email)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)), new.email)
  on conflict (id) do nothing;

  if not exists (select 1 from public.user_roles where role = 'admin') then
    insert into public.user_roles (user_id, role) values (new.id, 'admin'), (new.id, 'inspector')
    on conflict do nothing;
  end if;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ===== Complaints =====
create table public.complaints (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  user_id uuid,
  is_demo boolean not null default false,
  description text not null check (char_length(description) between 10 and 2000),
  road_name text check (road_name is null or char_length(road_name) <= 200),
  address text check (address is null or char_length(address) <= 500),
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  location_source public.location_source not null,
  location_accuracy_m double precision,
  status public.complaint_status not null default 'Reported',
  ai_status public.ai_status not null default 'pending',
  ai_damage_type public.damage_type,
  ai_severity public.severity_level,
  ai_confidence real,
  ai_severity_score real,
  ai_model_version text,
  ai_analyzed_at timestamptz,
  ai_message text,
  damage_type public.damage_type,
  severity public.severity_level,
  classification_reviewed_by uuid,
  classification_reviewed_at timestamptz,
  assigned_team text,
  resolution_note text,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index complaints_user_idx on public.complaints (user_id, created_at desc);
create index complaints_status_idx on public.complaints (status, created_at desc);
grant select, insert on public.complaints to authenticated;
grant all on public.complaints to service_role;
alter table public.complaints enable row level security;

create or replace function public.owns_complaint(_complaint_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.complaints where id = _complaint_id and user_id = auth.uid())
$$;

create or replace function public.can_view_complaint(_complaint_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_staff(auth.uid()) or public.owns_complaint(_complaint_id)
$$;

create policy "Citizens read own complaints; staff read all" on public.complaints
  for select to authenticated using (user_id = auth.uid() or public.is_staff(auth.uid()));
create policy "Citizens create own complaints" on public.complaints
  for insert to authenticated with check (user_id = auth.uid() and is_demo = false and status = 'Reported');

-- Reference number + sanitising of citizen-submitted rows
create or replace function public.generate_complaint_reference()
returns text language plpgsql volatile set search_path = public as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  candidate text;
  i int;
begin
  loop
    candidate := 'RD-' || to_char(now(), 'YYMM') || '-';
    for i in 1..6 loop
      candidate := candidate || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    exit when not exists (select 1 from public.complaints where reference = candidate);
  end loop;
  return candidate;
end;
$$;

create or replace function public.complaints_before_insert()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.reference := public.generate_complaint_reference();
  if auth.uid() is not null then
    new.user_id := auth.uid();
    new.is_demo := false;
    new.status := 'Reported';
    new.ai_status := 'pending';
    new.ai_damage_type := null; new.ai_severity := null; new.ai_confidence := null;
    new.ai_severity_score := null; new.ai_model_version := null; new.ai_analyzed_at := null; new.ai_message := null;
    new.damage_type := null; new.severity := null;
    new.classification_reviewed_by := null; new.classification_reviewed_at := null;
    new.assigned_team := null; new.resolution_note := null; new.resolved_at := null;
    new.created_at := now(); new.updated_at := now();
  end if;
  return new;
end;
$$;
create trigger complaints_before_insert before insert on public.complaints
  for each row execute function public.complaints_before_insert();

-- ===== Images =====
create table public.complaint_images (
  id uuid primary key default gen_random_uuid(),
  complaint_id uuid not null references public.complaints(id) on delete cascade,
  storage_path text not null unique,
  kind public.image_kind not null default 'report',
  content_type text not null check (content_type in ('image/jpeg', 'image/png', 'image/webp')),
  size_bytes integer not null check (size_bytes > 0 and size_bytes <= 10485760),
  uploaded_by uuid not null,
  created_at timestamptz not null default now()
);
create index complaint_images_complaint_idx on public.complaint_images (complaint_id);
grant select, insert on public.complaint_images to authenticated;
grant all on public.complaint_images to service_role;
alter table public.complaint_images enable row level security;
create policy "View images of visible complaints" on public.complaint_images
  for select to authenticated using (public.can_view_complaint(complaint_id));
create policy "Citizens add report photos; staff add after-repair photos" on public.complaint_images
  for insert to authenticated with check (
    uploaded_by = auth.uid()
    and (
      (kind = 'report' and public.owns_complaint(complaint_id))
      or (kind = 'after_repair' and public.is_staff(auth.uid()))
    )
  );

-- ===== AI detections (written by the server only) =====
create table public.ai_detections (
  id uuid primary key default gen_random_uuid(),
  complaint_id uuid not null references public.complaints(id) on delete cascade,
  image_id uuid not null references public.complaint_images(id) on delete cascade,
  label public.damage_type not null,
  raw_label text not null,
  confidence real not null check (confidence between 0 and 1),
  bbox jsonb not null,
  image_width integer,
  image_height integer,
  model_version text,
  created_at timestamptz not null default now()
);
create index ai_detections_complaint_idx on public.ai_detections (complaint_id);
grant select on public.ai_detections to authenticated;
grant all on public.ai_detections to service_role;
alter table public.ai_detections enable row level security;
create policy "View detections of visible complaints" on public.ai_detections
  for select to authenticated using (public.can_view_complaint(complaint_id));

-- ===== Status history =====
create table public.status_history (
  id uuid primary key default gen_random_uuid(),
  complaint_id uuid not null references public.complaints(id) on delete cascade,
  from_status public.complaint_status,
  to_status public.complaint_status not null,
  changed_by uuid,
  changed_by_name text,
  note text,
  created_at timestamptz not null default now()
);
create index status_history_complaint_idx on public.status_history (complaint_id, created_at);
grant select on public.status_history to authenticated;
grant all on public.status_history to service_role;
alter table public.status_history enable row level security;
create policy "View history of visible complaints" on public.status_history
  for select to authenticated using (public.can_view_complaint(complaint_id));

-- ===== Updates / inspection notes =====
create table public.complaint_updates (
  id uuid primary key default gen_random_uuid(),
  complaint_id uuid not null references public.complaints(id) on delete cascade,
  author_id uuid,
  author_name text,
  body text not null check (char_length(body) between 1 and 2000),
  is_internal boolean not null default false,
  created_at timestamptz not null default now()
);
create index complaint_updates_complaint_idx on public.complaint_updates (complaint_id, created_at);
grant select on public.complaint_updates to authenticated;
grant all on public.complaint_updates to service_role;
alter table public.complaint_updates enable row level security;
create policy "Staff read all updates; citizens read public updates on own complaints" on public.complaint_updates
  for select to authenticated using (
    public.is_staff(auth.uid()) or (is_internal = false and public.owns_complaint(complaint_id))
  );

-- ===== Repair assignments =====
create table public.repair_assignments (
  id uuid primary key default gen_random_uuid(),
  complaint_id uuid not null references public.complaints(id) on delete cascade,
  team_name text not null check (char_length(team_name) between 1 and 120),
  note text,
  assigned_by uuid,
  assigned_by_name text,
  created_at timestamptz not null default now()
);
create index repair_assignments_complaint_idx on public.repair_assignments (complaint_id, created_at);
grant select on public.repair_assignments to authenticated;
grant all on public.repair_assignments to service_role;
alter table public.repair_assignments enable row level security;
create policy "View assignments of visible complaints" on public.repair_assignments
  for select to authenticated using (public.can_view_complaint(complaint_id));

-- ===== Notifications =====
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  complaint_id uuid references public.complaints(id) on delete cascade,
  reference text,
  message text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications (user_id, created_at desc);
grant select on public.notifications to authenticated;
grant update (read_at) on public.notifications to authenticated;
grant all on public.notifications to service_role;
alter table public.notifications enable row level security;
create policy "Users read own notifications" on public.notifications
  for select to authenticated using (user_id = auth.uid());
create policy "Users mark own notifications read" on public.notifications
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- After a citizen submits: history + "received" notification
create or replace function public.complaints_after_insert()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.status_history (complaint_id, from_status, to_status, changed_by, changed_by_name, note, created_at)
  values (new.id, null, new.status, new.user_id,
          case when new.is_demo then 'Demo data' else 'Citizen' end,
          'Complaint submitted', new.created_at);
  if new.user_id is not null then
    insert into public.notifications (user_id, complaint_id, reference, message)
    values (new.user_id, new.id, new.reference, 'Your road damage complaint has been received.');
  end if;
  return new;
end;
$$;
create trigger complaints_after_insert after insert on public.complaints
  for each row execute function public.complaints_after_insert();

-- ===== Staff actions (security definer RPCs) =====
create or replace function public.staff_name(_uid uuid)
returns text language sql stable security definer set search_path = public as $$
  select coalesce(display_name, email, 'Inspector') from public.profiles where id = _uid
$$;

create or replace function public.set_complaint_status(_complaint_id uuid, _status public.complaint_status, _note text default null)
returns void language plpgsql security definer set search_path = public as $$
declare
  c public.complaints;
  msg text;
  clean_note text := nullif(btrim(coalesce(_note, '')), '');
begin
  if not public.is_staff(auth.uid()) then
    raise exception 'Only inspectors can change complaint status' using errcode = '42501';
  end if;
  select * into c from public.complaints where id = _complaint_id for update;
  if not found then raise exception 'Complaint not found'; end if;
  if c.status = _status then raise exception 'Complaint is already %', _status; end if;

  if _status = 'Resolved' then
    if clean_note is null then
      raise exception 'A resolution note is required to mark a complaint Resolved';
    end if;
    if not exists (select 1 from public.complaint_images where complaint_id = _complaint_id and kind = 'after_repair') then
      raise exception 'Upload at least one after-repair photo before marking Resolved';
    end if;
  end if;

  update public.complaints set
    status = _status,
    updated_at = now(),
    resolved_at = case when _status = 'Resolved' then now() else null end,
    resolution_note = case when _status = 'Resolved' then clean_note else resolution_note end
  where id = _complaint_id;

  insert into public.status_history (complaint_id, from_status, to_status, changed_by, changed_by_name, note)
  values (_complaint_id, c.status, _status, auth.uid(), public.staff_name(auth.uid()), clean_note);

  msg := case _status
    when 'Reported' then 'Your complaint has been moved back to Reported.'
    when 'Under Review' then 'Your complaint is currently under review.'
    when 'In Progress' then 'Repair work has started at the reported location.'
    when 'Resolved' then 'Your complaint has been marked as resolved.'
  end;
  if c.user_id is not null then
    insert into public.notifications (user_id, complaint_id, reference, message)
    values (c.user_id, c.id, c.reference, msg);
  end if;
end;
$$;

create or replace function public.add_complaint_update(_complaint_id uuid, _body text, _internal boolean default false)
returns void language plpgsql security definer set search_path = public as $$
declare c public.complaints;
begin
  if not public.is_staff(auth.uid()) then
    raise exception 'Only inspectors can add updates' using errcode = '42501';
  end if;
  if nullif(btrim(coalesce(_body, '')), '') is null then raise exception 'Update text is required'; end if;
  select * into c from public.complaints where id = _complaint_id;
  if not found then raise exception 'Complaint not found'; end if;
  insert into public.complaint_updates (complaint_id, author_id, author_name, body, is_internal)
  values (_complaint_id, auth.uid(), public.staff_name(auth.uid()), btrim(_body), coalesce(_internal, false));
  update public.complaints set updated_at = now() where id = _complaint_id;
  if not coalesce(_internal, false) and c.user_id is not null then
    insert into public.notifications (user_id, complaint_id, reference, message)
    values (c.user_id, c.id, c.reference, 'The inspector has added an update to your complaint.');
  end if;
end;
$$;

create or replace function public.review_classification(_complaint_id uuid, _damage_type public.damage_type, _severity public.severity_level)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_staff(auth.uid()) then
    raise exception 'Only inspectors can review classification' using errcode = '42501';
  end if;
  update public.complaints set
    damage_type = _damage_type, severity = _severity,
    classification_reviewed_by = auth.uid(), classification_reviewed_at = now(), updated_at = now()
  where id = _complaint_id;
  if not found then raise exception 'Complaint not found'; end if;
  insert into public.complaint_updates (complaint_id, author_id, author_name, body, is_internal)
  values (_complaint_id, auth.uid(), public.staff_name(auth.uid()),
          'Classification set to ' || replace(_damage_type::text, '_', ' ') || ', severity ' || _severity::text, true);
end;
$$;

create or replace function public.assign_repair_team(_complaint_id uuid, _team text, _note text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_staff(auth.uid()) then
    raise exception 'Only inspectors can assign repair teams' using errcode = '42501';
  end if;
  if nullif(btrim(coalesce(_team, '')), '') is null then raise exception 'Team name is required'; end if;
  update public.complaints set assigned_team = btrim(_team), updated_at = now() where id = _complaint_id;
  if not found then raise exception 'Complaint not found'; end if;
  insert into public.repair_assignments (complaint_id, team_name, note, assigned_by, assigned_by_name)
  values (_complaint_id, btrim(_team), nullif(btrim(coalesce(_note, '')), ''), auth.uid(), public.staff_name(auth.uid()));
end;
$$;

-- ===== Admin: manage inspectors =====
create or replace function public.admin_list_staff()
returns table (user_id uuid, email text, display_name text, roles public.app_role[])
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.has_role(auth.uid(), 'admin') then
    raise exception 'Admins only' using errcode = '42501';
  end if;
  return query
    select p.id, p.email, p.display_name, array_agg(r.role order by r.role)
    from public.profiles p join public.user_roles r on r.user_id = p.id
    group by p.id, p.email, p.display_name
    order by p.email;
end;
$$;

create or replace function public.admin_set_role(_email text, _role public.app_role, _grant boolean)
returns void language plpgsql security definer set search_path = public as $$
declare target uuid;
begin
  if not public.has_role(auth.uid(), 'admin') then
    raise exception 'Admins only' using errcode = '42501';
  end if;
  select id into target from public.profiles where lower(email) = lower(btrim(_email));
  if target is null then
    raise exception 'No account found for that email. Ask them to sign up first.';
  end if;
  if _grant then
    insert into public.user_roles (user_id, role) values (target, _role) on conflict do nothing;
  else
    if target = auth.uid() and _role = 'admin' then
      raise exception 'You cannot remove your own admin access';
    end if;
    delete from public.user_roles where user_id = target and role = _role;
  end if;
end;
$$;

revoke execute on function public.set_complaint_status(uuid, public.complaint_status, text) from public, anon;
revoke execute on function public.add_complaint_update(uuid, text, boolean) from public, anon;
revoke execute on function public.review_classification(uuid, public.damage_type, public.severity_level) from public, anon;
revoke execute on function public.assign_repair_team(uuid, text, text) from public, anon;
revoke execute on function public.admin_list_staff() from public, anon;
revoke execute on function public.admin_set_role(text, public.app_role, boolean) from public, anon;
grant execute on function public.set_complaint_status(uuid, public.complaint_status, text) to authenticated;
grant execute on function public.add_complaint_update(uuid, text, boolean) to authenticated;
grant execute on function public.review_classification(uuid, public.damage_type, public.severity_level) to authenticated;
grant execute on function public.assign_repair_team(uuid, text, text) to authenticated;
grant execute on function public.admin_list_staff() to authenticated;
grant execute on function public.admin_set_role(text, public.app_role, boolean) to authenticated;

-- ===== Storage policies (bucket: complaint-photos, path: <complaint_id>/<file>) =====
create or replace function public.complaint_id_from_path(_name text)
returns uuid language plpgsql immutable as $$
declare folder text := split_part(_name, '/', 1);
begin
  if folder ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    return folder::uuid;
  end if;
  return null;
end;
$$;

create policy "Complaint photos: view if allowed" on storage.objects
  for select to authenticated using (
    bucket_id = 'complaint-photos' and public.can_view_complaint(public.complaint_id_from_path(name))
  );
create policy "Complaint photos: upload if allowed" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'complaint-photos'
    and public.complaint_id_from_path(name) is not null
    and (public.owns_complaint(public.complaint_id_from_path(name)) or public.is_staff(auth.uid()))
  );

-- ===== Realtime =====
alter publication supabase_realtime add table public.notifications;
alter publication supabase_realtime add table public.complaints;

-- ===== Demo records (clearly labelled, no owner, no photos, no AI) =====
insert into public.complaints (is_demo, description, road_name, address, latitude, longitude, location_source, status, ai_status, ai_message, damage_type, severity, assigned_team, created_at, updated_at, resolved_at, resolution_note) values
  (true, '[DEMO] Deep pothole in the left lane near the bus stop, water collects after rain.', 'Road No. 36, Jubilee Hills', 'Jubilee Hills, Hyderabad, Telangana', 17.4311, 78.4077, 'manual', 'Reported', 'unavailable', 'Demo record — no AI analysis', 'pothole', 'High', null, now() - interval '1 day', now() - interval '1 day', null, null),
  (true, '[DEMO] Wide alligator cracking across both lanes before the signal.', 'Banjara Hills Road No. 12', 'Banjara Hills, Hyderabad, Telangana', 17.4126, 78.4382, 'manual', 'Under Review', 'unavailable', 'Demo record — no AI analysis', 'alligator_crack', 'Critical', null, now() - interval '3 days', now() - interval '2 days', null, null),
  (true, '[DEMO] Long crack along the edge of the service road.', 'Old Mumbai Highway', 'Gachibowli, Hyderabad, Telangana', 17.4401, 78.3489, 'manual', 'In Progress', 'unavailable', 'Demo record — no AI analysis', 'longitudinal_crack', 'Medium', 'Ward 104 Road Crew', now() - interval '6 days', now() - interval '1 day', null, null),
  (true, '[DEMO] Patch from last repair has broken up, loose gravel on road.', 'Sardar Patel Road', 'Secunderabad, Telangana', 17.4399, 78.4983, 'manual', 'Reported', 'unavailable', 'Demo record — no AI analysis', 'patch_failure', 'Low', null, now() - interval '2 hours', now() - interval '2 hours', null, null),
  (true, '[DEMO] Cluster of potholes at the junction, two-wheelers swerving.', 'Ameerpet Main Road', 'Ameerpet, Hyderabad, Telangana', 17.4375, 78.4482, 'manual', 'Resolved', 'unavailable', 'Demo record — no AI analysis', 'pothole', 'High', 'Ward 92 Road Crew', now() - interval '12 days', now() - interval '4 days', now() - interval '4 days', '[DEMO] Potholes filled and compacted.');

insert into public.status_history (complaint_id, from_status, to_status, changed_by_name, note, created_at)
select id, 'Reported', 'Under Review', 'Demo data', null, created_at + interval '1 day' from public.complaints where is_demo and status in ('Under Review', 'In Progress', 'Resolved');
insert into public.status_history (complaint_id, from_status, to_status, changed_by_name, note, created_at)
select id, 'Under Review', 'In Progress', 'Demo data', null, created_at + interval '2 days' from public.complaints where is_demo and status in ('In Progress', 'Resolved');
insert into public.status_history (complaint_id, from_status, to_status, changed_by_name, note, created_at)
select id, 'In Progress', 'Resolved', 'Demo data', resolution_note, resolved_at from public.complaints where is_demo and status = 'Resolved';
