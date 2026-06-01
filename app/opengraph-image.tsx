import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'Zuuke — Build Your Perfect Rig In Seconds'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#020305',
          fontFamily: 'sans-serif',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Subtle grid background */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage:
              'linear-gradient(rgba(0,212,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(0,212,255,0.04) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />

        {/* Glow behind logo */}
        <div
          style={{
            position: 'absolute',
            width: 400,
            height: 400,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(0,212,255,0.12) 0%, transparent 70%)',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -60%)',
          }}
        />

        {/* Zuuke Z logo */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://zuuke.shop/zuukelogo-sq.png"
          width={200}
          height={200}
          alt="Zuuke"
          style={{ marginBottom: 20, borderRadius: 20 }}
        />

        {/* ZUUKE wordmark */}
        <div
          style={{
            fontSize: 96,
            fontWeight: 900,
            letterSpacing: 12,
            color: '#ffffff',
            lineHeight: 1,
            marginBottom: 20,
            textTransform: 'uppercase',
          }}
        >
          ZUUKE
        </div>

        {/* Tagline */}
        <div
          style={{
            fontSize: 28,
            color: '#00d4ff',
            letterSpacing: 3,
            fontWeight: 400,
            textTransform: 'uppercase',
            opacity: 0.9,
          }}
        >
          BUILD YOUR PERFECT RIG IN SECONDS
        </div>

        {/* Subtle bottom URL */}
        <div
          style={{
            position: 'absolute',
            bottom: 36,
            fontSize: 20,
            color: 'rgba(255,255,255,0.3)',
            letterSpacing: 2,
          }}
        >
          zuuke.shop
        </div>
      </div>
    ),
    { ...size }
  )
}
