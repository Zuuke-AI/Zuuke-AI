import { createServerClient } from '@/lib/supabase'
import { getUserFromRequest } from '@/lib/auth'

/** POST /api/storage/upload-avatar
 *  Accepts multipart form-data with a field named "file".
 *  Uses the service role key (bypasses RLS) to upload to the avatars bucket.
 *  Returns { url: string } on success. */
export async function POST(request: Request) {
  const user = await getUserFromRequest(request)
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await request.formData()
  const file = formData.get('file') as File | null

  if (!file) return Response.json({ error: 'No file provided' }, { status: 400 })

  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
  if (!allowedTypes.includes(file.type)) {
    return Response.json({ error: 'Only JPEG, PNG, and WEBP images are allowed' }, { status: 400 })
  }

  if (file.size > 5 * 1024 * 1024) {
    return Response.json({ error: 'File must be under 5MB' }, { status: 400 })
  }

  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
  const path = `${user.id}/${Date.now()}.${ext}`

  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)

  // Service role client — bypasses RLS
  const supabase = createServerClient()

  const { data, error } = await supabase.storage
    .from('avatars')
    .upload(path, buffer, {
      contentType: file.type,
      upsert: true,
    })

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(data.path)

  return Response.json({ url: publicUrl })
}
