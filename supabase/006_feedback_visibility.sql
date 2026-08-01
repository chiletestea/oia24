-- openia.cl · visibilidad de evaluaciones en Home (gestión admin)
-- Copiar y pegar completo en el SQL Editor de Supabase, DESPUÉS de 005.
-- Permite al admin marcar qué evaluaciones de feedback_sessions se pueden
-- mostrar públicamente en el Home (la lectura pública en el Home es un
-- trabajo aparte — esta migración solo agrega la tabla de gestión).
-- Sin policies de cliente — mismo enfoque que feedback_sessions y
-- chat_public_anonymous: solo el service role (usado exclusivamente desde
-- las rutas /api/admin/* protegidas por la cookie de sesión admin) puede
-- leer o escribir esta tabla.

create table if not exists feedback_visibility (
  id uuid primary key default gen_random_uuid(),
  feedback_id uuid not null references feedback_sessions (id) on delete cascade,
  is_public boolean not null default false,
  admin_notes text,
  created_at timestamptz not null default now(),
  unique (feedback_id)
);

create index if not exists feedback_visibility_feedback_id_idx on feedback_visibility (feedback_id);

alter table feedback_visibility enable row level security;
