begin;

-- The production leads schema stores first_name but does not define last_name.
-- Read that optional field through the row JSON so an absent column does not
-- abort the durable outbox claim; existing installations with the field keep it.
create or replace function public.claim_merchant_gain_notification(
  p_now timestamptz default now(), p_lead text default null
) returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare
  pref record; local_now timestamp; cutoff timestamptz; zone text;
  candidate public.merchant_gain_notification_jobs;
  selected_ids text[]; start_at timestamptz; end_at timestamptz;
  all_gains jsonb; count_gains integer; pages integer; i integer; new_id uuid;
  recipient_email text; first_lead text;
begin
  update public.merchant_gain_notification_jobs set status='needs_review'
    where status in ('pending','sending') and first_attempt_at < p_now-interval '23 hours';
  update public.merchant_gain_notification_jobs j set status='cancelled',
    gains='[]'::jsonb,email_payload=null,recipient=null,lease_until=null,lease_token=null
    where j.status in ('pending','sending','needs_review') and (
      not public.can_receive_merchant_gain_notification(j.user_id,j.merchant_id)
      or not exists(select 1 from public.merchant_gain_notification_preferences p
        where p.user_id=j.user_id and p.merchant_id=j.merchant_id and p.frequency<>'disabled')
      or (j.recipient is not null and j.recipient <> (
        select email from public.merchant_users where id=j.user_id))
      or exists(select 1 from jsonb_array_elements(j.gains) g
        where not exists(select 1 from public.leads l where l.id=g->>'leadId'
          and l.status<>'lost' and l.prize_id is not null)));

  for pref in select p.* from public.merchant_gain_notification_preferences p
    where frequency<>'disabled' and public.can_receive_merchant_gain_notification(user_id,merchant_id)
      and exists(select 1 from public.merchant_gain_notification_events e
        where e.user_id=p.user_id and e.merchant_id=p.merchant_id and e.job_id is null
          and (p_lead is null or (p.frequency='instant' and e.lead_id=p_lead)))
    order by (select min(e.won_at) from public.merchant_gain_notification_events e
      where e.user_id=p.user_id and e.merchant_id=p.merchant_id and e.job_id is null),
      p.user_id,p.merchant_id for update skip locked loop
    select time_zone into zone from public.merchants where id=pref.merchant_id;
    if not exists(select 1 from pg_timezone_names where name=zone) then zone:='Europe/Paris'; end if;
    local_now:=p_now at time zone zone;
    if pref.frequency='instant' then cutoff:=p_now;
    else
      if local_now::time < time '09:00' then local_now:=local_now-interval '1 day'; end if;
      cutoff:=date_trunc(case pref.frequency when 'daily' then 'day'
        when 'weekly' then 'week' else 'month' end,local_now) at time zone zone;
    end if;
    select e.won_at,e.lead_id into start_at,first_lead from public.merchant_gain_notification_events e
      join public.leads l on l.id=e.lead_id
      where e.user_id=pref.user_id and e.merchant_id=pref.merchant_id and e.job_id is null
        and e.won_at<cutoff and l.prize_id is not null and l.status<>'lost'
        and (p_lead is null or e.lead_id=p_lead)
      order by e.won_at,e.lead_id limit 1;
    if start_at is null then continue; end if;
    if pref.frequency='instant' then end_at:=start_at+interval '1 microsecond';
    else
      start_at:=date_trunc(case pref.frequency when 'daily' then 'day'
        when 'weekly' then 'week' else 'month' end,start_at at time zone zone) at time zone zone;
      end_at:=((start_at at time zone zone)+case pref.frequency when 'daily' then interval '1 day'
        when 'weekly' then interval '1 week' else interval '1 month' end) at time zone zone;
    end if;
    select array_agg(e.lead_id order by e.won_at,e.lead_id),
      jsonb_agg(jsonb_build_object('leadId',e.lead_id,'campaignId',e.campaign_id,
        'campaignTitle',e.campaign_title,'prizeLabel',e.prize_label,'wonAt',e.won_at,
        'firstName',l.first_name,'lastName',nullif(to_jsonb(l)->>'last_name',''))
        order by e.won_at,e.lead_id)
      into selected_ids,all_gains from public.merchant_gain_notification_events e
      join public.leads l on l.id=e.lead_id
      where e.user_id=pref.user_id and e.merchant_id=pref.merchant_id and e.job_id is null
        and e.won_at>=start_at and e.won_at<end_at and l.prize_id is not null and l.status<>'lost'
        and (p_lead is null or e.lead_id=p_lead)
        and (pref.frequency<>'instant' or e.lead_id=first_lead);
    count_gains:=coalesce(array_length(selected_ids,1),0);
    if count_gains=0 then continue; end if;
    pages:=ceil(count_gains/40.0);
    for i in 1..pages loop
      insert into public.merchant_gain_notification_jobs
        (user_id,merchant_id,frequency,merchant_name,time_zone,period_start,period_end,part,parts,gains,retry_at)
      values(pref.user_id,pref.merchant_id,pref.frequency,
        (select company_name from public.merchants where id=pref.merchant_id),zone,
        start_at,end_at,i,pages,
        (select jsonb_agg(v) from jsonb_array_elements(all_gains) with ordinality a(v,n)
          where n>(i-1)*40 and n<=i*40),p_now)
      returning id into new_id;
      update public.merchant_gain_notification_events set job_id=new_id
        where user_id=pref.user_id and merchant_id=pref.merchant_id
          and lead_id=any(selected_ids[((i-1)*40+1):least(i*40,count_gains)]);
    end loop;
    exit;
  end loop;

  select j.* into candidate from public.merchant_gain_notification_jobs j
    where j.status in ('pending','sending') and j.retry_at<=p_now
      and (j.lease_until is null or j.lease_until<p_now)
      and (p_lead is null or (j.frequency='instant' and exists(
        select 1 from jsonb_array_elements(j.gains) g where g->>'leadId'=p_lead)))
    order by j.retry_at,j.created_at,j.part,j.id for update skip locked limit 1;
  if candidate.id is null then return null; end if;
  select email into recipient_email from public.merchant_users where id=candidate.user_id;
  update public.merchant_gain_notification_jobs set status='sending',
    attempts=attempts+1, first_attempt_at=coalesce(first_attempt_at,p_now),
    lease_until=p_now+interval '5 minutes', lease_token=gen_random_uuid(),
    recipient=coalesce(recipient,recipient_email)
    where id=candidate.id returning * into candidate;
  return to_jsonb(candidate);
end $$;

commit;
