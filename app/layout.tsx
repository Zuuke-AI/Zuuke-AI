import type { Metadata } from 'next'
import { Bebas_Neue, Rajdhani, JetBrains_Mono } from 'next/font/google'
import Script from 'next/script'
import './globals.css'
import Cursor from '@/components/Cursor'

const bebasNeue = Bebas_Neue({
  weight: '400',
  variable: '--font-display',
  subsets: ['latin'],
  display: 'swap',
})

const rajdhani = Rajdhani({
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-body',
  subsets: ['latin'],
  display: 'swap',
})

const jetbrainsMono = JetBrains_Mono({
  weight: ['300', '400', '500'],
  variable: '--font-mono',
  subsets: ['latin'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Zuuke — Build Your Perfect Rig In Seconds',
  description: 'Tell Zuuke your budget and use case. Get a complete, compatible, optimized PC build recommendation in under 30 seconds — free.',
  metadataBase: new URL('https://zuuke.shop'),
  alternates: {
    canonical: 'https://zuuke.shop',
  },
  icons: {
    icon: [
      { url: '/favicon-192.png',  sizes: '192x192', type: 'image/png' },
      { url: '/zuukelogo-sq.png', sizes: '512x512', type: 'image/png' },
      { url: '/favicon-32.png',   sizes: '32x32',   type: 'image/png' },
    ],
    shortcut: '/favicon.ico',
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180' }],
  },
  openGraph: {
    title: 'Zuuke — Build Your Perfect Rig In Seconds',
    description: 'Tell Zuuke your budget and use case. Get a complete, compatible, optimized PC build in seconds.',
    url: 'https://zuuke.shop',
    siteName: 'Zuuke',
    images: [
      {
        url: '/opengraph-image',
        width: 1200,
        height: 630,
        alt: 'Zuuke — Build Your Perfect Rig In Seconds',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Zuuke — Build Your Perfect Rig In Seconds',
    description: 'Tell Zuuke your budget and use case. Get a complete, compatible, optimized PC build in seconds.',
    images: ['/opengraph-image'],
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-scroll-behavior="smooth" className={`${bebasNeue.variable} ${rajdhani.variable} ${jetbrainsMono.variable}`}>
      <body>
        {/* Google Analytics */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-WYFRTFY7F9"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-WYFRTFY7F9');
          `}
        </Script>
        {/* Google AdSense */}
        <Script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-2901252402000380"
          crossOrigin="anonymous"
          strategy="afterInteractive"
        />
        <Cursor />
        {children}
      </body>
    </html>
  )
}
