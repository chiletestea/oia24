-- openia.cl · feedback simple al cerrar el chat
-- Copiar y pegar completo en el SQL Editor de Supabase, DESPUÉS de 004.
-- Guarda la evaluación opcional que el usuario deja al cerrar SalesBot
-- (POST /api/feedback/create), identificado solo por session_id
-- (localStorage, ver lib/sesion-anonima.ts) — no hay usuario_id porque no
-- hay cuenta ni login.

create table if not exists feedback_sessions (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null,
  rating smallint not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now()
);

create index if not exists feedback_sessions_session_id_idx on feedback_sessions (session_id);
create index if not exists feedback_sessions_created_at_idx on feedback_sessions (created_at);

-- RLS: solo el service role (bypassea RLS) escribe/lee esta tabla — igual
-- que chat_public_anonymous. No hay policies de cliente.
alter table feedback_sessions enable row level security;
