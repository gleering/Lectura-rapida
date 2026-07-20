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
  cover          text,                    -- miniatura de portada (dataURL JPEG)
  content_path   text not null,          -- ruta del JSON en el bucket
  created_by     uuid references auth.users (id),
  created_at     timestamptz not null default now()
);

-- Portada: idempotente para tablas creadas antes de agregar la columna.
alter table public.public_books add column if not exists cover text;

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
-- 4. subscriptions: membresías (pagas vía Lemon Squeezy o comps del admin).
-- ---------------------------------------------------------------------------
-- Se indexa por EMAIL (en minúsculas) en vez de user_id: así el admin puede
-- regalar una membresía a un correo AUNQUE esa persona todavía no se haya
-- registrado. Cuando entra con ese email, ve su acceso activo.
--
--   plan    → 'monthly' | 'yearly' | 'comp'
--   status  → 'active' | 'on_trial' | 'cancelled' | 'expired' | 'past_due' | 'paused'
--   source  → 'paid' (Lemon Squeezy) | 'comp' (regalo del admin)
--   current_period_end → null = sin vencimiento (típico de comp)
create table if not exists public.subscriptions (
  id                 uuid primary key default gen_random_uuid(),
  email              text not null,
  plan               text not null,
  status             text not null default 'active',
  source             text not null default 'paid',
  current_period_end timestamptz,
  ls_subscription_id text,                          -- id de Lemon Squeezy (paid)
  created_by         uuid references auth.users (id),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

-- Email siempre en minúsculas para que el match sea consistente.
create unique index if not exists subscriptions_ls_id_key
  on public.subscriptions (ls_subscription_id)
  where ls_subscription_id is not null;
create index if not exists subscriptions_email_idx
  on public.subscriptions (lower(email));

alter table public.subscriptions enable row level security;

-- Lectura: cada usuario ve las membresías de SU email; el admin ve todas.
drop policy if exists "subscriptions_select_own" on public.subscriptions;
create policy "subscriptions_select_own"
  on public.subscriptions for select
  to authenticated
  using (
    lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    or public.is_admin()
  );

-- Escritura desde la app: solo admin (regala/gestiona comps). El webhook de
-- Lemon Squeezy escribe con la service_role key, que saltea RLS.
drop policy if exists "subscriptions_admin_all" on public.subscriptions;
create policy "subscriptions_admin_all"
  on public.subscriptions for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ¿El usuario actual tiene una membresía activa? SECURITY DEFINER para leer la
-- tabla sin chocar con RLS. Considera activa: comp sin vencer, o paga vigente.
create or replace function public.has_active_subscription()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.subscriptions s
    where lower(s.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
      and s.status in ('active', 'on_trial')
      and (s.current_period_end is null or s.current_period_end > now())
  );
$$;

-- ---------------------------------------------------------------------------
-- 5. Hacerte admin (corré esto DESPUÉS de registrarte una vez en la app):
--
--   update public.profiles set role = 'admin'
--   where email = 'TU-EMAIL@ejemplo.com';
-- ---------------------------------------------------------------------------
