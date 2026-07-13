with ranked_sessions as (
  select
    sessions.id,
    row_number() over (
      partition by sessions.study_plan_id, sessions.mode
      order by
        (sessions.status = 'completed') desc,
        coalesce(item_counts.completed_count, 0) desc,
        sessions.started_at desc,
        sessions.created_at desc,
        sessions.id desc
    ) as duplicate_rank
  from public.study_sessions as sessions
  left join (
    select
      study_session_id,
      count(*) filter (where status = 'completed') as completed_count
    from public.study_session_items
    group by study_session_id
  ) as item_counts on item_counts.study_session_id = sessions.id
  where sessions.study_plan_id is not null
)
delete from public.study_sessions as sessions
using ranked_sessions
where sessions.id = ranked_sessions.id
  and ranked_sessions.duplicate_rank > 1;

create unique index if not exists study_sessions_plan_mode_uidx
  on public.study_sessions (study_plan_id, mode)
  where study_plan_id is not null;
