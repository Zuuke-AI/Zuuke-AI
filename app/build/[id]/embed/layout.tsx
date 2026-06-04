// Minimal layout for embed pages — no nav, no cursor, no analytics
// Root layout still applies fonts + global CSS which is fine for the dark theme
export default function EmbedLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
