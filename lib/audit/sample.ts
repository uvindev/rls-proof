export const unsafeSample = `-- New collaboration tables
create table public.workspaces (
  id uuid primary key,
  owner_id uuid not null,
  name text not null
);

grant select, insert, update on public.workspaces to authenticated;

create table public.workspace_invites (
  id uuid primary key,
  workspace_id uuid not null references public.workspaces(id),
  email text not null
);

alter table public.workspace_invites enable row level security;

create policy "Members can create invites"
on public.workspace_invites
for insert
to authenticated;

create policy "Anyone can list invites"
on public.workspace_invites
for select
to anon
using (true);

create or replace function public.is_workspace_member(target uuid)
returns boolean
language sql
security definer
as $$
  select exists(
    select 1 from public.workspace_members where workspace_id = target
  );
$$;`;
