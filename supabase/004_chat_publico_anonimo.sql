-- openia.cl · chat público anónimo (sin login)
-- Copiar y pegar completo en el SQL Editor de Supabase, DESPUÉS de 002 y 003.
-- Guarda cada turno del chat anónimo de la home (POST /api/o-chat/public),
-- identificado solo por sesion_id (localStorage, ver lib/sesion-anonima.ts)
-- — no hay usuario_id porque no hay cuenta ni login.

create table if not exists chat_public_anonymous (
  id uuid primary key default gen_random_uuid(),
  sesion_id uuid not null,
  usuario_mensaje text not null,
  o_respuesta text not null,
  temas_detectados text[] not null default '{}',
  es_crisis boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists chat_public_anonymous_sesion_id_idx on chat_public_anonymous (sesion_id);
create index if not exists chat_public_anonymous_created_at_idx on chat_public_anonymous (created_at);
create index if not exists chat_public_anonymous_es_crisis_idx on chat_public_anonymous (es_crisis);

-- RLS: solo el service role (bypassea RLS) escribe/lee esta tabla — igual
-- que forget_me_tokens. No hay policies de cliente: no existe un usuario_id
-- con el que emparejar auth.uid(), y el sesion_id no debe ser suficiente
-- por sí solo para leer conversaciones ajenas.
alter table chat_public_anonymous enable row level security;
