-- openia.cl · esquema inicial
-- Copiar y pegar completo en el SQL Editor de Supabase.

create extension if not exists "pgcrypto";

-- 1. usuarios ----------------------------------------------------------
-- id referencia a auth.users: cada fila extiende al usuario de Supabase Auth.
create table if not exists usuarios (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  nombre text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. programas ----------------------------------------------------------
create table if not exists programas (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  descripcion text,
  precio integer not null,
  modulos integer not null,
  color text not null,
  created_at timestamptz not null default now()
);

-- 3. sesiones ----------------------------------------------------------
create table if not exists sesiones (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references usuarios (id) on delete cascade,
  programa_id uuid not null references programas (id) on delete cascade,
  modulo_actual integer not null default 1,
  progreso integer not null default 0,
  chat jsonb not null default '[]'::jsonb,
  completado boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists sesiones_usuario_id_idx on sesiones (usuario_id);
create index if not exists sesiones_programa_id_idx on sesiones (programa_id);

-- updated_at automático ---------------------------------------------------
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_updated_at on usuarios;
create trigger set_updated_at
  before update on usuarios
  for each row
  execute function set_updated_at();

drop trigger if exists set_updated_at on sesiones;
create trigger set_updated_at
  before update on sesiones
  for each row
  execute function set_updated_at();

-- seed: programas de openia.cl -------------------------------------------
insert into programas (nombre, descripcion, precio, modulos, color)
values
  ('Ansiedad Bajo Control', null, 4990, 8, '#7F77DD'),
  ('Respira en el Trabajo', null, 4990, 6, '#1D9E75'),
  ('Regulación Express', null, 2990, 4, '#BA7517'),
  ('Deja de Sobrepensar', null, 4990, 5, '#D4537E');

-- RLS ---------------------------------------------------------------------
alter table usuarios enable row level security;
alter table programas enable row level security;
alter table sesiones enable row level security;

-- usuarios: cada quien solo ve y edita su propia fila
create policy "usuarios_select_own"
  on usuarios for select
  using (auth.uid() = id);

create policy "usuarios_insert_own"
  on usuarios for insert
  with check (auth.uid() = id);

create policy "usuarios_update_own"
  on usuarios for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- programas: catálogo de lectura pública, sin escritura desde el cliente
create policy "programas_select_public"
  on programas for select
  using (true);

-- sesiones: cada quien solo ve y gestiona sus propias sesiones
create policy "sesiones_select_own"
  on sesiones for select
  using (auth.uid() = usuario_id);

create policy "sesiones_insert_own"
  on sesiones for insert
  with check (auth.uid() = usuario_id);

create policy "sesiones_update_own"
  on sesiones for update
  using (auth.uid() = usuario_id)
  with check (auth.uid() = usuario_id);

create policy "sesiones_delete_own"
  on sesiones for delete
  using (auth.uid() = usuario_id);
