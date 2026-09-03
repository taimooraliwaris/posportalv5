create extension if not exists pgcrypto with schema extensions;

insert into public.app_security (id, passcode)
values ('default', '1234')
on conflict (id) do nothing;

alter table public.app_security add column if not exists passcode_hash text;

update public.app_security
set passcode_hash = extensions.crypt(coalesce(nullif(passcode, ''), '1234'), extensions.gen_salt('bf'))
where passcode_hash is null;

alter table public.app_security alter column passcode drop not null;
alter table public.app_security alter column passcode drop default;
update public.app_security set passcode = null;

drop policy if exists "app security staff read" on public.app_security;
drop policy if exists "app security manager update" on public.app_security;
revoke select, insert, update, delete on public.app_security from authenticated;
revoke select, insert, update, delete on public.app_security from anon;
grant all on public.app_security to service_role;

create or replace function public.verify_backend_passcode(_code text)
returns boolean
language sql
stable
security definer
set search_path = public, extensions
as $$
  select public.is_staff(auth.uid())
     and exists (
       select 1 from public.app_security s
       where s.id = 'default'
         and s.passcode_hash is not null
         and s.passcode_hash = extensions.crypt(_code, s.passcode_hash)
     );
$$;

revoke all on function public.verify_backend_passcode(text) from public;
revoke all on function public.verify_backend_passcode(text) from anon;
grant execute on function public.verify_backend_passcode(text) to authenticated;

create or replace function public.set_backend_passcode(_code text)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if not public.is_manager(auth.uid()) then
    raise exception 'Only Managers can change the back-office passcode';
  end if;
  if _code !~ '^[0-9]{4,8}$' then
    raise exception 'Passcode must be 4 to 8 digits';
  end if;
  update public.app_security
  set passcode_hash = extensions.crypt(_code, extensions.gen_salt('bf')),
      updated_at = now()
  where id = 'default';
end;
$$;

revoke all on function public.set_backend_passcode(text) from public;
revoke all on function public.set_backend_passcode(text) from anon;
grant execute on function public.set_backend_passcode(text) to authenticated;

drop table if exists public.backend_passcode;