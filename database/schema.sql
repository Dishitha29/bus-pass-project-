-- BusPass: Bus Pass Application & Transport Management System
-- Run this entire script in Supabase Dashboard > SQL Editor > New query.
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  full_name varchar(80) not null check (char_length(trim(full_name)) between 2 and 80),
  email text not null unique check (email = lower(email)),
  password_hash text not null,
  role text not null default 'student' check (role in ('student', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.bus_pass_applications (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  applicant_name varchar(100) not null check (char_length(trim(applicant_name)) between 2 and 100),
  phone varchar(20) not null check (phone ~ '^[0-9+() -]{7,20}$'),
  pass_type text not null check (pass_type in ('Student', 'General', 'Monthly')),
  route_start varchar(120) not null,
  route_end varchar(120) not null,
  requested_start_date date not null check (requested_start_date >= current_date),
  address varchar(400) not null check (char_length(trim(address)) between 5 and 400),
  status text not null default 'Pending' check (status in ('Pending', 'Approved', 'Rejected')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  constraint different_route_points check (lower(trim(route_start)) <> lower(trim(route_end)))
);

create index if not exists bus_pass_applications_user_created_idx
  on public.bus_pass_applications (user_id, created_at desc);
create index if not exists bus_pass_applications_status_created_idx
  on public.bus_pass_applications (status, created_at desc);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

-- This app connects through its Node.js backend using a server-side service key.
-- Browser users must never connect with the service key. Enable RLS as a safety
-- boundary; backend access uses the privileged server key after enforcing JWT
-- identity and role checks in the API.
alter table public.profiles enable row level security;
alter table public.bus_pass_applications enable row level security;

-- No anon/authenticated policies are intentionally created: direct browser
-- access is not part of this app's design. The Node backend is the trusted API.
