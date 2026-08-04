insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'portfolio-assets',
  'portfolio-assets',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "owners can upload portfolio assets"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'portfolio-assets'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
    and lower(storage.extension(name)) = any (array['jpg', 'jpeg', 'png', 'webp', 'avif'])
  );

create policy "owners can read their portfolio assets"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'portfolio-assets'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

create policy "owners can update their portfolio assets"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'portfolio-assets'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  )
  with check (
    bucket_id = 'portfolio-assets'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
    and lower(storage.extension(name)) = any (array['jpg', 'jpeg', 'png', 'webp', 'avif'])
  );

create policy "owners can delete their portfolio assets"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'portfolio-assets'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );
