create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  author text not null default 'You',
  author_id uuid,
  content text not null check (char_length(content) between 1 and 280),
  image_url text,
  created_at timestamptz not null default now()
);

alter table public.posts add column if not exists author_id uuid;
alter table public.posts add column if not exists image_url text;
alter table public.posts enable row level security;
create index if not exists posts_created_at_idx on public.posts (created_at desc);

drop policy if exists "Anyone can read posts" on public.posts;
create policy "Anyone can read posts"
  on public.posts for select
  using (true);

drop policy if exists "Anyone can create posts" on public.posts;
create policy "Anyone can create posts"
  on public.posts for insert
  with check (auth.uid() = author_id and char_length(content) between 1 and 280);

create table if not exists public.profiles (
  id text primary key,
  photo_url text,
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "Anyone can read profile" on public.profiles;
create policy "Anyone can read profile"
  on public.profiles for select
  using (true);

drop policy if exists "Anyone can update profile" on public.profiles;
create policy "Anyone can update profile"
  on public.profiles for insert
  with check (id = 'greg');

drop policy if exists "Anyone can replace profile" on public.profiles;
create policy "Anyone can replace profile"
  on public.profiles for update
  using (id = 'greg')
  with check (id = 'greg');

insert into storage.buckets (id, name, public)
values ('profile-photos', 'profile-photos', true)
on conflict (id) do update set public = true;

insert into storage.buckets (id, name, public)
values ('post-photos', 'post-photos', true)
on conflict (id) do update set public = true;

drop policy if exists "Anyone can read profile photos" on storage.objects;
create policy "Anyone can read profile photos"
  on storage.objects for select
  using (bucket_id = 'profile-photos');

drop policy if exists "Anyone can upload profile photos" on storage.objects;
create policy "Anyone can upload profile photos"
  on storage.objects for insert
  with check (bucket_id = 'profile-photos');

drop policy if exists "Anyone can replace profile photos" on storage.objects;
create policy "Anyone can replace profile photos"
  on storage.objects for update
  using (bucket_id = 'profile-photos')
  with check (bucket_id = 'profile-photos');

drop policy if exists "Anyone can read post photos" on storage.objects;
create policy "Anyone can read post photos"
  on storage.objects for select
  using (bucket_id = 'post-photos');

drop policy if exists "Anyone can upload post photos" on storage.objects;
create policy "Anyone can upload post photos"
  on storage.objects for insert
  with check (bucket_id = 'post-photos');

drop policy if exists "Anyone can replace post photos" on storage.objects;
create policy "Anyone can replace post photos"
  on storage.objects for update
  using (bucket_id = 'post-photos')
  with check (bucket_id = 'post-photos');

do $$
begin
  alter publication supabase_realtime add table public.posts;
exception
  when duplicate_object then null;
end $$;
