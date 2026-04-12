-- App admins (e.g. dashboard). Promote via SQL: update public.users set is_admin = true where id = '...';

alter table public.users add column if not exists is_admin boolean not null default false;

comment on column public.users.is_admin is 'When true, user may access /admin routes.';
