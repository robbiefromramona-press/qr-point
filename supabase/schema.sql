-- QR Point — Supabase schema (v1)
-- Run this in the Supabase SQL Editor (Project > SQL Editor > New query) once,
-- or via the CLI: supabase db push (if you set up migrations later).

create extension if not exists "pgcrypto";

create table if not exists public.points (
  id           text primary key,                 -- e.g. "PROJ123-P045", encoded in the QR URL
  project_id   text not null,                     -- groups points by CSV upload/project
  point_number text not null,                     -- as it appears in the Trimble export
  raw_data     jsonb not null default '{}'::jsonb, -- full CSV row, all columns preserved
  created_at   timestamptz not null default now()
);

-- Fast lookup by project (for the "browse a project's points" / manual search fallback)
create index if not exists points_project_id_idx on public.points (project_id);

-- Fast lookup by point number within a project (manual entry fallback)
create index if not exists points_point_number_idx on public.points (point_number);

-- Row Level Security: v1 has no login, but we still lock the table down.
-- All reads/writes go through Netlify Functions using the SERVICE ROLE key
-- (which bypasses RLS), so the anon/public key never touches this table directly.
alter table public.points enable row level security;

-- No policies are created, which means the anon key gets zero access by
-- default. This is intentional — the frontend never talks to Supabase
-- directly, only through the Netlify Functions (see netlify/functions/).

comment on table public.points is 'QR Point v1: one row per surveyed point, keyed by the ID encoded in its QR code.';
comment on column public.points.raw_data is 'Full parsed CSV row as JSON — schema varies by Trimble export template, so this stays flexible instead of fixed columns.';
