create schema if not exists extensions;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_display_name_length check (
    display_name is null or char_length(trim(display_name)) between 1 and 80
  )
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  sort_order integer not null default 0 check (sort_order >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint categories_user_id_id_unique unique (user_id, id),
  constraint categories_name_length check (char_length(trim(name)) between 1 and 40)
);

create unique index categories_user_name_unique
  on public.categories (user_id, lower(trim(name)));

create table public.tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tags_user_id_id_unique unique (user_id, id),
  constraint tags_name_length check (char_length(trim(name)) between 1 and 30)
);

create unique index tags_user_name_unique
  on public.tags (user_id, lower(trim(name)));

create table public.recipes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category_id uuid,
  title text not null,
  description text,
  cover_path text,
  base_servings numeric(8, 2) not null,
  prep_minutes integer,
  cook_minutes integer,
  personal_notes text,
  is_favorite boolean not null default false,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint recipes_user_id_id_unique unique (user_id, id),
  constraint recipes_title_length check (char_length(trim(title)) between 1 and 100),
  constraint recipes_description_length check (description is null or char_length(description) <= 500),
  constraint recipes_base_servings_positive check (base_servings > 0 and base_servings <= 1000),
  constraint recipes_prep_minutes_range check (prep_minutes is null or prep_minutes between 0 and 10080),
  constraint recipes_cook_minutes_range check (cook_minutes is null or cook_minutes between 0 and 10080),
  constraint recipes_notes_length check (personal_notes is null or char_length(personal_notes) <= 4000),
  constraint recipes_category_owner_fk
    foreign key (user_id, category_id)
    references public.categories (user_id, id)
    on delete set null (category_id)
);

create table public.recipe_tags (
  user_id uuid not null,
  recipe_id uuid not null,
  tag_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (recipe_id, tag_id),
  constraint recipe_tags_recipe_owner_fk
    foreign key (user_id, recipe_id)
    references public.recipes (user_id, id)
    on delete cascade,
  constraint recipe_tags_tag_owner_fk
    foreign key (user_id, tag_id)
    references public.tags (user_id, id)
    on delete cascade
);

create table public.ingredients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null,
  normalized_name text not null,
  default_aisle text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ingredients_user_id_id_unique unique (user_id, id),
  constraint ingredients_display_name_length check (char_length(trim(display_name)) between 1 and 80),
  constraint ingredients_normalized_name_length check (char_length(normalized_name) between 1 and 80),
  constraint ingredients_aisle_length check (default_aisle is null or char_length(default_aisle) <= 40),
  constraint ingredients_user_normalized_unique unique (user_id, normalized_name)
);

create table public.recipe_ingredients (
  id uuid primary key,
  user_id uuid not null,
  recipe_id uuid not null,
  ingredient_id uuid not null,
  quantity numeric(12, 3),
  quantity_text text,
  unit text,
  preparation_note text,
  sort_order integer not null check (sort_order >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint recipe_ingredients_user_id_id_unique unique (user_id, id),
  constraint recipe_ingredients_user_recipe_id_unique unique (user_id, recipe_id, id),
  constraint recipe_ingredients_recipe_sort_unique unique (recipe_id, sort_order),
  constraint recipe_ingredients_quantity_positive check (quantity is null or quantity > 0),
  constraint recipe_ingredients_quantity_text_length check (
    quantity_text is null or char_length(trim(quantity_text)) between 1 and 40
  ),
  constraint recipe_ingredients_unit_length check (unit is null or char_length(trim(unit)) <= 20),
  constraint recipe_ingredients_preparation_length check (
    preparation_note is null or char_length(preparation_note) <= 120
  ),
  constraint recipe_ingredients_recipe_owner_fk
    foreign key (user_id, recipe_id)
    references public.recipes (user_id, id)
    on delete cascade,
  constraint recipe_ingredients_ingredient_owner_fk
    foreign key (user_id, ingredient_id)
    references public.ingredients (user_id, id)
    on delete cascade
);

create table public.recipe_steps (
  id uuid primary key,
  user_id uuid not null,
  recipe_id uuid not null,
  instruction text not null,
  image_path text,
  timer_seconds integer,
  sort_order integer not null check (sort_order >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint recipe_steps_user_id_id_unique unique (user_id, id),
  constraint recipe_steps_user_recipe_id_unique unique (user_id, recipe_id, id),
  constraint recipe_steps_recipe_sort_unique unique (recipe_id, sort_order),
  constraint recipe_steps_instruction_length check (char_length(trim(instruction)) between 1 and 2000),
  constraint recipe_steps_timer_range check (timer_seconds is null or timer_seconds between 1 and 86400),
  constraint recipe_steps_recipe_owner_fk
    foreign key (user_id, recipe_id)
    references public.recipes (user_id, id)
    on delete cascade
);

create table public.step_ingredients (
  user_id uuid not null,
  recipe_id uuid not null,
  step_id uuid not null,
  recipe_ingredient_id uuid not null,
  quantity_override numeric(12, 3),
  quantity_text_override text,
  note text,
  created_at timestamptz not null default now(),
  primary key (step_id, recipe_ingredient_id),
  constraint step_ingredients_quantity_positive check (
    quantity_override is null or quantity_override > 0
  ),
  constraint step_ingredients_quantity_text_length check (
    quantity_text_override is null or char_length(trim(quantity_text_override)) between 1 and 40
  ),
  constraint step_ingredients_note_length check (note is null or char_length(note) <= 120),
  constraint step_ingredients_step_owner_fk
    foreign key (user_id, recipe_id, step_id)
    references public.recipe_steps (user_id, recipe_id, id)
    on delete cascade,
  constraint step_ingredients_ingredient_owner_fk
    foreign key (user_id, recipe_id, recipe_ingredient_id)
    references public.recipe_ingredients (user_id, recipe_id, id)
    on delete cascade
);

create index categories_user_id_idx on public.categories (user_id);
create index tags_user_id_idx on public.tags (user_id);
create index recipes_user_updated_active_idx
  on public.recipes (user_id, updated_at desc, id desc)
  where deleted_at is null;
create index recipes_user_favorite_idx
  on public.recipes (user_id, updated_at desc, id desc)
  where is_favorite and deleted_at is null;
create index recipes_user_deleted_idx
  on public.recipes (user_id, updated_at desc, id desc)
  where deleted_at is not null;
create index recipe_tags_user_recipe_idx on public.recipe_tags (user_id, recipe_id);
create index recipe_tags_user_tag_idx on public.recipe_tags (user_id, tag_id);
create index ingredients_user_id_idx on public.ingredients (user_id);
create index recipe_ingredients_user_recipe_idx on public.recipe_ingredients (user_id, recipe_id, sort_order);
create index recipe_ingredients_user_ingredient_idx on public.recipe_ingredients (user_id, ingredient_id);
create index recipe_steps_user_recipe_idx on public.recipe_steps (user_id, recipe_id, sort_order);
create index step_ingredients_user_recipe_idx on public.step_ingredients (user_id, recipe_id, step_id);

do $$
begin
  begin
    create extension if not exists pg_trgm with schema extensions;
  exception
    when others then
      if sqlstate <> '0A000' then
        raise;
      end if;
  end;

  if exists (
    select 1 from pg_catalog.pg_opclass where opcname = 'gin_trgm_ops'
  ) then
    execute 'create index recipes_title_search_idx on public.recipes using gin (lower(title) extensions.gin_trgm_ops)';
    execute 'create index ingredients_name_search_idx on public.ingredients using gin (lower(normalized_name) extensions.gin_trgm_ops)';
    execute 'create index tags_name_search_idx on public.tags using gin (lower(name) extensions.gin_trgm_ops)';
  else
    create index recipes_title_search_idx on public.recipes (lower(title));
    create index ingredients_name_search_idx on public.ingredients (lower(normalized_name));
    create index tags_name_search_idx on public.tags (lower(name));
  end if;
end
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();
create trigger categories_set_updated_at
before update on public.categories
for each row execute function public.set_updated_at();
create trigger tags_set_updated_at
before update on public.tags
for each row execute function public.set_updated_at();
create trigger recipes_set_updated_at
before update on public.recipes
for each row execute function public.set_updated_at();
create trigger ingredients_set_updated_at
before update on public.ingredients
for each row execute function public.set_updated_at();
create trigger recipe_ingredients_set_updated_at
before update on public.recipe_ingredients
for each row execute function public.set_updated_at();
create trigger recipe_steps_set_updated_at
before update on public.recipe_steps
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  insert into public.profiles (id) values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

insert into public.profiles (id)
select id from auth.users
on conflict (id) do nothing;

create or replace function public.save_recipe(p_payload jsonb)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_recipe_id uuid := (p_payload->>'recipeId')::uuid;
  v_category_id uuid := nullif(p_payload->>'categoryId', '')::uuid;
  v_existing_deleted_at timestamptz;
  v_ingredient jsonb;
  v_step jsonb;
  v_link jsonb;
  v_ingredient_id uuid;
  v_ingredient_name text;
  v_normalized_name text;
  v_tag_count integer;
  v_tag_distinct_count integer;
begin
  if v_user_id is null then
    raise exception using errcode = '28000', message = 'authentication required';
  end if;

  if v_recipe_id is null or p_payload->>'title' is null then
    raise exception using errcode = '22023', message = 'invalid recipe payload';
  end if;

  select deleted_at into v_existing_deleted_at
  from public.recipes
  where id = v_recipe_id and user_id = v_user_id
  for update;

  if v_existing_deleted_at is not null then
    raise exception using errcode = '55000', message = 'deleted recipe cannot be edited';
  end if;

  if v_category_id is not null and not exists (
    select 1 from public.categories where id = v_category_id and user_id = v_user_id
  ) then
    raise exception using errcode = '23503', message = 'category does not belong to user';
  end if;

  select count(*), count(distinct value)
  into v_tag_count, v_tag_distinct_count
  from jsonb_array_elements_text(coalesce(p_payload->'tagIds', '[]'::jsonb));
  if v_tag_count <> v_tag_distinct_count or exists (
    select 1
    from jsonb_array_elements_text(coalesce(p_payload->'tagIds', '[]'::jsonb)) tag_id
    where not exists (
      select 1 from public.tags where id = tag_id.value::uuid and user_id = v_user_id
    )
  ) then
    raise exception using errcode = '23503', message = 'tag does not belong to user';
  end if;

  insert into public.recipes (
    id, user_id, category_id, title, description, cover_path, base_servings,
    prep_minutes, cook_minutes, personal_notes, is_favorite, deleted_at
  ) values (
    v_recipe_id, v_user_id, v_category_id, trim(p_payload->>'title'),
    nullif(p_payload->>'description', ''), nullif(p_payload->>'coverPath', ''),
    (p_payload->>'baseServings')::numeric, nullif(p_payload->>'prepMinutes', '')::integer,
    nullif(p_payload->>'cookMinutes', '')::integer, nullif(p_payload->>'personalNotes', ''),
    false, null
  )
  on conflict (id) do update set
    category_id = excluded.category_id,
    title = excluded.title,
    description = excluded.description,
    cover_path = excluded.cover_path,
    base_servings = excluded.base_servings,
    prep_minutes = excluded.prep_minutes,
    cook_minutes = excluded.cook_minutes,
    personal_notes = excluded.personal_notes,
    deleted_at = null;

  delete from public.step_ingredients where user_id = v_user_id and recipe_id = v_recipe_id;
  delete from public.recipe_tags where user_id = v_user_id and recipe_id = v_recipe_id;
  delete from public.recipe_steps where user_id = v_user_id and recipe_id = v_recipe_id;
  delete from public.recipe_ingredients where user_id = v_user_id and recipe_id = v_recipe_id;

  insert into public.recipe_tags (user_id, recipe_id, tag_id)
  select v_user_id, v_recipe_id, value::uuid
  from jsonb_array_elements_text(coalesce(p_payload->'tagIds', '[]'::jsonb));

  for v_ingredient in select value from jsonb_array_elements(p_payload->'ingredients') loop
    v_ingredient_name := trim(v_ingredient->>'name');
    v_normalized_name := lower(regexp_replace(v_ingredient_name, '\s+', ' ', 'g'));

    insert into public.ingredients (user_id, display_name, normalized_name)
    values (v_user_id, v_ingredient_name, v_normalized_name)
    on conflict (user_id, normalized_name) do update set
      display_name = excluded.display_name,
      updated_at = now()
    returning id into v_ingredient_id;

    insert into public.recipe_ingredients (
      id, user_id, recipe_id, ingredient_id, quantity, quantity_text,
      unit, preparation_note, sort_order
    ) values (
      (v_ingredient->>'recipeIngredientId')::uuid, v_user_id, v_recipe_id, v_ingredient_id,
      nullif(v_ingredient->>'quantity', '')::numeric,
      nullif(v_ingredient->>'quantityText', ''), nullif(v_ingredient->>'unit', ''),
      nullif(v_ingredient->>'preparationNote', ''), (v_ingredient->>'sortOrder')::integer
    );
  end loop;

  for v_step in select value from jsonb_array_elements(p_payload->'steps') loop
    insert into public.recipe_steps (
      id, user_id, recipe_id, instruction, image_path, timer_seconds, sort_order
    ) values (
      (v_step->>'stepId')::uuid, v_user_id, v_recipe_id, trim(v_step->>'instruction'),
      nullif(v_step->>'imagePath', ''), nullif(v_step->>'timerSeconds', '')::integer,
      (v_step->>'sortOrder')::integer
    );

    for v_link in select value from jsonb_array_elements(coalesce(v_step->'ingredientLinks', '[]'::jsonb)) loop
      insert into public.step_ingredients (
        user_id, recipe_id, step_id, recipe_ingredient_id,
        quantity_override, quantity_text_override, note
      ) values (
        v_user_id, v_recipe_id, (v_step->>'stepId')::uuid,
        (v_link->>'recipeIngredientId')::uuid,
        nullif(v_link->>'quantityOverride', '')::numeric,
        nullif(v_link->>'quantityTextOverride', ''), nullif(v_link->>'note', '')
      );
    end loop;
  end loop;

  return v_recipe_id;
end;
$$;

create or replace function public.search_recipe_summaries(
  p_query text default null,
  p_category_id uuid default null,
  p_tag_id uuid default null,
  p_favorite_only boolean default false,
  p_deleted_only boolean default false,
  p_limit integer default 24,
  p_offset integer default 0
)
returns table (
  recipe_id uuid,
  title text,
  description text,
  cover_path text,
  base_servings numeric,
  prep_minutes integer,
  cook_minutes integer,
  is_favorite boolean,
  category_id uuid,
  category_name text,
  tags jsonb,
  updated_at timestamptz,
  total_count bigint
)
language sql
stable
security invoker
set search_path = ''
as $$
  with params as (
    select
      (select auth.uid()) as user_id,
      pg_catalog.replace(
        pg_catalog.replace(
          pg_catalog.replace(pg_catalog.lower(pg_catalog.btrim(coalesce(p_query, ''))), '#', '##'),
          '%', '#%'
        ), '_', '#_'
      ) as query_text,
      greatest(0, coalesce(p_offset, 0)) as row_offset,
      least(100, greatest(1, coalesce(p_limit, 24))) as row_limit
  ), filtered as (
    select r.*
    from public.recipes r
    cross join params p
    where r.user_id = p.user_id
      and ((p_deleted_only and r.deleted_at is not null) or (not p_deleted_only and r.deleted_at is null))
      and (not p_favorite_only or r.is_favorite)
      and (p_category_id is null or r.category_id = p_category_id)
      and (
        p.query_text = ''
        or pg_catalog.lower(r.title) like '%' || p.query_text || '%' escape '#'
        or exists (
          select 1
          from public.recipe_ingredients ri
          join public.ingredients i on i.id = ri.ingredient_id and i.user_id = r.user_id
          where ri.recipe_id = r.id and ri.user_id = r.user_id
            and pg_catalog.lower(i.normalized_name) like '%' || p.query_text || '%' escape '#'
        )
        or exists (
          select 1
          from public.recipe_tags rt
          join public.tags t on t.id = rt.tag_id and t.user_id = r.user_id
          where rt.recipe_id = r.id and rt.user_id = r.user_id
            and pg_catalog.lower(t.name) like '%' || p.query_text || '%' escape '#'
        )
      )
      and (
        p_tag_id is null or exists (
          select 1 from public.recipe_tags rt
          where rt.recipe_id = r.id and rt.tag_id = p_tag_id and rt.user_id = r.user_id
        )
      )
  ), paged as (
    select f.*, count(*) over () as total_count
    from filtered f
    order by f.updated_at desc, f.id desc
    offset (select row_offset from params)
    limit (select row_limit from params)
  )
  select
    p.id, p.title, p.description, p.cover_path, p.base_servings, p.prep_minutes,
    p.cook_minutes, p.is_favorite, p.category_id, c.name,
    coalesce((
      select pg_catalog.jsonb_agg(
        pg_catalog.jsonb_build_object('id', t.id, 'name', t.name)
        order by t.name
      )
      from public.recipe_tags rt
      join public.tags t on t.id = rt.tag_id and t.user_id = p.user_id
      where rt.recipe_id = p.id and rt.user_id = p.user_id
    ), '[]'::jsonb),
    p.updated_at, p.total_count
  from paged p
  left join public.categories c on c.id = p.category_id and c.user_id = p.user_id
  order by p.updated_at desc, p.id desc;
$$;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('recipe-media', 'recipe-media', false, 5242880, array['image/jpeg', 'image/png', 'image/webp']::text[])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

alter table public.profiles enable row level security;
alter table public.profiles force row level security;
alter table public.categories enable row level security;
alter table public.categories force row level security;
alter table public.tags enable row level security;
alter table public.tags force row level security;
alter table public.recipes enable row level security;
alter table public.recipes force row level security;
alter table public.recipe_tags enable row level security;
alter table public.recipe_tags force row level security;
alter table public.ingredients enable row level security;
alter table public.ingredients force row level security;
alter table public.recipe_ingredients enable row level security;
alter table public.recipe_ingredients force row level security;
alter table public.recipe_steps enable row level security;
alter table public.recipe_steps force row level security;
alter table public.step_ingredients enable row level security;
alter table public.step_ingredients force row level security;

create policy profiles_select on public.profiles for select to authenticated
using ((select auth.uid()) = id);
create policy profiles_insert on public.profiles for insert to authenticated
with check ((select auth.uid()) = id);
create policy profiles_update on public.profiles for update to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

create policy categories_select on public.categories for select to authenticated
using ((select auth.uid()) = user_id);
create policy categories_insert on public.categories for insert to authenticated
with check ((select auth.uid()) = user_id);
create policy categories_update on public.categories for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
create policy categories_delete on public.categories for delete to authenticated
using ((select auth.uid()) = user_id);

create policy tags_select on public.tags for select to authenticated
using ((select auth.uid()) = user_id);
create policy tags_insert on public.tags for insert to authenticated
with check ((select auth.uid()) = user_id);
create policy tags_update on public.tags for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
create policy tags_delete on public.tags for delete to authenticated
using ((select auth.uid()) = user_id);

create policy recipes_select on public.recipes for select to authenticated
using ((select auth.uid()) = user_id);
create policy recipes_insert on public.recipes for insert to authenticated
with check ((select auth.uid()) = user_id);
create policy recipes_update on public.recipes for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
create policy recipes_delete on public.recipes for delete to authenticated
using ((select auth.uid()) = user_id);

create policy recipe_tags_select on public.recipe_tags for select to authenticated
using ((select auth.uid()) = user_id);
create policy recipe_tags_insert on public.recipe_tags for insert to authenticated
with check ((select auth.uid()) = user_id);
create policy recipe_tags_update on public.recipe_tags for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
create policy recipe_tags_delete on public.recipe_tags for delete to authenticated
using ((select auth.uid()) = user_id);

create policy ingredients_select on public.ingredients for select to authenticated
using ((select auth.uid()) = user_id);
create policy ingredients_insert on public.ingredients for insert to authenticated
with check ((select auth.uid()) = user_id);
create policy ingredients_update on public.ingredients for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
create policy ingredients_delete on public.ingredients for delete to authenticated
using ((select auth.uid()) = user_id);

create policy recipe_ingredients_select on public.recipe_ingredients for select to authenticated
using ((select auth.uid()) = user_id);
create policy recipe_ingredients_insert on public.recipe_ingredients for insert to authenticated
with check ((select auth.uid()) = user_id);
create policy recipe_ingredients_update on public.recipe_ingredients for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
create policy recipe_ingredients_delete on public.recipe_ingredients for delete to authenticated
using ((select auth.uid()) = user_id);

create policy recipe_steps_select on public.recipe_steps for select to authenticated
using ((select auth.uid()) = user_id);
create policy recipe_steps_insert on public.recipe_steps for insert to authenticated
with check ((select auth.uid()) = user_id);
create policy recipe_steps_update on public.recipe_steps for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
create policy recipe_steps_delete on public.recipe_steps for delete to authenticated
using ((select auth.uid()) = user_id);

create policy step_ingredients_select on public.step_ingredients for select to authenticated
using ((select auth.uid()) = user_id);
create policy step_ingredients_insert on public.step_ingredients for insert to authenticated
with check ((select auth.uid()) = user_id);
create policy step_ingredients_update on public.step_ingredients for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
create policy step_ingredients_delete on public.step_ingredients for delete to authenticated
using ((select auth.uid()) = user_id);

create policy recipe_media_select on storage.objects for select to authenticated
using (
  bucket_id = 'recipe-media'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);
create policy recipe_media_insert on storage.objects for insert to authenticated
with check (
  bucket_id = 'recipe-media'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);
create policy recipe_media_delete on storage.objects for delete to authenticated
using (
  bucket_id = 'recipe-media'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

revoke all on all tables in schema public from anon;
grant select, insert, update, delete on all tables in schema public to authenticated;
revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.set_updated_at() from public, anon, authenticated;
revoke all on function public.save_recipe(jsonb) from public, anon;
grant execute on function public.save_recipe(jsonb) to authenticated;
revoke all on function public.search_recipe_summaries(text, uuid, uuid, boolean, boolean, integer, integer) from public, anon;
grant execute on function public.search_recipe_summaries(text, uuid, uuid, boolean, boolean, integer, integer) to authenticated;
