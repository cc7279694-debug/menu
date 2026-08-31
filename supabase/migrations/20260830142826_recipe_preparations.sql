create table public.recipe_preparations (
  id uuid primary key,
  user_id uuid not null,
  recipe_id uuid not null,
  recipe_ingredient_id uuid,
  instruction text not null,
  lead_time_minutes integer,
  timing_text text,
  sort_order integer not null check (sort_order >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint recipe_preparations_user_id_id_unique unique (user_id, id),
  constraint recipe_preparations_user_recipe_id_unique unique (user_id, recipe_id, id),
  constraint recipe_preparations_recipe_sort_unique unique (recipe_id, sort_order),
  constraint recipe_preparations_instruction_length check (char_length(trim(instruction)) between 1 and 500),
  constraint recipe_preparations_lead_time_range check (
    lead_time_minutes is null or lead_time_minutes between 1 and 43200
  ),
  constraint recipe_preparations_timing_text_length check (
    timing_text is null or char_length(trim(timing_text)) between 1 and 60
  ),
  constraint recipe_preparations_timing_required check (
    lead_time_minutes is not null or timing_text is not null
  ),
  constraint recipe_preparations_recipe_owner_fk
    foreign key (user_id, recipe_id)
    references public.recipes (user_id, id)
    on delete cascade,
  constraint recipe_preparations_ingredient_owner_fk
    foreign key (user_id, recipe_id, recipe_ingredient_id)
    references public.recipe_ingredients (user_id, recipe_id, id)
    on delete set null (recipe_ingredient_id)
);

create index recipe_preparations_user_recipe_idx
  on public.recipe_preparations (user_id, recipe_id, sort_order);

create trigger recipe_preparations_set_updated_at
before update on public.recipe_preparations
for each row execute function public.set_updated_at();

alter table public.recipe_preparations enable row level security;
alter table public.recipe_preparations force row level security;

create policy recipe_preparations_select on public.recipe_preparations
for select to authenticated using ((select auth.uid()) = user_id);
create policy recipe_preparations_insert on public.recipe_preparations
for insert to authenticated with check ((select auth.uid()) = user_id);
create policy recipe_preparations_update on public.recipe_preparations
for update to authenticated using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
create policy recipe_preparations_delete on public.recipe_preparations
for delete to authenticated using ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.recipe_preparations to authenticated;
revoke all on public.recipe_preparations from anon;

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
  v_preparation jsonb;
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
  delete from public.recipe_preparations where user_id = v_user_id and recipe_id = v_recipe_id;
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

  for v_preparation in
    select value from jsonb_array_elements(coalesce(p_payload->'preparations', '[]'::jsonb))
  loop
    insert into public.recipe_preparations (
      id, user_id, recipe_id, recipe_ingredient_id, instruction,
      lead_time_minutes, timing_text, sort_order
    ) values (
      (v_preparation->>'preparationId')::uuid,
      v_user_id,
      v_recipe_id,
      nullif(v_preparation->>'recipeIngredientId', '')::uuid,
      trim(v_preparation->>'instruction'),
      nullif(v_preparation->>'leadTimeMinutes', '')::integer,
      nullif(v_preparation->>'timingText', ''),
      (v_preparation->>'sortOrder')::integer
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

drop function public.search_recipe_summaries(text, uuid, uuid, boolean, boolean, integer, integer);

create function public.search_recipe_summaries(
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
  preparation_count bigint,
  max_lead_time_minutes integer,
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
    (select count(*) from public.recipe_preparations rp
      where rp.user_id = p.user_id and rp.recipe_id = p.id),
    (select max(rp.lead_time_minutes) from public.recipe_preparations rp
      where rp.user_id = p.user_id and rp.recipe_id = p.id),
    p.updated_at, p.total_count
  from paged p
  left join public.categories c on c.id = p.category_id and c.user_id = p.user_id
  order by p.updated_at desc, p.id desc;
$$;

revoke all on function public.search_recipe_summaries(text, uuid, uuid, boolean, boolean, integer, integer) from public, anon;
grant execute on function public.search_recipe_summaries(text, uuid, uuid, boolean, boolean, integer, integer) to authenticated;
