import { createServerClient } from '@/lib/supabase'
import { getUserFromRequest } from '@/lib/auth'
import { generateBuildId, parseBuildTitle, parseBudget } from '@/lib/build-utils'

const BADGE_THRESHOLDS: { key: string; label: string; count: number }[] = [
  { key: 'first_build',     label: '🎮 First Build',          count: 1  },
  { key: 'ten_builds',      label: '🔥 10 Builds',            count: 10 },
  { key: 'twenty_five',     label: '⚡ Builder',              count: 25 },
  { key: 'fifty_builds',    label: '🏆 Master Builder',       count: 50 },
]

async function maybeAwardBadges(userId: string) {
  try {
    const supabase = createServerClient()

    // Count user's builds
    const { count } = await supabase
      .from('builds')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)

    const buildCount = count ?? 0

    // Get current badges
    const { data: profile } = await supabase
      .from('profiles')
      .select('badges')
      .eq('id', userId)
      .single()

    const current: string[] = Array.isArray(profile?.badges) ? profile.badges : []
    const earned = BADGE_THRESHOLDS
      .filter(b => buildCount >= b.count && !current.includes(b.key))
      .map(b => b.key)

    if (earned.length > 0) {
      await supabase
        .from('profiles')
        .update({ badges: [...current, ...earned] })
        .eq('id', userId)
    }
  } catch { /* non-fatal */ }
}

/** POST /api/builds — persist an AI-generated build and return its public ID */
export async function POST(request: Request) {
  try {
    const user = await getUserFromRequest(request)
    const body = await request.json()
    const { rawMarkdown, userPrompt } = body as {
      rawMarkdown?: string
      userPrompt?: string
    }

    if (!rawMarkdown || typeof rawMarkdown !== 'string') {
      return Response.json({ error: 'rawMarkdown required' }, { status: 400 })
    }

    const id = generateBuildId()
    const title = parseBuildTitle(rawMarkdown)
    const budget = parseBudget(rawMarkdown)

    const supabase = createServerClient()
    const { error } = await supabase.from('builds').insert({
      id,
      title,
      user_id: user?.id ?? null,
      budget: budget ?? null,
      use_case: userPrompt ? userPrompt.slice(0, 200) : null,
      raw_markdown: rawMarkdown,
    })

    if (error) {
      console.error('[builds] Supabase insert error:', error.message)
      return Response.json({ error: 'Failed to save build' }, { status: 500 })
    }

    // Award badges (fire-and-forget)
    if (user?.id) void maybeAwardBadges(user.id)

    return Response.json({ id, url: `/build/${id}` })
  } catch (err) {
    console.error('[builds] Unexpected error:', err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
