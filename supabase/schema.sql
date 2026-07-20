-- ReadFlow — Biblioteca pública compartida
-- ==========================================
-- Pegá TODO este archivo en el editor SQL de Supabase (Dashboard → SQL Editor →
-- New query → Run). Es idempotente: podés correrlo más de una vez sin romper.
--
-- Modelo:
--   profiles      → un registro por usuario, con `role` ('user' | 'admin').
--   public_books  → metadata del catálogo público (liviano, se lista rápido).
--   Storage bucket 'public-books' → contenido pesado (words/sections) como JSON.
--
-- Seguridad (RLS): cualquier usuario autenticado LEE el catálogo; solo un admin
-- ESCRIBE. Los libros privados de cada usuario NO viven acá (siguen en el
-- dispositivo, IndexedDB).

-- ---------------------------------------------------------------------------
-- 1. profiles: rol por usuario, creado automáticamente al registrarse.
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  email      text,
  role       text not null default 'user',
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles for select
  to authenticated
  using (auth.uid() = id);

-- Al crearse un usuario en auth.users, se inserta su profile.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Helper de admin. SECURITY DEFINER evita recursión de RLS al leer profiles.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- ---------------------------------------------------------------------------
-- 2. public_books: catálogo (metadata). El contenido va en Storage.
-- ---------------------------------------------------------------------------
create table if not exists public.public_books (
  id             uuid primary key default gen_random_uuid(),
  title          text not null,
  author         text,
  total_words    integer not null default 0,
  total_pages    integer not null default 0,
  words_per_page numeric not null default 0,
  summary        text,
  content_path   text not null,          -- ruta del JSON en el bucket
  created_by     uuid references auth.users (id),
  created_at     timestamptz not null default now()
);

alter table public.public_books enable row level security;

-- Lectura: cualquier usuario autenticado ve el catálogo.
drop policy if exists "public_books_select" on public.public_books;
create policy "public_books_select"
  on public.public_books for select
  to authenticated
  using (true);

-- Escritura: solo admin.
drop policy if exists "public_books_admin_insert" on public.public_books;
create policy "public_books_admin_insert"
  on public.public_books for insert
  to authenticated
  with check (public.is_admin());

drop policy if exists "public_books_admin_update" on public.public_books;
create policy "public_books_admin_update"
  on public.public_books for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "public_books_admin_delete" on public.public_books;
create policy "public_books_admin_delete"
  on public.public_books for delete
  to authenticated
  using (public.is_admin());

-- ---------------------------------------------------------------------------
-- 3. Storage: bucket privado para el contenido de los libros públicos.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('public-books', 'public-books', false)
on conflict (id) do nothing;

-- Descarga: cualquier autenticado. Subida/edición/borrado: solo admin.
drop policy if exists "public_books_content_read" on storage.objects;
create policy "public_books_content_read"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'public-books');

drop policy if exists "public_books_content_insert" on storage.objects;
create policy "public_books_content_insert"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'public-books' and public.is_admin());

drop policy if exists "public_books_content_update" on storage.objects;
create policy "public_books_content_update"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'public-books' and public.is_admin());

drop policy if exists "public_books_content_delete" on storage.objects;
create policy "public_books_content_delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'public-books' and public.is_admin());

-- ---------------------------------------------------------------------------
-- 4. Hacerte admin (corré esto DESPUÉS de registrarte una vez en la app):
--
--   update public.profiles set role = 'admin'
--   where email = 'TU-EMAIL@ejemplo.com';
-- ---------------------------------------------------------------------------
