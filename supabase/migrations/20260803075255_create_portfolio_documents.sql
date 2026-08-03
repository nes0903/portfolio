create table public.portfolio_documents (
  slug text primary key,
  content jsonb not null,
  published boolean not null default false,
  owner_id uuid references auth.users (id) on delete set null,
  updated_at timestamptz not null default now(),
  constraint portfolio_documents_slug_format_check
    check (
      length(slug) between 1 and 64
      and slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
    ),
  constraint portfolio_documents_content_object_check
    check (jsonb_typeof(content) = 'object'),
  constraint portfolio_documents_content_size_check
    check (octet_length(content::text) <= 524288)
);

comment on table public.portfolio_documents is
  'Validated portfolio documents served by the Next.js application.';

comment on column public.portfolio_documents.content is
  'Whole-document JSON validated again by the application Zod schema.';

create index portfolio_documents_owner_id_idx
  on public.portfolio_documents (owner_id);

alter table public.portfolio_documents enable row level security;

revoke all on table public.portfolio_documents from anon, authenticated;
grant usage on schema public to anon, authenticated;
grant select on table public.portfolio_documents to anon, authenticated;
grant insert, update on table public.portfolio_documents to authenticated;

create policy "published portfolio documents are publicly readable"
  on public.portfolio_documents
  for select
  to anon, authenticated
  using (published);

create policy "owners can read their portfolio documents"
  on public.portfolio_documents
  for select
  to authenticated
  using ((select auth.uid()) = owner_id);

create policy "owners can insert their portfolio documents"
  on public.portfolio_documents
  for insert
  to authenticated
  with check ((select auth.uid()) = owner_id);

create policy "owners can update their portfolio documents"
  on public.portfolio_documents
  for update
  to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);
