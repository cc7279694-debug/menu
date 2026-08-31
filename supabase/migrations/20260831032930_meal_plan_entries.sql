create table public.meal_plan_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  recipe_id uuid not null,
  meal_slot text not null,
  planned_at timestamptz not null,
  target_servings numeric(6,2) not null,
  status text not null default 'planned',
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint meal_plan_entries_user_id_id_unique unique (user_id, id),
  constraint meal_plan_entries_user_fk
    foreign key (user_id) references auth.users(id) on delete cascade,
  constraint meal_plan_entries_recipe_owner_fk
    foreign key (user_id, recipe_id) references public.recipes(user_id, id) on delete cascade,
  constraint meal_plan_entries_meal_slot_check
    check (meal_slot in ('breakfast', 'lunch', 'dinner')),
  constraint meal_plan_entries_status_check
    check (status in ('planned', 'completed', 'skipped')),
  constraint meal_plan_entries_target_servings_check
    check (target_servings >= 0.25 and target_servings <= 1000),
  constraint meal_plan_entries_note_length
    check (note is null or char_length(note) <= 500)
);

create index meal_plan_entries_user_planned_idx
  on public.meal_plan_entries (user_id, planned_at);

create index meal_plan_entries_user_recipe_idx
  on public.meal_plan_entries (user_id, recipe_id);

create trigger meal_plan_entries_set_updated_at
before update on public.meal_plan_entries
for each row execute function public.set_updated_at();

alter table public.meal_plan_entries enable row level security;
alter table public.meal_plan_entries force row level security;

revoke all on table public.meal_plan_entries from public, anon, authenticated;
grant select, insert, update, delete on table public.meal_plan_entries to authenticated;

create policy "meal_plan_entries_select_own"
on public.meal_plan_entries for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "meal_plan_entries_insert_own"
on public.meal_plan_entries for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "meal_plan_entries_update_own"
on public.meal_plan_entries for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "meal_plan_entries_delete_own"
on public.meal_plan_entries for delete
to authenticated
using ((select auth.uid()) = user_id);
