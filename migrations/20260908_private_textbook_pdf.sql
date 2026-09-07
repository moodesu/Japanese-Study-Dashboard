-- Private textbook PDF storage. The copyrighted PDF is uploaded directly to
-- Supabase Storage and is never committed to the public application repository.
begin;

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('textbook-pdfs','textbook-pdfs',false,262144000,array['application/pdf'])
on conflict (id) do update set
  public=false,
  file_size_limit=excluded.file_size_limit,
  allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists "textbook_pdf_select_owner" on storage.objects;

create policy "textbook_pdf_select_owner"
on storage.objects for select to authenticated
using (bucket_id='textbook-pdfs' and private.is_app_owner());

commit;
