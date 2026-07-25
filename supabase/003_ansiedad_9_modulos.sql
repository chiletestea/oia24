-- openia.cl · corrige el conteo de módulos de "Ansiedad Bajo Control"
-- Copiar y pegar en el SQL Editor de Supabase, DESPUÉS de 002_privacidad_supervision.sql.
--
-- El seed original (schema.sql) dejó modulos = 8, pero el programa se
-- implementó con módulos 0 a 8 (9 en total, ver src/lib/programas/ansiedad-modulos.ts).
-- programas.modulos se usa para "X de Y" en emails y en ModuloCompleted, así
-- que tiene que reflejar el total real.

update programas set modulos = 9 where nombre = 'Ansiedad Bajo Control';
