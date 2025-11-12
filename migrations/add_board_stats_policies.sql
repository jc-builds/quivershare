alter table board_stats enable row level security;

drop policy if exists "Board stats insert owner" on board_stats;
create policy "Board stats insert owner"
  on board_stats
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from surfboards
      where surfboards.id = board_stats.surfboard_id
        and surfboards.user_id = auth.uid()
    )
  );

drop policy if exists "Board stats update owner" on board_stats;
create policy "Board stats update owner"
  on board_stats
  for update
  to authenticated
  using (
    exists (
      select 1
      from surfboards
      where surfboards.id = board_stats.surfboard_id
        and surfboards.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from surfboards
      where surfboards.id = board_stats.surfboard_id
        and surfboards.user_id = auth.uid()
    )
  );

