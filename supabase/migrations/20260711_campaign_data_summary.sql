begin;

create or replace function public.get_campaign_data_summary(p_campaign_id text)
returns table (
  scans_count bigint,
  leads_count bigint,
  actions_count bigint,
  games_count bigint,
  wins_count bigint,
  redeemed_count bigint,
  estimated_spend numeric,
  daily_stats jsonb,
  action_volumes jsonb
)
language sql
security definer
set search_path = public
as $$
  with
    lead_stats as (
      select
        count(*) as leads_count,
        count(*) filter (where l.prize_id is not null) as wins_count,
        count(*) filter (where l.status = 'redeemed') as redeemed_count,
        coalesce(sum(coalesce(p.estimated_unit_cost, 0)) filter (where l.prize_id is not null), 0) as estimated_spend
      from public.leads l
      left join public.prizes p on p.id = l.prize_id
      where l.campaign_id = p_campaign_id
    ),
    event_stats as (
      select
        count(*) filter (where e.event_type = 'scan') as scans_count,
        count(*) filter (where e.event_type = 'review_clicked') as actions_count,
        count(*) filter (where e.event_type = 'game_played') as games_count
      from public.campaign_events e
      where e.campaign_id = p_campaign_id
    ),
    daily_participations as (
      select date_trunc('day', l.created_at)::date as day, count(*) as value
      from public.leads l
      where l.campaign_id = p_campaign_id
        and l.created_at >= timezone('utc', now()) - interval '6 days'
      group by 1
    ),
    daily_redeemed as (
      select date_trunc('day', e.created_at)::date as day, count(*) as value
      from public.campaign_events e
      where e.campaign_id = p_campaign_id
        and e.event_type = 'prize_redeemed'
        and e.created_at >= timezone('utc', now()) - interval '6 days'
      group by 1
    ),
    daily as (
      select coalesce(
        jsonb_agg(
          jsonb_build_object(
            'label', to_char(days.day, 'YYYY-MM-DD'),
            'participations', coalesce(dp.value, 0),
            'redeemed', coalesce(dr.value, 0)
          ) order by days.day
        ),
        '[]'::jsonb
      ) as value
      from generate_series(
        timezone('utc', now())::date - 6,
        timezone('utc', now())::date,
        interval '1 day'
      ) as days(day)
      left join daily_participations dp on dp.day = days.day::date
      left join daily_redeemed dr on dr.day = days.day::date
    ),
    ordered_leads as (
      select row_number() over (
        partition by lower(l.email)
        order by l.created_at asc, l.id asc
      ) - 1 as action_index
      from public.leads l
      where l.campaign_id = p_campaign_id
    ),
    action_count as (
      select count(*)::integer as value
      from public.campaign_actions
      where campaign_id = p_campaign_id
    ),
    action_volume_rows as (
      select ol.action_index, count(*) as value
      from ordered_leads ol
      cross join action_count ac
      where ol.action_index < ac.value
      group by ol.action_index
    ),
    action_volume_json as (
      select coalesce(
        jsonb_agg(
          jsonb_build_object('actionIndex', action_index, 'value', value)
          order by action_index
        ),
        '[]'::jsonb
      ) as value
      from action_volume_rows
    )
  select
    coalesce(es.scans_count, 0),
    coalesce(ls.leads_count, 0),
    coalesce(es.actions_count, 0),
    coalesce(es.games_count, 0),
    coalesce(ls.wins_count, 0),
    coalesce(ls.redeemed_count, 0),
    coalesce(ls.estimated_spend, 0),
    daily.value,
    action_volume_json.value
  from lead_stats ls
  cross join event_stats es
  cross join daily
  cross join action_volume_json;
$$;

revoke all on function public.get_campaign_data_summary(text) from public, anon, authenticated;
grant execute on function public.get_campaign_data_summary(text) to service_role;

commit;
