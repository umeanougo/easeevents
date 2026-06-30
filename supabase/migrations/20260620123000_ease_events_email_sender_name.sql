alter table public.organizations
  add column if not exists email_sender_name text;

update public.organizations
set
  email_sender_name = coalesce(nullif(btrim(email_sender_name), ''), 'Ugo @ EaseOps'),
  email_signature = replace(
    coalesce(email_signature, 'Best,
Ugo @ EaseOps
Founder & Chief Consultant
[EaseOps](https://easeops.ca/)'),
    'Ugo Umeano',
    'Ugo @ EaseOps'
  );
