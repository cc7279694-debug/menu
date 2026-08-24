create table public.shopping_lists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null default '当前购物清单',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint shopping_lists_user_id_id_unique unique (user_id, id),
  constraint shopping_lists_name_length check (char_length(trim(name)) between 1 and 80)
);

create unique index shopping_lists_one_active_per_user_idx
  on public.shopping_lists (user_id) where is_active;
create index shopping_lists_user_updated_idx
  on public.shopping_lists (user_id, updated_at desc, id desc);

create table public.shopping_list_sources (
  id uuid primary key,
  user_id uuid not null,
  shopping_list_id uuid not null,
  recipe_id uuid,
  recipe_title_snapshot text not null,
  selected_servings numeric(8, 2) not null,
  created_at timestamptz not null default now(),
  constraint shopping_list_sources_user_id_id_unique unique (user_id, id),
  constraint shopping_list_sources_user_list_id_unique unique (user_id, shopping_list_id, id),
  constraint shopping_list_sources_recipe_unique unique (shopping_list_id, recipe_id),
  constraint shopping_list_sources_title_length check (char_length(trim(recipe_title_snapshot)) between 1 and 100),
  constraint shopping_list_sources_servings_range check (selected_servings > 0 and selected_servings <= 1000),
  constraint shopping_list_sources_list_owner_fk foreign key (user_id, shopping_list_id)
    references public.shopping_lists (user_id, id) on delete cascade,
  constraint shopping_list_sources_recipe_owner_fk foreign key (user_id, recipe_id)
    references public.recipes (user_id, id) on delete set null
);

create table public.shopping_list_items (
  id uuid primary key,
  user_id uuid not null,
  shopping_list_id uuid not null,
  ingredient_id uuid,
  name_snapshot text not null,
  quantity numeric(12, 3),
  quantity_text text,
  unit text,
  aisle text,
  is_checked boolean not null default false,
  is_manual boolean not null default false,
  sort_order integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint shopping_list_items_user_id_id_unique unique (user_id, id),
  constraint shopping_list_items_user_list_id_unique unique (user_id, shopping_list_id, id),
  constraint shopping_list_items_sort_unique unique (shopping_list_id, sort_order) deferrable initially deferred,
  constraint shopping_list_items_name_length check (char_length(trim(name_snapshot)) between 1 and 80),
  constraint shopping_list_items_quantity_positive check (quantity is null or quantity > 0),
  constraint shopping_list_items_quantity_text_length check (quantity_text is null or char_length(trim(quantity_text)) between 1 and 40),
  constraint shopping_list_items_amount_shape check (quantity is null or quantity_text is null),
  constraint shopping_list_items_unit_length check (unit is null or char_length(trim(unit)) <= 20),
  constraint shopping_list_items_aisle_length check (aisle is null or char_length(trim(aisle)) <= 40),
  constraint shopping_list_items_sort_nonnegative check (sort_order >= 0),
  constraint shopping_list_items_list_owner_fk foreign key (user_id, shopping_list_id)
    references public.shopping_lists (user_id, id) on delete cascade,
  constraint shopping_list_items_ingredient_owner_fk foreign key (user_id, ingredient_id)
    references public.ingredients (user_id, id) on delete set null
);

create table public.shopping_list_item_sources (
  id uuid primary key,
  user_id uuid not null,
  shopping_list_id uuid not null,
  shopping_list_item_id uuid not null,
  shopping_list_source_id uuid not null,
  recipe_ingredient_id uuid,
  quantity_contribution numeric(12, 3),
  quantity_text_contribution text,
  unit_snapshot text,
  created_at timestamptz not null default now(),
  constraint shopping_list_item_sources_user_id_id_unique unique (user_id, id),
  constraint shopping_list_item_sources_origin_unique unique (shopping_list_item_id, shopping_list_source_id, recipe_ingredient_id),
  constraint shopping_list_item_sources_quantity_positive check (quantity_contribution is null or quantity_contribution > 0),
  constraint shopping_list_item_sources_text_length check (quantity_text_contribution is null or char_length(trim(quantity_text_contribution)) between 1 and 40),
  constraint shopping_list_item_sources_amount_shape check (quantity_contribution is null or quantity_text_contribution is null),
  constraint shopping_list_item_sources_unit_length check (unit_snapshot is null or char_length(trim(unit_snapshot)) <= 20),
  constraint shopping_list_item_sources_item_owner_fk foreign key (user_id, shopping_list_id, shopping_list_item_id)
    references public.shopping_list_items (user_id, shopping_list_id, id) on delete cascade,
  constraint shopping_list_item_sources_source_owner_fk foreign key (user_id, shopping_list_id, shopping_list_source_id)
    references public.shopping_list_sources (user_id, shopping_list_id, id) on delete cascade,
  constraint shopping_list_item_sources_recipe_ingredient_owner_fk foreign key (user_id, recipe_ingredient_id)
    references public.recipe_ingredients (user_id, id) on delete set null
);

create index shopping_list_sources_user_list_idx
  on public.shopping_list_sources (user_id, shopping_list_id, id);
create index shopping_list_items_user_list_idx
  on public.shopping_list_items (user_id, shopping_list_id, is_checked, sort_order);
create index shopping_list_item_sources_user_list_item_idx
  on public.shopping_list_item_sources (user_id, shopping_list_id, shopping_list_item_id);

create trigger shopping_lists_set_updated_at
before update on public.shopping_lists
for each row execute function public.set_updated_at();

create trigger shopping_list_items_set_updated_at
before update on public.shopping_list_items
for each row execute function public.set_updated_at();

create or replace function public.replace_active_shopping_list(p_payload jsonb)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_list_id uuid := nullif(p_payload->>'listId', '')::uuid;
  v_name text := coalesce(nullif(trim(p_payload->>'name'), ''), '当前购物清单');
  v_existing_active_list_id uuid;
  v_source_count integer;
  v_distinct_source_count integer;
begin
  if v_user_id is null then
    raise exception using errcode = '28000', message = 'authentication required';
  end if;

  if v_list_id is null then
    raise exception using errcode = '22023', message = 'invalid shopping list payload';
  end if;

  perform 1
  from public.profiles
  where id = v_user_id
  for update;

  if not found then
    raise exception using errcode = '23503', message = 'profile does not exist';
  end if;

  select count(*), count(distinct source_row."recipeId")
  into v_source_count, v_distinct_source_count
  from jsonb_to_recordset(coalesce(p_payload->'sources', '[]'::jsonb)) as source_row(
    "id" uuid,
    "recipeId" uuid,
    "recipeTitleSnapshot" text,
    "selectedServings" numeric(8, 2)
  );

  if v_source_count < 1 or v_source_count > 20 or v_source_count <> v_distinct_source_count then
    raise exception using errcode = '22023', message = 'invalid shopping sources';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(coalesce(p_payload->'sources', '[]'::jsonb)) as source_row(
      "id" uuid,
      "recipeId" uuid,
      "recipeTitleSnapshot" text,
      "selectedServings" numeric(8, 2)
    )
    where source_row."id" is null
      or source_row."recipeId" is null
      or source_row."recipeTitleSnapshot" is null
      or char_length(trim(source_row."recipeTitleSnapshot")) not between 1 and 100
      or source_row."selectedServings" is null
      or source_row."selectedServings" <= 0
      or source_row."selectedServings" > 1000
  ) then
    raise exception using errcode = '22023', message = 'invalid shopping source entry';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(coalesce(p_payload->'sources', '[]'::jsonb)) as source_row(
      "id" uuid,
      "recipeId" uuid,
      "recipeTitleSnapshot" text,
      "selectedServings" numeric(8, 2)
    )
    left join public.recipes recipe_row
      on recipe_row.id = source_row."recipeId"
     and recipe_row.user_id = v_user_id
     and recipe_row.deleted_at is null
    where recipe_row.id is null
  ) then
    raise exception using errcode = '23503', message = 'recipe does not belong to user';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(coalesce(p_payload->'items', '[]'::jsonb)) as item_row(
      "id" uuid,
      "ingredientId" uuid,
      "nameSnapshot" text,
      "quantity" numeric(12, 3),
      "quantityText" text,
      "unit" text,
      "aisle" text,
      "isChecked" boolean,
      "isManual" boolean,
      "sortOrder" integer
    )
    where item_row."id" is null
      or item_row."nameSnapshot" is null
      or char_length(trim(item_row."nameSnapshot")) not between 1 and 80
      or (item_row."quantity" is not null and item_row."quantity" <= 0)
      or (item_row."quantityText" is not null and char_length(trim(item_row."quantityText")) not between 1 and 40)
      or (item_row."quantity" is not null and item_row."quantityText" is not null)
      or (item_row."unit" is not null and char_length(trim(item_row."unit")) > 20)
      or (item_row."aisle" is not null and char_length(trim(item_row."aisle")) > 40)
      or item_row."sortOrder" is null
      or item_row."sortOrder" < 0
      or item_row."isChecked" is null
      or item_row."isManual" is null
  ) then
    raise exception using errcode = '22023', message = 'invalid shopping item entry';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(coalesce(p_payload->'items', '[]'::jsonb)) as item_row(
      "id" uuid,
      "ingredientId" uuid,
      "nameSnapshot" text,
      "quantity" numeric(12, 3),
      "quantityText" text,
      "unit" text,
      "aisle" text,
      "isChecked" boolean,
      "isManual" boolean,
      "sortOrder" integer
    )
    left join public.ingredients ingredient_row
      on ingredient_row.id = item_row."ingredientId"
     and ingredient_row.user_id = v_user_id
    where item_row."ingredientId" is not null
      and ingredient_row.id is null
  ) then
    raise exception using errcode = '23503', message = 'ingredient does not belong to user';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(coalesce(p_payload->'itemSources', '[]'::jsonb)) as item_source_row(
      "id" uuid,
      "shoppingListItemId" uuid,
      "shoppingListSourceId" uuid,
      "recipeIngredientId" uuid,
      "quantityContribution" numeric(12, 3),
      "quantityTextContribution" text,
      "unitSnapshot" text
    )
    where item_source_row."id" is null
      or item_source_row."shoppingListItemId" is null
      or item_source_row."shoppingListSourceId" is null
      or (item_source_row."quantityContribution" is not null and item_source_row."quantityContribution" <= 0)
      or (
        item_source_row."quantityTextContribution" is not null
        and char_length(trim(item_source_row."quantityTextContribution")) not between 1 and 40
      )
      or (item_source_row."quantityContribution" is not null and item_source_row."quantityTextContribution" is not null)
      or (item_source_row."unitSnapshot" is not null and char_length(trim(item_source_row."unitSnapshot")) > 20)
  ) then
    raise exception using errcode = '22023', message = 'invalid shopping item source entry';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(coalesce(p_payload->'itemSources', '[]'::jsonb)) as item_source_row(
      "id" uuid,
      "shoppingListItemId" uuid,
      "shoppingListSourceId" uuid,
      "recipeIngredientId" uuid,
      "quantityContribution" numeric(12, 3),
      "quantityTextContribution" text,
      "unitSnapshot" text
    )
    join jsonb_to_recordset(coalesce(p_payload->'sources', '[]'::jsonb)) as source_row(
      "id" uuid,
      "recipeId" uuid,
      "recipeTitleSnapshot" text,
      "selectedServings" numeric(8, 2)
    )
      on source_row."id" = item_source_row."shoppingListSourceId"
    left join public.recipe_ingredients recipe_ingredient_row
      on recipe_ingredient_row.id = item_source_row."recipeIngredientId"
     and recipe_ingredient_row.user_id = v_user_id
     and recipe_ingredient_row.recipe_id = source_row."recipeId"
    where item_source_row."recipeIngredientId" is not null
      and recipe_ingredient_row.id is null
  ) then
    raise exception using errcode = '23503', message = 'recipe ingredient does not belong to source recipe';
  end if;

  select shopping_list_row.id
  into v_existing_active_list_id
  from public.shopping_lists shopping_list_row
  where shopping_list_row.user_id = v_user_id
    and shopping_list_row.is_active
  for update;

  if v_existing_active_list_id is not null then
    update public.shopping_lists
    set is_active = false
    where user_id = v_user_id
      and id = v_existing_active_list_id;
  end if;

  insert into public.shopping_lists (id, user_id, name, is_active)
  values (v_list_id, v_user_id, v_name, true);

  insert into public.shopping_list_sources (
    id,
    user_id,
    shopping_list_id,
    recipe_id,
    recipe_title_snapshot,
    selected_servings
  )
  select
    source_row."id",
    v_user_id,
    v_list_id,
    source_row."recipeId",
    trim(source_row."recipeTitleSnapshot"),
    source_row."selectedServings"
  from jsonb_to_recordset(coalesce(p_payload->'sources', '[]'::jsonb)) as source_row(
    "id" uuid,
    "recipeId" uuid,
    "recipeTitleSnapshot" text,
    "selectedServings" numeric(8, 2)
  );

  insert into public.shopping_list_items (
    id,
    user_id,
    shopping_list_id,
    ingredient_id,
    name_snapshot,
    quantity,
    quantity_text,
    unit,
    aisle,
    is_checked,
    is_manual,
    sort_order
  )
  select
    item_row."id",
    v_user_id,
    v_list_id,
    item_row."ingredientId",
    trim(item_row."nameSnapshot"),
    item_row."quantity",
    nullif(trim(item_row."quantityText"), ''),
    nullif(trim(item_row."unit"), ''),
    nullif(trim(item_row."aisle"), ''),
    item_row."isChecked",
    item_row."isManual",
    item_row."sortOrder"
  from jsonb_to_recordset(coalesce(p_payload->'items', '[]'::jsonb)) as item_row(
    "id" uuid,
    "ingredientId" uuid,
    "nameSnapshot" text,
    "quantity" numeric(12, 3),
    "quantityText" text,
    "unit" text,
    "aisle" text,
    "isChecked" boolean,
    "isManual" boolean,
    "sortOrder" integer
  );

  insert into public.shopping_list_item_sources (
    id,
    user_id,
    shopping_list_id,
    shopping_list_item_id,
    shopping_list_source_id,
    recipe_ingredient_id,
    quantity_contribution,
    quantity_text_contribution,
    unit_snapshot
  )
  select
    item_source_row."id",
    v_user_id,
    v_list_id,
    item_source_row."shoppingListItemId",
    item_source_row."shoppingListSourceId",
    item_source_row."recipeIngredientId",
    item_source_row."quantityContribution",
    nullif(trim(item_source_row."quantityTextContribution"), ''),
    nullif(trim(item_source_row."unitSnapshot"), '')
  from jsonb_to_recordset(coalesce(p_payload->'itemSources', '[]'::jsonb)) as item_source_row(
    "id" uuid,
    "shoppingListItemId" uuid,
    "shoppingListSourceId" uuid,
    "recipeIngredientId" uuid,
    "quantityContribution" numeric(12, 3),
    "quantityTextContribution" text,
    "unitSnapshot" text
  );

  return v_list_id;
end;
$$;

create or replace function public.reorder_shopping_items(
  p_shopping_list_id uuid,
  p_item_ids uuid[]
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_item_count integer;
  v_array_count integer;
  v_distinct_count integer;
begin
  if v_user_id is null then
    raise exception using errcode = '28000', message = 'authentication required';
  end if;

  if p_shopping_list_id is null then
    raise exception using errcode = '22023', message = 'shopping list is required';
  end if;

  perform 1
  from public.shopping_lists shopping_list_row
  where shopping_list_row.id = p_shopping_list_id
    and shopping_list_row.user_id = v_user_id
    and shopping_list_row.is_active
  for update;

  if not found then
    raise exception using errcode = '23503', message = 'active shopping list not found';
  end if;

  perform 1
  from public.shopping_list_items item_row
  where item_row.shopping_list_id = p_shopping_list_id
    and item_row.user_id = v_user_id
  order by item_row.sort_order, item_row.id
  for update;

  select count(*)
  into v_item_count
  from public.shopping_list_items item_row
  where item_row.shopping_list_id = p_shopping_list_id
    and item_row.user_id = v_user_id;

  select count(*), count(distinct item_id)
  into v_array_count, v_distinct_count
  from unnest(coalesce(p_item_ids, '{}'::uuid[])) as provided(item_id);

  if v_item_count <> v_array_count or v_item_count <> v_distinct_count then
    raise exception using errcode = '22023', message = 'item order must contain each item exactly once';
  end if;

  if exists (
    select 1
    from unnest(coalesce(p_item_ids, '{}'::uuid[])) as provided(item_id)
    left join public.shopping_list_items item_row
      on item_row.id = provided.item_id
     and item_row.shopping_list_id = p_shopping_list_id
     and item_row.user_id = v_user_id
    where item_row.id is null
  ) then
    raise exception using errcode = '23503', message = 'item does not belong to shopping list';
  end if;

  update public.shopping_list_items item_row
  set sort_order = ordered.ordinality - 1
  from (
    select item_id, ordinality::integer
    from unnest(p_item_ids) with ordinality as provided(item_id, ordinality)
  ) as ordered
  where item_row.id = ordered.item_id
    and item_row.shopping_list_id = p_shopping_list_id
    and item_row.user_id = v_user_id;
end;
$$;

alter table public.shopping_lists enable row level security;
alter table public.shopping_lists force row level security;
alter table public.shopping_list_sources enable row level security;
alter table public.shopping_list_sources force row level security;
alter table public.shopping_list_items enable row level security;
alter table public.shopping_list_items force row level security;
alter table public.shopping_list_item_sources enable row level security;
alter table public.shopping_list_item_sources force row level security;

create policy shopping_lists_select on public.shopping_lists for select to authenticated
using ((select auth.uid()) = user_id);
create policy shopping_lists_insert on public.shopping_lists for insert to authenticated
with check ((select auth.uid()) = user_id);
create policy shopping_lists_update on public.shopping_lists for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
create policy shopping_lists_delete on public.shopping_lists for delete to authenticated
using ((select auth.uid()) = user_id);

create policy shopping_list_sources_select on public.shopping_list_sources for select to authenticated
using ((select auth.uid()) = user_id);
create policy shopping_list_sources_insert on public.shopping_list_sources for insert to authenticated
with check ((select auth.uid()) = user_id);
create policy shopping_list_sources_update on public.shopping_list_sources for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
create policy shopping_list_sources_delete on public.shopping_list_sources for delete to authenticated
using ((select auth.uid()) = user_id);

create policy shopping_list_items_select on public.shopping_list_items for select to authenticated
using ((select auth.uid()) = user_id);
create policy shopping_list_items_insert on public.shopping_list_items for insert to authenticated
with check ((select auth.uid()) = user_id);
create policy shopping_list_items_update on public.shopping_list_items for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
create policy shopping_list_items_delete on public.shopping_list_items for delete to authenticated
using ((select auth.uid()) = user_id);

create policy shopping_list_item_sources_select on public.shopping_list_item_sources for select to authenticated
using ((select auth.uid()) = user_id);
create policy shopping_list_item_sources_insert on public.shopping_list_item_sources for insert to authenticated
with check ((select auth.uid()) = user_id);
create policy shopping_list_item_sources_update on public.shopping_list_item_sources for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
create policy shopping_list_item_sources_delete on public.shopping_list_item_sources for delete to authenticated
using ((select auth.uid()) = user_id);

revoke all on table public.shopping_lists from anon, authenticated;
revoke all on table public.shopping_list_sources from anon, authenticated;
revoke all on table public.shopping_list_items from anon, authenticated;
revoke all on table public.shopping_list_item_sources from anon, authenticated;
grant select, insert, update, delete on table public.shopping_lists to authenticated;
grant select, insert, update, delete on table public.shopping_list_sources to authenticated;
grant select, insert, update, delete on table public.shopping_list_items to authenticated;
grant select, insert, update, delete on table public.shopping_list_item_sources to authenticated;

revoke all on function public.replace_active_shopping_list(jsonb) from public, anon;
revoke all on function public.reorder_shopping_items(uuid, uuid[]) from public, anon;
grant execute on function public.replace_active_shopping_list(jsonb) to authenticated;
grant execute on function public.reorder_shopping_items(uuid, uuid[]) to authenticated;
