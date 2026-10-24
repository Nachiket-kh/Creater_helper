-- Gmail mailbox credentials and message cache. Access is server-only through
-- the Supabase secret key; the app is currently a single-creator workspace.
create table if not exists public.collabdesk_gmail_accounts (
  google_sub text primary key,
  email text not null unique,
  refresh_token_ciphertext text not null,
  history_id text,
  watch_expiration timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.collabdesk_gmail_messages (
  google_sub text not null references public.collabdesk_gmail_accounts(google_sub) on delete cascade,
  gmail_message_id text not null,
  thread_id text not null,
  from_name text not null default '',
  from_email text not null default '',
  subject text not null default '(no subject)',
  snippet text not null default '',
  body_text text not null default '',
  label_ids text[] not null default '{}',
  internal_date timestamptz not null,
  synced_at timestamptz not null default now(),
  primary key (google_sub, gmail_message_id)
);

create index if not exists collabdesk_gmail_messages_recent_idx
  on public.collabdesk_gmail_messages (google_sub, internal_date desc);

alter table public.collabdesk_gmail_accounts enable row level security;
alter table public.collabdesk_gmail_messages enable row level security;

revoke all on table public.collabdesk_gmail_accounts from anon, authenticated;
revoke all on table public.collabdesk_gmail_messages from anon, authenticated;
grant select, insert, update, delete on table public.collabdesk_gmail_accounts to service_role;
grant select, insert, update, delete on table public.collabdesk_gmail_messages to service_role;
