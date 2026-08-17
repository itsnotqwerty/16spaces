-- 0001_init.sql
-- Initial PR3 scaffold migration.
-- This establishes extension and healthcheck RPC; core schema tables are added iteratively.

create extension if not exists citext;

create or replace function public.healthcheck()
returns boolean
language sql
security definer
as $$
  select true;
$$;

grant execute on function public.healthcheck() to service_role;
