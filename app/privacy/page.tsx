'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import BgCanvas from '@/components/BgCanvas'

export default function PrivacyPage() {
  const navRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const onScroll = () => navRef.current?.classList.toggle('scrolled', window.scrollY > 40)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <>
      <BgCanvas opacity={0.3} particleCount={60} connectDistance={100} />

      <nav ref={navRef} className="nav">
        <Link href="/" className="nav-logo" onClick={() => setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 50)}>
          <div className="nav-logo-mark">
            <img src="/zuukelogo-sq.png" style={{width:38,height:38,objectFit:"cover"}} alt="Zuuke logo"/>
          </div>
          <span className="nav-wordmark">ZUUKE<span>.</span></span>
        </Link>
        <div className="nav-links">
          <Link href="/#how-it-works">How It Works</Link>
          <Link href="/#features">Features</Link>
          <Link href="/#pricing">Pricing</Link>
          <Link href="/about">About Us</Link>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link href="/auth?mode=login" className="nav-login">Log In</Link>
          <Link href="/chat" className="nav-cta"><span>Start Building →</span></Link>
        </div>
      </nav>

      <div className="page" style={{ position: 'relative', zIndex: 1, paddingTop: 100 }}>
        <section style={{ maxWidth: 760, margin: '0 auto', padding: '60px 24px 100px' }}>

          <div className="section-label" style={{ marginBottom: 16 }}>Legal</div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(42px, 6vw, 72px)', letterSpacing: '0.04em', lineHeight: 1, marginBottom: 12 }}>
            PRIVACY<br /><span style={{ color: 'var(--cyan)' }}>POLICY</span>
          </h1>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--mist)', letterSpacing: '0.1em', marginBottom: 56, textTransform: 'uppercase' }}>
            Last updated: May 2026 · Effective immediately
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 48 }}>

            <LegalSection title="01 — Overview">
              <p>Zuuke AI (&quot;Zuuke,&quot; &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) operates zuuke.shop, an AI-powered PC build recommendation service. This Privacy Policy explains how we collect, use, and protect your information when you use our website and services.</p>
              <p>By using Zuuke, you agree to the practices described in this policy. If you do not agree, please do not use our service.</p>
            </LegalSection>

            <LegalSection title="02 — Information We Collect">
              <p><strong>Account Information:</strong> When you create an account, we collect your email address and optional first name. This is handled securely through Supabase, our authentication provider.</p>
              <p><strong>Usage Data:</strong> We track the number of messages you send per day to enforce free tier limits (10 messages/day). We do not store the content of your conversations on our servers beyond what is necessary to generate your response.</p>
              <p><strong>Payment Information:</strong> If you subscribe to Zuuke Pro, your payment details are handled entirely by Stripe. We never see, store, or have access to your card number, CVV, or bank account information. We only store a Stripe customer ID to manage your subscription.</p>
              <p><strong>Technical Data:</strong> We may collect standard server logs including your IP address, browser type, and pages visited. This data is used for security, debugging, and improving our service.</p>
            </LegalSection>

            <LegalSection title="03 — How We Use Your Information">
              <p>We use the information we collect to:</p>
              <ul>
                <li>Provide and improve the Zuuke AI service</li>
                <li>Manage your account and subscription</li>
                <li>Enforce fair usage limits on free tier accounts</li>
                <li>Send essential service emails (e.g., subscription confirmations, receipts)</li>
                <li>Detect and prevent fraud or abuse</li>
                <li>Comply with legal obligations</li>
              </ul>
              <p>We do <strong>not</strong> sell your personal information to third parties. We do not use your conversations to train AI models.</p>
            </LegalSection>

            <LegalSection title="04 — Third-Party Services">
              <p>Zuuke uses the following third-party services, each with their own privacy policies:</p>
              <ul>
                <li><strong>Supabase</strong> — Authentication and database hosting. Your email and account data are stored on Supabase servers. <a href="https://supabase.com/privacy" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--cyan)' }}>Supabase Privacy Policy</a></li>
                <li><strong>Stripe</strong> — Payment processing for Pro subscriptions. Card data never touches our servers. <a href="https://stripe.com/privacy" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--cyan)' }}>Stripe Privacy Policy</a></li>
                <li><strong>Anthropic</strong> — The AI model (Claude) that powers Zuuke&apos;s recommendations. Your messages are sent to Anthropic&apos;s API to generate responses. <a href="https://www.anthropic.com/privacy" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--cyan)' }}>Anthropic Privacy Policy</a></li>
                <li><strong>Amazon Associates</strong> — We participate in the Amazon affiliate program. Product links on our platform may be affiliate links. See our <Link href="/affiliate" style={{ color: 'var(--cyan)' }}>Affiliate Disclosure</Link> for details.</li>
                <li><strong>Vercel</strong> — Website hosting and deployment infrastructure.</li>
              </ul>
            </LegalSection>

            <LegalSection title="05 — Cookies">
              <p>Zuuke uses minimal cookies necessary for the service to function:</p>
              <ul>
                <li><strong>Authentication cookies</strong> — To keep you signed in across sessions</li>
                <li><strong>Preference cookies</strong> — To remember your settings</li>
              </ul>
              <p>We do not use advertising cookies or third-party tracking cookies. You can disable cookies in your browser settings, though this may affect your ability to stay signed in.</p>
            </LegalSection>

            <LegalSection title="06 — Data Retention">
              <p>We retain your account data for as long as your account is active. If you delete your account, we will remove your personal information within 30 days, except where we are required to retain it for legal or financial compliance (e.g., Stripe transaction records).</p>
              <p>Conversation history stored locally in your browser (via localStorage) is entirely under your control and can be cleared at any time through your browser settings.</p>
            </LegalSection>

            <LegalSection title="07 — Your Rights">
              <p>You have the right to:</p>
              <ul>
                <li>Access the personal data we hold about you</li>
                <li>Request correction of inaccurate data</li>
                <li>Request deletion of your account and associated data</li>
                <li>Opt out of non-essential communications</li>
              </ul>
              <p>To exercise any of these rights, contact us at <a href="mailto:privacy@zuuke.shop" style={{ color: 'var(--cyan)' }}>privacy@zuuke.shop</a>.</p>
            </LegalSection>

            <LegalSection title="08 — Security">
              <p>We take reasonable measures to protect your information, including HTTPS encryption in transit and secure storage practices through our infrastructure providers. However, no internet transmission is completely secure, and we cannot guarantee absolute security.</p>
            </LegalSection>

            <LegalSection title="09 — Children's Privacy">
              <p>Zuuke is not directed at children under 13. We do not knowingly collect personal information from children under 13. If you believe we have inadvertently collected such information, please contact us immediately.</p>
            </LegalSection>

            <LegalSection title="10 — Changes to This Policy">
              <p>We may update this Privacy Policy from time to time. We will notify you of significant changes by posting the new policy on this page with an updated date. Your continued use of Zuuke after changes constitutes acceptance of the updated policy.</p>
            </LegalSection>

            <LegalSection title="11 — Contact Us">
              <p>If you have questions about this Privacy Policy, please contact us:</p>
              <ul>
                <li>Email: <a href="mailto:privacy@zuuke.shop" style={{ color: 'var(--cyan)' }}>privacy@zuuke.shop</a></li>
                <li>Website: <Link href="/" style={{ color: 'var(--cyan)' }}>zuuke.shop</Link></li>
              </ul>
            </LegalSection>

          </div>
        </section>
      </div>

      <footer style={{ position: 'relative', zIndex: 1 }}>
        <div className="footer-logo">ZUUKE<span>.</span></div>
        <div className="footer-text">© 2026 Zuuke AI · All rights reserved</div>
        <div className="footer-links">
          <Link href="/about">About Us</Link>
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
          <Link href="/affiliate">Affiliate Disclosure</Link>
        </div>
      </footer>
    </>
  )
}

function LegalSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ borderTop: '1px solid var(--border)', paddingTop: 32 }}>
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, letterSpacing: '0.06em', color: 'var(--cyan)', marginBottom: 20 }}>
        {title}
      </h2>
      <div style={{
        display: 'flex', flexDirection: 'column', gap: 14,
        fontFamily: 'var(--font-body)', fontSize: 15, lineHeight: 1.75,
        color: 'var(--mist-2)', fontWeight: 400,
      }}>
        {children}
      </div>
    </div>
  )
}
