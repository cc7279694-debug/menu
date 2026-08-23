import { PGlite } from "@electric-sql/pglite";

export async function createDatabase(): Promise<PGlite> {
  const database = new PGlite();

  await database.exec(`
    create role anon;
    create role authenticated;

    create or replace function public.gen_random_uuid()
    returns uuid
    language sql
    volatile
    as $$
      select (
        substr(value, 1, 8) || '-' ||
        substr(value, 9, 4) || '-4' ||
        substr(value, 14, 3) || '-' ||
        substr('89ab', (get_byte(decode(substr(value, 17, 2), 'hex'), 0) % 4) + 1, 1) ||
        substr(value, 19, 12)
      )::uuid
      from (select md5(random()::text || clock_timestamp()::text) as value) seed
    $$;

    create schema auth;
    create table auth.users (
      id uuid primary key,
      email text unique
    );

    create or replace function auth.uid()
    returns uuid
    language sql
    stable
    as $$
      select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
    $$;

    create schema storage;
    create table storage.buckets (
      id text primary key,
      name text not null,
      public boolean not null default false,
      file_size_limit bigint,
      allowed_mime_types text[]
    );

    create table storage.objects (
      id uuid primary key default gen_random_uuid(),
      bucket_id text not null,
      name text not null,
      owner_id uuid,
      metadata jsonb,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      last_accessed_at timestamptz
    );

    create or replace function storage.foldername(object_name text)
    returns text[]
    language sql
    immutable
    as $$
      select string_to_array(object_name, '/')
    $$;

    grant usage on schema auth, storage to authenticated;
    grant execute on function auth.uid() to authenticated;
    grant execute on function storage.foldername(text) to authenticated;
    grant select, insert, update, delete on storage.objects to authenticated;
  `);

  return database;
}

export async function asUser(database: PGlite, userId: string) {
  await database.query("select set_config('request.jwt.claim.sub', $1, false)", [userId]);
  await database.exec("set role authenticated");
}

export async function asOwner(database: PGlite) {
  await database.exec("reset role");
  await database.exec("select set_config('request.jwt.claim.sub', '', false)");
}
