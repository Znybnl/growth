begin;

-- Context supplemental to one prepared digest: redeemed during the digest's
-- time window (even when the win predates it), plus current inventory for
-- active games at the same merchant location.
create or replace function public.get_merchant_gain_notification_digest_context(
  p_merchant_id text,
  p_period_start timestamptz,
  p_period_end timestamptz
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  result jsonb;
begin
  if p_period_start is null or p_period_end is null or p_period_end <= p_period_start then
    raise exception 'Période de synthèse invalide';
  end if;

  select jsonb_build_object(
    'redeemedCount', coalesce((
      select count(*)::integer
      from public.leads l
      join public.campaigns c on c.id = l.campaign_id
      where c.merchant_id = p_merchant_id
        and l.status = 'redeemed'
        and l.prize_id is not null
        and l.redeemed_at >= p_period_start
        and l.redeemed_at < p_period_end
    ), 0),
    'stocks', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'campaignTitle', c.title,
          'prizeLabel', p.label,
          'totalQuantity', p.total_quantity,
          'remainingQuantity', p.remaining_quantity
        ) order by c.title, p.label, p.id
      )
      from public.campaigns c
      join public.prizes p on p.campaign_id = c.id
      where c.merchant_id = p_merchant_id
        and c.is_active = true
    ), '[]'::jsonb)
  ) into result;

  return result;
end;
$$;

revoke all on function public.get_merchant_gain_notification_digest_context(text, timestamptz, timestamptz)
  from public, anon, authenticated;
grant execute on function public.get_merchant_gain_notification_digest_context(text, timestamptz, timestamptz)
  to service_role;

commit;
