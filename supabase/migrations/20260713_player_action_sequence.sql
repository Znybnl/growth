begin;

-- The browser holds only this opaque token. The e-mail used to determine the
-- next action remains server-side and is never exposed to client JavaScript.
create table if not exists public.player_campaign_identities (
  token text primary key,
  campaign_id text not null references public.campaigns(id) on delete cascade,
  email text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (campaign_id, email)
);

create index if not exists player_campaign_identities_expires_at_idx
  on public.player_campaign_identities (expires_at);

alter table public.player_campaign_identities enable row level security;
revoke all on table public.player_campaign_identities from anon, authenticated;

do $$
begin
  if not exists (
    select 1 from pg_policies
     where schemaname = 'public'
       and tablename = 'player_campaign_identities'
       and policyname = 'service role manages player campaign identities'
  ) then
    create policy "service role manages player campaign identities"
      on public.player_campaign_identities for all to service_role
      using (true) with check (true);
  end if;
end;
$$;

commit;
