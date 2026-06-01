'use client'

import Link from 'next/link'
import BgCanvas from '@/components/BgCanvas'
import SiteNav from '@/components/SiteNav'

export default function AffiliatePage() {

  return (
    <>
      <BgCanvas opacity={0.3} particleCount={60} connectDistance={100} />

      <SiteNav activePage="affiliate" />

      <div className="page" style={{ position: 'relative', zIndex: 1, paddingTop: 100 }}>
        <section style={{ maxWidth: 760, margin: '0 auto', padding: '60px 24px 100px' }}>

          <div className="section-label" style={{ marginBottom: 16 }}>Legal</div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(42px, 6vw, 72px)', letterSpacing: '0.04em', lineHeight: 1, marginBottom: 12 }}>
            AFFILIATE<br /><span style={{ color: 'var(--cyan)' }}>DISCLOSURE</span>
          </h1>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--mist)', letterSpacing: '0.1em', marginBottom: 56, textTransform: 'uppercase' }}>
            Last updated: May 2026 · FTC compliant disclosure
          </p>

          {/* Summary callout */}
          <div style={{
            background: 'var(--dark-2)',
            border: '1px solid rgba(0,212,255,0.2)',
            padding: '28px 32px',
            marginBottom: 56,
            position: 'relative',
            overflow: 'hidden',
          }}>
            <div style={{
              position: 'absolute', top: 0, left: 0, width: 3, height: '100%',
              background: 'var(--cyan)',
            }} />
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 13, letterSpacing: '0.1em', color: 'var(--cyan)', marginBottom: 10 }}>
              THE SHORT VERSION
            </div>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: 15, lineHeight: 1.7, color: 'var(--white)' }}>
              Some product links on Zuuke are Amazon affiliate links. If you click one and buy something, we earn a small commission — at <strong>zero extra cost to you</strong>. Our recommendations are based purely on performance and value, never on commission rates.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 48 }}>

            <LegalSection title="01 — What Is an Affiliate Link?">
              <p>An affiliate link is a specially tracked URL that tells Amazon we referred you. When you click an affiliate link and make a purchase within a qualifying window, the retailer pays us a small percentage of the sale as a referral fee.</p>
              <p>The price you pay is exactly the same whether you use our affiliate link or go to Amazon directly. There is no markup, no hidden fee, and no difference in your shopping experience.</p>
            </LegalSection>

            <LegalSection title="02 — Amazon Associates Program">
              <p>Zuuke is a participant in the <strong>Amazon Services LLC Associates Program</strong>, an affiliate advertising program designed to provide a means for sites to earn advertising fees by advertising and linking to Amazon.com.</p>
              <p>Our Amazon affiliate tag is <code style={{ fontFamily: 'var(--font-mono)', fontSize: 12, background: 'var(--dark-3)', padding: '2px 8px', color: 'var(--cyan)' }}>zuuke06-20</code>. You can identify our affiliate links by this tag in the URL.</p>
              <p>Amazon and the Amazon logo are trademarks of Amazon.com, Inc., or its affiliates.</p>
            </LegalSection>

            <LegalSection title="03 — How We Use Affiliate Links">
              <p>When Zuuke AI recommends a PC component (CPU, GPU, motherboard, RAM, storage, PSU, or case), the product name in the response may be linked directly to Amazon with our affiliate tag appended.</p>
              <p>These links are generated automatically based on the component name. We do not manually select which products get affiliate links based on commission rates.</p>
            </LegalSection>

            <LegalSection title="04 — Our Recommendation Policy">
              <p>Our recommendations are determined entirely by our AI based on:</p>
              <ul>
                <li>Performance-to-price ratio for your specific use case</li>
                <li>Component compatibility (CPU socket, RAM type, power requirements, etc.)</li>
                <li>Avoiding CPU-GPU bottlenecks</li>
                <li>Budget optimization — maximizing performance per dollar</li>
                <li>Reliability and user reviews</li>
              </ul>
              <p><strong>We do not recommend products based on their affiliate commission rates.</strong> A component that earns us $0.50 in commission gets the same consideration as one that earns us $10. The best part for your build is always recommended, regardless of financial benefit to us.</p>
            </LegalSection>

            <LegalSection title="05 — Other Retailers">
              <p>Zuuke currently links to Amazon as our primary retail partner. We may expand to other retailers (Newegg, B&H Photo, Micro Center, Best Buy) in the future, and will update this disclosure accordingly.</p>
              <p>You are always free to purchase recommended components from any retailer of your choosing. Our affiliate links are a convenience, not a requirement.</p>
            </LegalSection>

            <LegalSection title="06 — FTC Compliance">
              <p>This disclosure is made in accordance with the Federal Trade Commission&apos;s guidelines on endorsements and testimonials (16 CFR Part 255) and the FTC&apos;s Dot Com Disclosures guidelines.</p>
              <p>We believe in full transparency. If you have any questions about our affiliate relationships or how our recommendations are made, please contact us.</p>
            </LegalSection>

            <LegalSection title="07 — Contact">
              <p>Questions about our affiliate program or how it affects our recommendations?</p>
              <ul>
                <li>Email: <a href="mailto:hello@zuuke.shop" style={{ color: 'var(--cyan)' }}>hello@zuuke.shop</a></li>
                <li>Website: <Link href="/" style={{ color: 'var(--cyan)' }}>zuuke.shop</Link></li>
              </ul>
            </LegalSection>

          </div>

          {/* Bottom CTA */}
          <div style={{ marginTop: 72, textAlign: 'center', borderTop: '1px solid var(--border)', paddingTop: 56 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 32, letterSpacing: '0.04em', marginBottom: 16 }}>
              READY TO BUILD?
            </div>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--mist)', marginBottom: 28 }}>
              Transparent recommendations. Zero extra cost. Your perfect PC.
            </p>
            <Link href="/chat" className="btn-primary">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
              </svg>
              Start Building Free
            </Link>
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
