-- Regenera Ranch — schema Supabase (Postgres).
-- Ejecutar en el editor SQL del proyecto Supabase.
-- Asume que ya existe auth.users (provisto por Supabase Auth).

-- Extensiones útiles
create extension if not exists "pgcrypto"; -- gen_random_uuid()

-- ============================================================
-- Tablas
-- ============================================================

create table if not exists public.campos (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  agricultural_year_start_month int not null default 7 check (agricultural_year_start_month between 1 and 12),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.potreros (
  id uuid primary key default gen_random_uuid(),
  campo_id uuid not null references public.campos(id) on delete cascade,
  name text not null,
  geometry jsonb not null, -- GeoJSON Polygon
  area_ha numeric(10,4),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_potreros_campo on public.potreros(campo_id);

create table if not exists public.rebanos (
  id uuid primary key default gen_random_uuid(),
  campo_id uuid not null references public.campos(id) on delete cascade,
  name text not null,
  category text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_rebanos_campo on public.rebanos(campo_id);

create table if not exists public.pastoreos (
  id uuid primary key default gen_random_uuid(),
  potrero_id uuid not null references public.potreros(id) on delete cascade,
  rebano_id uuid references public.rebanos(id) on delete set null,
  entry_date date not null,
  exit_date date,
  days_in_paddock int,
  animal_count int not null check (animal_count >= 0),
  weight_kg_avg numeric(10,2),
  intensity text check (intensity in ('L','M','I')),
  recommendation text,
  notes text,
  came_from_potrero_id uuid references public.potreros(id) on delete set null,
  went_to_potrero_id uuid references public.potreros(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_pastoreos_potrero on public.pastoreos(potrero_id);
create index if not exists idx_pastoreos_rebano on public.pastoreos(rebano_id);
create index if not exists idx_pastoreos_entry_date on public.pastoreos(entry_date desc);

create table if not exists public.observaciones (
  id uuid primary key default gen_random_uuid(),
  pastoreo_id uuid not null references public.pastoreos(id) on delete cascade,
  kind text not null check (kind in ('malezas','plagas','otra')),
  description text not null,
  photo_uri text,
  created_at timestamptz not null default now()
);
create index if not exists idx_observaciones_pastoreo on public.observaciones(pastoreo_id);

create table if not exists public.suplementaciones (
  id uuid primary key default gen_random_uuid(),
  pastoreo_id uuid not null references public.pastoreos(id) on delete cascade,
  date date not null,
  feed_type text not null,
  amount numeric(10,2) not null,
  unit text not null,
  created_at timestamptz not null default now()
);
create index if not exists idx_suplementaciones_pastoreo on public.suplementaciones(pastoreo_id);

create table if not exists public.animal_movimientos (
  id uuid primary key default gen_random_uuid(),
  rebano_id uuid not null references public.rebanos(id) on delete cascade,
  kind text not null check (kind in (
    'nacimiento','compra','traslado_entrada',
    'muerte','venta','traslado_salida'
  )),
  count int not null check (count > 0),
  date date not null,
  weight_kg_avg numeric(10,2),
  customer_name text,
  price_total numeric(12,2),
  notes text,
  created_at timestamptz not null default now()
);
create index if not exists idx_movimientos_rebano on public.animal_movimientos(rebano_id);

create table if not exists public.manejos (
  id uuid primary key default gen_random_uuid(),
  potrero_id uuid not null references public.potreros(id) on delete cascade,
  kind text not null check (kind in ('cosecha_bolos','resiembra','muestra_suelo','otro')),
  date date not null,
  notes text,
  created_at timestamptz not null default now()
);
create index if not exists idx_manejos_potrero on public.manejos(potrero_id);

create table if not exists public.clima_eventos (
  id uuid primary key default gen_random_uuid(),
  campo_id uuid not null references public.campos(id) on delete cascade,
  date date not null,
  kind text not null check (kind in ('lluvia_significativa','helada','crecimiento_pasto')),
  growth_speed text check (growth_speed in ('rapido','lento','estancado')),
  rainfall_mm numeric(8,2),
  notes text,
  created_at timestamptz not null default now()
);
create index if not exists idx_clima_campo on public.clima_eventos(campo_id);

create table if not exists public.collar_pings (
  id uuid primary key default gen_random_uuid(),
  rebano_id uuid not null references public.rebanos(id) on delete cascade,
  lat double precision not null,
  lng double precision not null,
  recorded_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index if not exists idx_collar_rebano on public.collar_pings(rebano_id, recorded_at desc);

-- ============================================================
-- Trigger updated_at
-- ============================================================
create or replace function public.tg_touch_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

do $$
declare t text;
begin
  foreach t in array array['campos','potreros','rebanos','pastoreos'] loop
    execute format(
      'drop trigger if exists touch_updated_at on public.%I;
       create trigger touch_updated_at before update on public.%I
         for each row execute function public.tg_touch_updated_at();',
      t, t
    );
  end loop;
end$$;

-- ============================================================
-- Row Level Security
-- Cada usuario solo ve sus propios campos y todo lo que cuelga de ellos.
-- ============================================================
alter table public.campos enable row level security;
alter table public.potreros enable row level security;
alter table public.rebanos enable row level security;
alter table public.pastoreos enable row level security;
alter table public.observaciones enable row level security;
alter table public.suplementaciones enable row level security;
alter table public.animal_movimientos enable row level security;
alter table public.manejos enable row level security;
alter table public.clima_eventos enable row level security;
alter table public.collar_pings enable row level security;

-- campos: dueño directo
drop policy if exists campos_owner on public.campos;
create policy campos_owner on public.campos
  for all using (owner_user_id = auth.uid())
  with check (owner_user_id = auth.uid());

-- Helper: ¿este campo es del usuario actual?
create or replace function public.is_campo_owner(p_campo_id uuid) returns boolean
language sql stable as $$
  select exists (
    select 1 from public.campos c
     where c.id = p_campo_id and c.owner_user_id = auth.uid()
  );
$$;

-- Tablas que cuelgan de campo
drop policy if exists potreros_owner on public.potreros;
create policy potreros_owner on public.potreros
  for all using (public.is_campo_owner(campo_id))
  with check (public.is_campo_owner(campo_id));

drop policy if exists rebanos_owner on public.rebanos;
create policy rebanos_owner on public.rebanos
  for all using (public.is_campo_owner(campo_id))
  with check (public.is_campo_owner(campo_id));

drop policy if exists clima_owner on public.clima_eventos;
create policy clima_owner on public.clima_eventos
  for all using (public.is_campo_owner(campo_id))
  with check (public.is_campo_owner(campo_id));

-- Helper: ¿este potrero pertenece a un campo del usuario?
create or replace function public.is_potrero_owner(p_potrero_id uuid) returns boolean
language sql stable as $$
  select exists (
    select 1 from public.potreros p join public.campos c on c.id = p.campo_id
     where p.id = p_potrero_id and c.owner_user_id = auth.uid()
  );
$$;

drop policy if exists pastoreos_owner on public.pastoreos;
create policy pastoreos_owner on public.pastoreos
  for all using (public.is_potrero_owner(potrero_id))
  with check (public.is_potrero_owner(potrero_id));

drop policy if exists manejos_owner on public.manejos;
create policy manejos_owner on public.manejos
  for all using (public.is_potrero_owner(potrero_id))
  with check (public.is_potrero_owner(potrero_id));

-- Helper: ¿este rebano pertenece a un campo del usuario?
create or replace function public.is_rebano_owner(p_rebano_id uuid) returns boolean
language sql stable as $$
  select exists (
    select 1 from public.rebanos r join public.campos c on c.id = r.campo_id
     where r.id = p_rebano_id and c.owner_user_id = auth.uid()
  );
$$;

drop policy if exists movimientos_owner on public.animal_movimientos;
create policy movimientos_owner on public.animal_movimientos
  for all using (public.is_rebano_owner(rebano_id))
  with check (public.is_rebano_owner(rebano_id));

drop policy if exists collar_owner on public.collar_pings;
create policy collar_owner on public.collar_pings
  for all using (public.is_rebano_owner(rebano_id))
  with check (public.is_rebano_owner(rebano_id));

-- Helper: ¿este pastoreo pertenece a un potrero del usuario?
create or replace function public.is_pastoreo_owner(p_pastoreo_id uuid) returns boolean
language sql stable as $$
  select exists (
    select 1 from public.pastoreos pa
      join public.potreros po on po.id = pa.potrero_id
      join public.campos c on c.id = po.campo_id
     where pa.id = p_pastoreo_id and c.owner_user_id = auth.uid()
  );
$$;

drop policy if exists observaciones_owner on public.observaciones;
create policy observaciones_owner on public.observaciones
  for all using (public.is_pastoreo_owner(pastoreo_id))
  with check (public.is_pastoreo_owner(pastoreo_id));

drop policy if exists suplementaciones_owner on public.suplementaciones;
create policy suplementaciones_owner on public.suplementaciones
  for all using (public.is_pastoreo_owner(pastoreo_id))
  with check (public.is_pastoreo_owner(pastoreo_id));
