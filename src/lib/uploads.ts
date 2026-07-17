import { supabase } from './supabase'

export const DOCS_BUCKET = 'project-docs'
const MAX_BYTES = 25 * 1024 * 1024   // 25MB — architect summaries run large

/**
 * Upload a project document to Supabase Storage and return its public URL.
 *
 * Every upload gets a UNIQUE path (`<projectId>/<timestamp>-<slug>.pdf`) rather
 * than a stable one like `<projectId>/summary.pdf`. That is deliberate: public
 * objects are served through a CDN that caches them for an hour by default, so
 * overwriting a path keeps serving the OLD file to everyone until the cache
 * expires — Daniel would replace a PDF, reload, and still see the previous
 * version with nothing to indicate why. A new path is a new URL, so a replace is
 * visible immediately.
 *
 * The trade-off is that replaced files are orphaned in the bucket. `removeDoc`
 * deletes the outgoing one so a replace does not accumulate.
 */
export async function uploadProjectDoc(projectId: string, file: File): Promise<string> {
  if (file.type !== 'application/pdf') {
    throw new Error('That file is not a PDF. Save or export it as a PDF and try again.')
  }
  if (file.size > MAX_BYTES) {
    throw new Error(`That PDF is ${(file.size / 1024 / 1024).toFixed(1)}MB — the limit is 25MB.`)
  }

  const slug = file.name
    .replace(/\.pdf$/i, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .toLowerCase() || 'summary'
  const path = `${projectId}/${Date.now()}-${slug}.pdf`

  const { error } = await supabase.storage.from(DOCS_BUCKET).upload(path, file, {
    contentType: 'application/pdf',
    cacheControl: '3600',
  })
  if (error) throw new Error(`Upload failed — ${error.message}`)

  return supabase.storage.from(DOCS_BUCKET).getPublicUrl(path).data.publicUrl
}

/**
 * Delete a previously uploaded doc, given the public URL we stored.
 *
 * Best-effort: a pasted external link is not ours to delete, and a failure here
 * must never block the user from clearing the field. Note the file stays
 * readable at its URL until the CDN cache expires (up to an hour) — the object
 * is gone, the cached copy is not, and the anon key cannot purge the CDN.
 */
export async function removeProjectDoc(url: string): Promise<void> {
  const marker = `/storage/v1/object/public/${DOCS_BUCKET}/`
  const i = url.indexOf(marker)
  if (i === -1) return   // not one of ours (pasted link) — nothing to delete
  const path = url.slice(i + marker.length).split('?')[0]
  if (!path) return
  try {
    await supabase.storage.from(DOCS_BUCKET).remove([decodeURIComponent(path)])
  } catch {
    // Swallow: the field is being cleared either way.
  }
}

/** True if this URL is a file we uploaded (vs a link someone pasted). */
export function isUploadedDoc(url?: string): boolean {
  return !!url && url.includes(`/storage/v1/object/public/${DOCS_BUCKET}/`)
}

/** The original filename, recovered from an uploaded URL for display. */
export function docFileName(url: string): string {
  const last = decodeURIComponent(url.split('?')[0].split('/').pop() ?? '')
  return last.replace(/^\d{10,}-/, '') || 'document.pdf'
}
