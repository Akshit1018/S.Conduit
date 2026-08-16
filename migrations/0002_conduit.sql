-- Conduit workspace: per-user connector state, audit, conversations, HITL.

create table if not exists connectors (
  user_id text not null,
  source_id text not null,
  enabled boolean not null default true,
  token_status text not null default 'valid',
  token_label text not null default 'pat_live',
  injected_fault text not null default 'none',
  tools_acl text not null default '{}',
  last_ok_at timestamptz,
  last_error text,
  fail_count integer not null default 0,
  circuit_state text not null default 'closed',
  circuit_opened_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, source_id)
);

create table if not exists audit_log (
  id text primary key,
  user_id text not null,
  ts timestamptz not null default now(),
  tool text not null,
  source_id text not null,
  args text not null default '{}',
  status text not null,
  latency_ms integer not null default 0,
  error_class text,
  result_preview text,
  caller text not null default 'inspector'
);

create index if not exists audit_log_user_ts_idx on audit_log (user_id, ts desc);
create index if not exists audit_log_user_source_idx on audit_log (user_id, source_id);

create table if not exists conversations (
  id text primary key,
  user_id text not null,
  title text not null default 'New thread',
  created_at timestamptz not null default now()
);

create index if not exists conversations_user_idx on conversations (user_id, created_at desc);

create table if not exists messages (
  id text primary key,
  conversation_id text not null,
  user_id text not null,
  role text not null,
  content text not null default '',
  payload text,
  created_at timestamptz not null default now()
);

create index if not exists messages_convo_idx on messages (conversation_id, created_at);

create table if not exists approvals (
  id text primary key,
  user_id text not null,
  tool text not null,
  args text not null default '{}',
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  result text
);

create index if not exists approvals_user_idx on approvals (user_id, created_at desc);

create table if not exists created_issues (
  id text primary key,
  user_id text not null,
  source_id text not null,
  payload text not null,
  created_at timestamptz not null default now()
);
