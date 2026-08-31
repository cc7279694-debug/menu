create table public.cooking_records (
  id uuid primary key,
  user_id uuid not null,
  recipe_id uuid,
  recipe_title_snapshot text not null,
  meal_plan_entry_id uuid,
  started_at timestamptz not null,
  completed_at timestamptz not null default now(),
  actual_servings numeric(6, 2) not null,
  rating smallint,
  improvement_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint cooking_records_user_id_id_unique unique (user_id, id),
  constraint cooking_records_user_fk
    foreign key (user_id) references auth.users(id) on delete cascade,
  constraint cooking_records_recipe_owner_fk
    foreign key (user_id, recipe_id) references public.recipes(user_id, id)
    on delete set null (recipe_id),
  constraint cooking_records_meal_plan_owner_fk
    foreign key (user_id, meal_plan_entry_id) references public.meal_plan_entries(user_id, id)
    on delete set null (meal_plan_entry_id),
  constraint cooking_records_title_length
    check (char_length(trim(recipe_title_snapshot)) between 1 and 120),
  constraint cooking_records_servings_range
    check (actual_servings between 0.25 and 1000),
  constraint cooking_records_rating_range
    check (rating is null or rating between 1 and 5),
  constraint cooking_records_notes_length
    check (improvement_notes is null or char_length(trim(improvement_notes)) between 1 and 2000),
  constraint cooking_records_time_order
    check (completed_at >= started_at)
);

create table public.cooking_record_photos (
  id uuid primary key,
  user_id uuid not null,
  cooking_record_id uuid not null,
  storage_path text not null,
  sort_order smallint not null,
  created_at timestamptz not null default now(),
  constraint cooking_record_photos_user_fk
    foreign key (user_id) references auth.users(id) on delete cascade,
  constraint cooking_record_photos_record_owner_fk
    foreign key (user_id, cooking_record_id) references public.cooking_records(user_id, id)
    on delete cascade,
  constraint cooking_record_photos_path_length
    check (char_length(storage_path) between 1 and 500),
  constraint cooking_record_photos_sort_range
    check (sort_order between 0 and 2),
  constraint cooking_record_photos_record_sort_unique
    unique (cooking_record_id, sort_order)
);

create index cooking_records_user_recipe_completed_idx
  on public.cooking_records (user_id, recipe_id, completed_at desc);

create index cooking_records_user_meal_plan_idx
  on public.cooking_records (user_id, meal_plan_entry_id);

create index cooking_record_photos_user_record_idx
  on public.cooking_record_photos (user_id, cooking_record_id);

create trigger cooking_records_set_updated_at
before update on public.cooking_records
for each row execute function public.set_updated_at();

alter table public.cooking_records enable row level security;
alter table public.cooking_records force row level security;
alter table public.cooking_record_photos enable row level security;
alter table public.cooking_record_photos force row level security;

revoke all on table public.cooking_records, public.cooking_record_photos from public, anon, authenticated;
grant select, insert, update, delete on table public.cooking_records, public.cooking_record_photos to authenticated;

create policy "cooking_records_select_own"
on public.cooking_records for select
to authenticated using ((select auth.uid()) = user_id);

create policy "cooking_records_insert_own"
on public.cooking_records for insert
to authenticated with check ((select auth.uid()) = user_id);

create policy "cooking_records_update_own"
on public.cooking_records for update
to authenticated using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "cooking_records_delete_own"
on public.cooking_records for delete
to authenticated using ((select auth.uid()) = user_id);

create policy "cooking_record_photos_select_own"
on public.cooking_record_photos for select
to authenticated using ((select auth.uid()) = user_id);

create policy "cooking_record_photos_insert_own"
on public.cooking_record_photos for insert
to authenticated with check ((select auth.uid()) = user_id);

create policy "cooking_record_photos_update_own"
on public.cooking_record_photos for update
to authenticated using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "cooking_record_photos_delete_own"
on public.cooking_record_photos for delete
to authenticated using ((select auth.uid()) = user_id);

create or replace function public.complete_cooking_record(p_payload jsonb)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_record_id uuid := (p_payload->>'id')::uuid;
  v_recipe_id uuid := nullif(p_payload->>'recipeId', '')::uuid;
  v_meal_plan_entry_id uuid := nullif(p_payload->>'mealPlanEntryId', '')::uuid;
  v_recipe_title_snapshot text;
  v_started_at timestamptz := nullif(p_payload->>'startedAt', '')::timestamptz;
  v_completed_at timestamptz := coalesce(nullif(p_payload->>'completedAt', '')::timestamptz, now());
  v_actual_servings numeric := (p_payload->>'actualServings')::numeric;
  v_rating smallint := nullif(p_payload->>'rating', '')::smallint;
  v_improvement_notes text := nullif(trim(p_payload->>'improvementNotes'), '');
  v_meal_recipe_id uuid;
  v_photo jsonb;
  v_storage_path text;
begin
  if v_user_id is null then
    raise exception using errcode = '28000', message = 'authentication required';
  end if;

  if v_record_id is null or v_recipe_id is null or v_started_at is null
    or v_actual_servings is null then
    raise exception using errcode = '22023', message = 'invalid cooking record payload';
  end if;

  select title into v_recipe_title_snapshot
  from public.recipes
  where id = v_recipe_id and user_id = v_user_id and deleted_at is null;
  if not found then
    raise exception using errcode = '23503', message = 'recipe does not belong to user';
  end if;

  if v_meal_plan_entry_id is not null then
    select recipe_id into v_meal_recipe_id
    from public.meal_plan_entries
    where id = v_meal_plan_entry_id and user_id = v_user_id;
    if not found or v_meal_recipe_id <> v_recipe_id then
      raise exception using errcode = '23503', message = 'meal plan entry does not belong to recipe';
    end if;
  end if;

  if jsonb_array_length(coalesce(p_payload->'photos', '[]'::jsonb)) > 3 then
    raise exception using errcode = '22023', message = 'at most three cooking photos are allowed';
  end if;

  insert into public.cooking_records (
    id, user_id, recipe_id, recipe_title_snapshot, meal_plan_entry_id,
    started_at, completed_at, actual_servings, rating, improvement_notes
  ) values (
    v_record_id, v_user_id, v_recipe_id, v_recipe_title_snapshot, v_meal_plan_entry_id,
    v_started_at, v_completed_at, v_actual_servings, v_rating, v_improvement_notes
  );

  for v_photo in select value from jsonb_array_elements(coalesce(p_payload->'photos', '[]'::jsonb)) loop
    v_storage_path := trim(v_photo->>'storagePath');
    if v_storage_path is null or v_storage_path not like
      v_user_id::text || '/cooking-records/' || v_record_id::text || '/%' then
      raise exception using errcode = '22023', message = 'invalid cooking photo path';
    end if;

    insert into public.cooking_record_photos (
      id, user_id, cooking_record_id, storage_path, sort_order
    ) values (
      (v_photo->>'id')::uuid, v_user_id, v_record_id, v_storage_path,
      (v_photo->>'sortOrder')::smallint
    );
  end loop;

  if v_meal_plan_entry_id is not null then
    update public.meal_plan_entries
    set status = 'completed'
    where id = v_meal_plan_entry_id and user_id = v_user_id;
  end if;

  return v_record_id;
end;
$$;

create or replace function public.get_recipe_cooking_history_stats(p_recipe_id uuid)
returns table (
  total_count bigint,
  rated_count bigint,
  average_rating numeric,
  latest_improvement_notes text
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    count(*)::bigint,
    count(rating)::bigint,
    avg(rating)::numeric,
    (
      select cr.improvement_notes
      from public.cooking_records cr
      where cr.user_id = (select auth.uid())
        and cr.recipe_id = p_recipe_id
        and cr.improvement_notes is not null
      order by cr.completed_at desc
      limit 1
    )
  from public.cooking_records r
  where r.user_id = (select auth.uid())
    and r.recipe_id = p_recipe_id;
$$;

revoke all on function public.complete_cooking_record(jsonb) from public, anon;
grant execute on function public.complete_cooking_record(jsonb) to authenticated;
revoke all on function public.get_recipe_cooking_history_stats(uuid) from public, anon;
grant execute on function public.get_recipe_cooking_history_stats(uuid) to authenticated;
