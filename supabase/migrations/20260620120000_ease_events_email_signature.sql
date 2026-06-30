alter table public.organizations
  add column if not exists email_signature text;

update public.organizations
set email_signature = 'Best,
Ugo Umeano
Founder & Chief Consultant
[EaseOps](https://easeops.ca/)'
where email_signature is null
   or btrim(email_signature) = '';
