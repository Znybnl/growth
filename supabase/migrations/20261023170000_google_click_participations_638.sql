begin;

create table public.google_click_warning_acceptances (
  id uuid primary key,
  merchant_id text not null references public.merchants(id) on delete cascade,
  actor_user_id text not null,
  accepted_at timestamptz not null default now(),
  warning_version text not null,
  warning_text text not null,
  campaign_id text
);
alter table public.google_click_warning_acceptances enable row level security;
revoke all on public.google_click_warning_acceptances from public, anon, authenticated;
grant select, insert, update on public.google_click_warning_acceptances to service_role;
create index on public.google_click_warning_acceptances(merchant_id, accepted_at);

create function public.validate_google_click_acceptance_638()
returns trigger language plpgsql security definer set search_path=public as $$
declare v_acceptance public.google_click_warning_acceptances%rowtype;
begin
  if coalesce((new.campaign_local_settings->>'googleClickRequired')::boolean,false) then
    select * into v_acceptance from public.google_click_warning_acceptances
      where id::text=new.campaign_local_settings->>'googleClickAcceptanceId'
      and merchant_id=new.merchant_id and warning_version='2026-10-23-v1' for update;
    if not found or (v_acceptance.campaign_id is not null and v_acceptance.campaign_id<>new.id) then
      raise exception 'Acceptez l’avertissement Google avant d’activer cette option';
    end if;
    if tg_op='UPDATE' and not coalesce((old.campaign_local_settings->>'googleClickRequired')::boolean,false)
      and old.campaign_local_settings->>'googleClickAcceptanceId'=new.campaign_local_settings->>'googleClickAcceptanceId' then
      raise exception 'Confirmez à nouveau l’avertissement pour réactiver cette option';
    end if;
    update public.google_click_warning_acceptances set campaign_id=new.id where id=v_acceptance.id;
  end if;
  return new;
end; $$;
create trigger campaigns_google_click_acceptance_638 before insert or update of campaign_local_settings,merchant_id
  on public.campaigns for each row execute function public.validate_google_click_acceptance_638();
revoke all on function public.validate_google_click_acceptance_638() from public,anon,authenticated;

alter table public.draw_sessions add column marketing_click_context jsonb;
create unique index draw_sessions_marketing_click_638_idx
  on public.draw_sessions((marketing_click_context->>'marketingClickEventId'))
  where marketing_click_context->>'marketingClickEventId' is not null;

create function public.create_draw_session_with_marketing(
  p_campaign_id text, p_session_id text, p_click_event_id text default null, p_proposed_action_id text default null
) returns table(session_id text,campaign_id text,prize_id text,status text,created_at timestamptz,expires_at timestamptz)
language plpgsql security definer set search_path=public as $$
declare v_click public.campaign_events%rowtype; v_context jsonb; v_action public.campaign_actions%rowtype;
begin
  if p_proposed_action_id is not null then
    select * into v_action from public.campaign_actions a where a.id=p_proposed_action_id and a.campaign_id=p_campaign_id;
    if not found then raise exception 'Action indisponible'; end if;
  end if;
  v_context:=jsonb_build_object('marketingActionClicked',false);
  if p_click_event_id is not null then
    select * into v_click from public.campaign_events e where e.id=p_click_event_id and e.campaign_id=p_campaign_id
      and e.event_type in ('review_clicked','social_clicked') and e.created_at>now()-interval '30 minutes';
    if not found or v_click.metadata->>'actionId' is distinct from p_proposed_action_id
      or v_click.metadata->>'actionKind' is distinct from v_action.kind then raise exception 'Clic indisponible ou expiré'; end if;
    v_context:=jsonb_build_object('marketingActionClicked',true,'marketingActionKind',v_action.kind,
      'marketingActionId',v_action.id,'marketingClickEventId',v_click.id,'marketingClickedAt',v_click.created_at);
  end if;
  if v_action.kind='google' and not (v_context->>'marketingActionClicked')::boolean
    and exists(select 1 from public.campaigns c where c.id=p_campaign_id
      and coalesce((c.campaign_local_settings->>'googleClickRequired')::boolean,false)) then
    raise exception 'Cliquez sur Écrire un avis avant de jouer';
  end if;
  -- Preserve the existing draw/stock transaction and its result unchanged.
  return query select * from public.create_draw_session(p_campaign_id,p_session_id);
  update public.draw_sessions ds set marketing_click_context=v_context where ds.id=p_session_id and ds.campaign_id=p_campaign_id;
  -- Wheel participation is recorded inside create_draw_session, before this snapshot exists.
  update public.campaign_events e set metadata=e.metadata||v_context where e.campaign_id=p_campaign_id
    and e.event_type='game_played' and e.metadata->>'sessionId'=p_session_id;
end; $$;
revoke all on function public.create_draw_session_with_marketing(text,text,text,text) from public,anon,authenticated;
grant execute on function public.create_draw_session_with_marketing(text,text,text,text) to service_role;

create function public.snapshot_participation_marketing_638()
returns trigger language plpgsql security definer set search_path=public as $$
declare v_context jsonb;
begin
  if new.event_type in ('game_played','lead_created') then
    select s.marketing_click_context into v_context from public.draw_sessions s
      where s.id=new.metadata->>'sessionId' and s.campaign_id=new.campaign_id;
    if v_context is not null then new.metadata:=new.metadata||v_context; end if;
  end if;
  return new;
end; $$;
create trigger campaign_events_marketing_snapshot_638 before insert on public.campaign_events
  for each row execute function public.snapshot_participation_marketing_638();
revoke all on function public.snapshot_participation_marketing_638() from public,anon,authenticated;

-- Uses the canonical participation identity, including losses without contact details.
-- NULL means historical/unknown, false means a new participation without a recorded click.
create index campaign_events_marketing_participation_638_idx on public.campaign_events(
  campaign_id, (case when nullif(metadata->>'sessionId','') is not null then 'session:'||(metadata->>'sessionId') else 'lead:'||lead_id end), created_at, id
) where event_type in ('game_played','lead_created') and metadata ? 'marketingActionClicked';

create view public.campaign_participation_marketing with(security_invoker=true) as
select p.*, (e.metadata->>'marketingActionClicked')::boolean as marketing_action_clicked,
  e.metadata->>'marketingActionKind' as marketing_action_kind,
  e.metadata->>'marketingActionId' as marketing_action_id,
  (e.metadata->>'marketingClickedAt')::timestamptz as marketing_clicked_at
from public.campaign_participations p left join lateral (
  select ev.metadata from public.campaign_events ev where ev.campaign_id=p.campaign_id
    and ev.event_type in ('game_played','lead_created') and ev.metadata ? 'marketingActionClicked'
    and p.participation_id=case when nullif(ev.metadata->>'sessionId','') is not null
      then 'session:'||(ev.metadata->>'sessionId') else 'lead:'||ev.lead_id end
  order by ev.created_at,ev.id limit 1
) e on true;
revoke all on public.campaign_participation_marketing from public,anon,authenticated;
grant select on public.campaign_participation_marketing to service_role;

commit;
