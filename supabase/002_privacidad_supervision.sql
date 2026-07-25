-- openia.cl · fundamentos transversales: privacidad & supervisión
-- Copiar y pegar completo en el SQL Editor de Supabase, DESPUÉS de schema.sql.
-- Es aditivo: no borra ni reemplaza las tablas existentes (usuarios, programas, sesiones).
-- La tabla "sesiones" queda intacta pero sin uso desde el código de la app;
-- el nuevo modelo la reemplaza con "modulos" + "chat_sesiones" (progreso y chat separados).

create extension if not exists "pgcrypto";

-- 1. usuarios: columnas nuevas (aditivo, no se toca lo existente) ------------
alter table usuarios add column if not exists programa_id uuid references programas (id);
alter table usuarios add column if not exists token uuid unique not null default gen_random_uuid();
alter table usuarios add column if not exists fecha_pago timestamptz not null default now();
alter table usuarios add column if not exists fecha_vencimiento timestamptz not null default (now() + interval '6 months');
alter table usuarios add column if not exists modulo_actual integer not null default 0;
alter table usuarios add column if not exists activo boolean not null default true;
alter table usuarios add column if not exists consentimiento jsonb not null default '{"acepta_terminos": false, "fecha_aceptacion": null, "version": "1.0"}'::jsonb;
alter table usuarios add column if not exists deleted_at timestamptz;

-- Hash determinístico del email (sha256, minúsculas), calculado por la DB.
-- Permite ubicar al usuario correspondiente a un forget_me_tokens.email_hasheado
-- sin tener que guardar ni comparar el email en texto plano en esa tabla.
-- lib/forget-me.ts debe generar el hash exactamente igual:
-- sha256(email.trim().toLowerCase()) en hex.
alter table usuarios add column if not exists email_hash text
  generated always as (encode(digest(lower(trim(email)), 'sha256'), 'hex')) stored;

create index if not exists usuarios_email_hash_idx on usuarios (email_hash);

-- 2. modulos: progreso por módulo --------------------------------------------
create table if not exists modulos (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid references usuarios (id) on delete cascade,
  programa_id uuid references programas (id),
  numero integer not null,
  completado boolean not null default false,
  fecha_completado timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists modulos_usuario_id_idx on modulos (usuario_id);
create unique index if not exists modulos_usuario_programa_numero_idx
  on modulos (usuario_id, programa_id, numero);

-- 3. chat_sesiones: chats encriptados + resúmenes para supervisión ----------
create table if not exists chat_sesiones (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid references usuarios (id) on delete cascade,
  programa_id uuid references programas (id),
  modulo_numero integer not null,
  mensajes jsonb not null, -- encriptado por la app (ver lib/encriptacion.ts) antes de guardar
  resumen_ia text, -- para Luis (supervisión) — nunca los mensajes crudos
  cerrada_en timestamptz,
  email_enviado boolean not null default false,
  email_enviado_en timestamptz,
  visto_por_supervisor boolean not null default false,
  visto_en timestamptz,
  -- true si /api/o-chat detectó el sentinel [CRISIS] en esta sesión. Los
  -- mensajes están encriptados, así que no se puede filtrar por contenido
  -- en SQL — este flag es lo que alimenta las alertas del dashboard.
  es_crisis boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists chat_sesiones_usuario_id_idx on chat_sesiones (usuario_id);
create index if not exists chat_sesiones_created_at_idx on chat_sesiones (created_at);
create index if not exists chat_sesiones_visto_idx on chat_sesiones (visto_por_supervisor);
create index if not exists chat_sesiones_es_crisis_idx on chat_sesiones (es_crisis);

-- 4. evaluaciones: GAD-7, BAI, OLBI, SUDS ------------------------------------
create table if not exists evaluaciones (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid references usuarios (id) on delete cascade,
  programa_id uuid references programas (id),
  tipo text not null check (tipo in ('GAD7', 'BAI', 'OLBI', 'SUDS')),
  modulo_numero integer,
  resultado jsonb not null, -- respuestas + score
  visto_por_supervisor boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists evaluaciones_usuario_id_idx on evaluaciones (usuario_id);
create index if not exists evaluaciones_tipo_idx on evaluaciones (tipo);

-- 5. forget_me_tokens: borrado permanente ------------------------------------
-- Solo accedida por el service role (endpoints server-side); nunca desde el cliente.
create table if not exists forget_me_tokens (
  token_hash text primary key,
  email_hasheado text not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create index if not exists forget_me_tokens_expires_idx on forget_me_tokens (expires_at);

-- RLS -------------------------------------------------------------------------
alter table modulos enable row level security;
alter table chat_sesiones enable row level security;
alter table evaluaciones enable row level security;
alter table forget_me_tokens enable row level security;

-- modulos: cada quien solo ve sus propios módulos
drop policy if exists "modulos_select_own" on modulos;
create policy "modulos_select_own"
  on modulos for select
  using (usuario_id = auth.uid());

-- chat_sesiones: cada quien solo ve sus propias sesiones (nunca terceros)
drop policy if exists "users_read_own_sessions" on chat_sesiones;
create policy "users_read_own_sessions"
  on chat_sesiones for select
  using (usuario_id = auth.uid());

-- evaluaciones: cada quien solo ve sus propias evaluaciones
drop policy if exists "users_read_own_evals" on evaluaciones;
create policy "users_read_own_evals"
  on evaluaciones for select
  using (usuario_id = auth.uid());

-- forget_me_tokens: sin policies de lectura para clientes — solo el
-- service role (que además bypassea RLS) puede leer/escribir esta tabla.
