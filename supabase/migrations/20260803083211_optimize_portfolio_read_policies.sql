drop policy "published portfolio documents are publicly readable"
  on public.portfolio_documents;

drop policy "owners can read their portfolio documents"
  on public.portfolio_documents;

create policy "published portfolio documents are publicly readable"
  on public.portfolio_documents
  for select
  to anon
  using (published);

create policy "authenticated users can read published or owned documents"
  on public.portfolio_documents
  for select
  to authenticated
  using (
    published
    or (select auth.uid()) = owner_id
  );
