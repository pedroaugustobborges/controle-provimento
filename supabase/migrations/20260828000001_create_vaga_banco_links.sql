-- Table that persists the links between a PROC. SELETIVO (identified by ps_key)
-- and a vaga, with a status of 'confirmed' or 'desvinculado'.
-- Replaces the previous localStorage-only persistence.

create table if not exists public.vaga_banco_links (
  id          uuid        primary key default gen_random_uuid(),
  vaga_id     uuid        not null,
  ps_key      text        not null,
  status      text        not null check (status in ('confirmed', 'desvinculado')),
  created_by  uuid        references auth.users(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint vaga_banco_links_vaga_ps_unique unique (vaga_id, ps_key)
);

create index if not exists vaga_banco_links_vaga_id_idx on public.vaga_banco_links(vaga_id);
create index if not exists vaga_banco_links_status_idx  on public.vaga_banco_links(status);

alter table public.vaga_banco_links enable row level security;

-- Allow all authenticated users full access (same pattern as other tables in this project)
create policy "vaga_banco_links_all_authenticated"
  on public.vaga_banco_links
  for all
  to authenticated
  using (true)
  with check (true);

-- Auto-update updated_at on row change
create or replace function public.set_vaga_banco_links_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger vaga_banco_links_updated_at
  before update on public.vaga_banco_links
  for each row execute procedure public.set_vaga_banco_links_updated_at();
