-- CollabDesk currently models one demo creator as a JSON document.
-- Keep the document in one row while the app is single-tenant; migrate to
-- owner-scoped relational tables before enabling multiple user accounts.
create table if not exists public.collabdesk_state (
  id text primary key check (id = 'default'),
  payload jsonb not null check (jsonb_typeof(payload) = 'object'),
  revision bigint not null default 1 check (revision > 0),
  updated_at timestamptz not null default now()
);

alter table public.collabdesk_state enable row level security;

revoke all on table public.collabdesk_state from anon, authenticated;
grant select, insert, update on table public.collabdesk_state to service_role;
