import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function OGImage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  let title = 'AI PC Build'
  let budget = ''
  let useCase = ''

  try {
    const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/builds?id=eq.${id}&select=title,budget,use_case&limit=1`
    const res = await fetch(url, {
      headers: {
        apikey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`,
      },
    })
    if (res.ok) {
      const [build] = await res.json()
      if (build) {
        title = build.title || title
        budget = build.budget || ''
        useCase = build.use_case || ''
      }
    }
  } catch { /* use defaults */ }

  const fontSize = title.length > 55 ? 44 : title.length > 35 ? 52 : 62

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          background: '#020305',
          display: 'flex',
          flexDirection: 'column',
          padding: '60px 80px',
          position: 'relative',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      >
        {/* Top cyan accent bar */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 5,
            background: 'linear-gradient(90deg, #00d4ff 0%, #0099cc 100%)',
            display: 'flex',
          }}
        />

        {/* Subtle grid pattern overlay */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage:
              'radial-gradient(circle at 80% 20%, rgba(0,212,255,0.06) 0%, transparent 50%), radial-gradient(circle at 20% 80%, rgba(0,153,204,0.04) 0%, transparent 50%)',
            display: 'flex',
          }}
        />

        {/* Brand row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 52, position: 'relative' }}>
          <div
            style={{
              background: '#00d4ff',
              color: '#020305',
              fontWeight: 900,
              fontSize: 15,
              padding: '5px 14px',
              letterSpacing: '0.18em',
              display: 'flex',
            }}
          >
            ZUUKE
          </div>
          <span
            style={{
              color: '#3a5060',
              fontSize: 13,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              display: 'flex',
            }}
          >
            AI-Generated PC Build
          </span>
        </div>

        {/* Title */}
        <div
          style={{
            fontSize,
            fontWeight: 800,
            color: '#ffffff',
            lineHeight: 1.13,
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            position: 'relative',
          }}
        >
          {title}
        </div>

        {/* Bottom meta row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            marginTop: 32,
            position: 'relative',
          }}
        >
          {budget && (
            <div
              style={{
                background: 'rgba(0,212,255,0.1)',
                border: '1px solid rgba(0,212,255,0.25)',
                color: '#00d4ff',
                fontSize: 17,
                fontWeight: 600,
                padding: '9px 20px',
                letterSpacing: '0.06em',
                display: 'flex',
              }}
            >
              {budget}
            </div>
          )}
          {useCase && (
            <div
              style={{
                color: '#4a6070',
                fontSize: 14,
                letterSpacing: '0.05em',
                display: 'flex',
              }}
            >
              {useCase.length > 65 ? useCase.slice(0, 65) + '…' : useCase}
            </div>
          )}
          <div style={{ marginLeft: 'auto', display: 'flex' }}>
            <span style={{ color: '#3a5060', fontSize: 14, letterSpacing: '0.1em', display: 'flex' }}>
              zuuke.shop
            </span>
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  )
}
