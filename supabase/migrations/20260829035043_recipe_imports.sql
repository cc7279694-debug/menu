alter table public.recipe_ingredients
  add column group_type text not null default 'main'
  constraint recipe_ingredients_group_type_check
  check (group_type in ('main', 'seasoning', 'other'));

alter table public.recipe_steps
  add column heat_level text
  constraint recipe_steps_heat_level_length_check
  check (heat_level is null or char_length(trim(heat_level)) between 1 and 60);

create table public.recipe_import_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_type text not null check (source_type in ('url', 'text', 'images')),
  source_url text,
  source_title text,
  source_author text,
  source_platform text,
  source_text text,
  image_paths jsonb not null default '[]'::jsonb
    check (jsonb_typeof(image_paths) = 'array'),
  status text not null default 'queued'
    check (status in ('queued', 'fetching', 'extracting', 'review', 'failed', 'saved')),
  draft jsonb,
  warnings jsonb not null default '[]'::jsonb
    check (jsonb_typeof(warnings) = 'array'),
  error_code text,
  recipe_id uuid references public.recipes(id) on delete set null,
  expires_at timestamptz not null default (now() + interval '24 hours'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint recipe_import_jobs_source_url_length check (
    source_url is null or char_length(source_url) <= 2048
  ),
  constraint recipe_import_jobs_source_text_length check (
    source_text is null or char_length(source_text) <= 60000
  ),
  constraint recipe_import_jobs_user_id_id_unique unique (user_id, id)
);

create table public.recipe_sources (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  recipe_id uuid not null,
  source_type text not null check (source_type in ('url', 'text', 'images')),
  source_url text,
  source_title text,
  source_author text,
  source_platform text,
  created_at timestamptz not null default now(),
  constraint recipe_sources_user_recipe_unique unique (user_id, recipe_id),
  constraint recipe_sources_recipe_owner_fk
    foreign key (user_id, recipe_id)
    references public.recipes (user_id, id)
    on delete cascade,
  constraint recipe_sources_source_url_length check (
    source_url is null or char_length(source_url) <= 2048
  )
);

create index recipe_import_jobs_user_created_idx
  on public.recipe_import_jobs (user_id, created_at desc);
create index recipe_import_jobs_expiry_idx
  on public.recipe_import_jobs (user_id, expires_at)
  where status <> 'saved';
create index recipe_sources_user_recipe_idx
  on public.recipe_sources (user_id, recipe_id);

create trigger recipe_import_jobs_set_updated_at
before update on public.recipe_import_jobs
for each row execute function public.set_updated_at();

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'recipe-imports', 'recipe-imports', false, 5242880,
  array['image/jpeg', 'image/png', 'image/webp']::text[]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

alter table public.recipe_import_jobs enable row level security;
alter table public.recipe_import_jobs force row level security;
alter table public.recipe_sources enable row level security;
alter table public.recipe_sources force row level security;

create policy recipe_import_jobs_select on public.recipe_import_jobs
for select to authenticated
using ((select auth.uid()) = user_id);
create policy recipe_import_jobs_insert on public.recipe_import_jobs
for insert to authenticated
with check ((select auth.uid()) = user_id);
create policy recipe_import_jobs_update on public.recipe_import_jobs
for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
create policy recipe_import_jobs_delete on public.recipe_import_jobs
for delete to authenticated
using ((select auth.uid()) = user_id);

create policy recipe_sources_select on public.recipe_sources
for select to authenticated
using ((select auth.uid()) = user_id);
create policy recipe_sources_insert on public.recipe_sources
for insert to authenticated
with check ((select auth.uid()) = user_id);
create policy recipe_sources_update on public.recipe_sources
for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
create policy recipe_sources_delete on public.recipe_sources
for delete to authenticated
using ((select auth.uid()) = user_id);

create policy recipe_import_media_select on storage.objects
for select to authenticated
using (
  bucket_id = 'recipe-imports'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);
create policy recipe_import_media_insert on storage.objects
for insert to authenticated
with check (
  bucket_id = 'recipe-imports'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);
create policy recipe_import_media_delete on storage.objects
for delete to authenticated
using (
  bucket_id = 'recipe-imports'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

grant select, insert, update, delete on public.recipe_import_jobs to authenticated;
grant select, insert, update, delete on public.recipe_sources to authenticated;
revoke all on public.recipe_import_jobs from anon;
revoke all on public.recipe_sources from anon;

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
      unit, preparation_note, group_type, sort_order
    ) values (
      (v_ingredient->>'recipeIngredientId')::uuid, v_user_id, v_recipe_id, v_ingredient_id,
      nullif(v_ingredient->>'quantity', '')::numeric,
      nullif(v_ingredient->>'quantityText', ''), nullif(v_ingredient->>'unit', ''),
      nullif(v_ingredient->>'preparationNote', ''),
      coalesce(nullif(v_ingredient->>'groupType', ''), 'main'),
      (v_ingredient->>'sortOrder')::integer
    );
  end loop;

  for v_step in select value from jsonb_array_elements(p_payload->'steps') loop
    insert into public.recipe_steps (
      id, user_id, recipe_id, instruction, image_path, timer_seconds, heat_level, sort_order
    ) values (
      (v_step->>'stepId')::uuid, v_user_id, v_recipe_id, trim(v_step->>'instruction'),
      nullif(v_step->>'imagePath', ''), nullif(v_step->>'timerSeconds', '')::integer,
      nullif(v_step->>'heatLevel', ''), (v_step->>'sortOrder')::integer
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
