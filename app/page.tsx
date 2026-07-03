'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import BgCanvas from '@/components/BgCanvas'
import MotionFX from '@/components/MotionFX'
import SiteNav from '@/components/SiteNav'
import { createBrowserClient } from '@/lib/supabase'

// ── Quiz Data ─────────────────────────────────────────────────────

const BUDGETS = [
  { label: 'Under $600', val: 'under $600', note: 'Budget gaming' },
  { label: '$600 – $1,000', val: '$600 to $1,000', note: 'Solid performance' },
  { label: '$1,000 – $1,500', val: '$1,000 to $1,500', note: 'High-end gaming' },
  { label: '$1,500 – $2,500', val: '$1,500 to $2,500', note: '1440p / creator' },
  { label: '$2,500+', val: 'over $2,500', note: 'No compromises' },
]

const USE_CASES = [
  { icon: '🎮', label: 'Gaming', val: 'gaming', desc: 'FPS, AAA, Esports' },
  { icon: '🎬', label: 'Video Editing', val: 'video editing and content creation', desc: 'Premiere, DaVinci' },
  { icon: '📡', label: 'Streaming', val: 'gaming and live streaming', desc: 'Twitch, OBS, YouTube' },
  { icon: '🎨', label: '3D / VFX', val: '3D rendering and visual effects', desc: 'Blender, Cinema 4D' },
  { icon: '🤖', label: 'AI / ML', val: 'AI and machine learning', desc: 'PyTorch, TensorFlow' },
  { icon: '⚡', label: 'All-Around', val: 'all-around work and gaming', desc: 'Work + play balance' },
]

const GOALS = [
  { icon: '⚡', label: 'Max FPS', val: 'prioritizing maximum gaming FPS' },
  { icon: '💰', label: 'Best Value', val: 'maximizing performance per dollar' },
  { icon: '🔮', label: 'Future-Proof', val: 'future-proofing for the next 4+ years' },
]

// ── Example Builds ────────────────────────────────────────────────

const BUILDS = [
  {
    tier: 'BUDGET',
    color: 'var(--cyan)',
    name: 'Budget Beast',
    price: '$749',
    badge: null,
    specs: [
      { l: 'GPU', v: 'RTX 4060' },
      { l: 'CPU', v: 'Ryzen 5 7600' },
      { l: 'RAM', v: '16GB DDR5-5600' },
    ],
    tags: ['1080p Gaming', 'CS2', 'Valorant', 'Fortnite'],
    perf: '240+ FPS in CS2',
    score: 88,
    reason: 'Maximizes competitive FPS at 1080p without overspending. Ideal for esports-focused players on a tight budget.',
    promptHint: 'Build me a budget gaming PC under $750, prioritizing maximum FPS at 1080p for competitive games like CS2 and Valorant.',
  },
  {
    tier: 'ELITE',
    color: 'var(--orange)',
    name: '1440p Powerhouse',
    price: '$1,349',
    badge: '★ Most Popular',
    specs: [
      { l: 'GPU', v: 'RTX 4070 Super' },
      { l: 'CPU', v: 'Ryzen 7 7700X' },
      { l: 'RAM', v: '32GB DDR5-6000' },
    ],
    tags: ['1440p AAA', 'Streaming Ready', 'Cyberpunk', 'Elden Ring'],
    perf: '165+ FPS in AAA titles',
    score: 95,
    reason: 'The sweet spot — flawless 1440p gaming with headroom for streaming, future upgrades, and creative work.',
    promptHint: 'Build me a 1440p gaming PC for $1,300 to $1,400, good for AAA games and streaming on the side.',
  },
  {
    tier: 'PRO',
    color: '#a855f7',
    name: 'Creator Rig',
    price: '$1,849',
    badge: null,
    specs: [
      { l: 'GPU', v: 'RTX 4070 Ti Super' },
      { l: 'CPU', v: 'Ryzen 9 7900X' },
      { l: 'RAM', v: '64GB DDR5-6000' },
    ],
    tags: ['4K Editing', 'Premiere Pro', 'Blender', 'AI Workflows'],
    perf: '4K H.265 export in 6 min',
    score: 96,
    reason: 'Built for serious creators. CUDA-accelerated exports, massive RAM for multitasking, GPU with future 4K gaming headroom.',
    promptHint: 'Build me a creator workstation for $1,800 to $1,900, optimized for 4K video editing in Premiere Pro and DaVinci Resolve.',
  },
]

// ── Ticker Data ───────────────────────────────────────────────────

const TICKER = [
  { name: 'RTX 5090', price: '$1,999', dir: 'up' },
  { name: 'RTX 4070 Super', price: '$549', dir: 'down' },
  { name: 'Ryzen 7 9800X3D', price: '$479', dir: 'up' },
  { name: 'RX 9070 XT', price: '$649', dir: 'down' },
  { name: 'Ryzen 5 7600X', price: '$189', dir: 'down' },
  { name: 'Samsung 990 Pro 2TB', price: '$149', dir: 'down' },
  { name: 'Core Ultra 7 265K', price: '$379', dir: 'up' },
  { name: 'RTX 5070 Ti', price: '$829', dir: 'up' },
  { name: '32GB DDR5-6000', price: '$94', dir: 'down' },
  { name: 'Corsair RM850e', price: '$99', dir: 'down' },
]

// ── Comparison Data ───────────────────────────────────────────────

const COMPARE_FEATURES = [
  'Personalized to your build',
  'Instant results (< 30s)',
  'AI reasoning for every part',
  'Compatibility guaranteed',
  'Budget optimization',
  'Explains trade-offs',
]

const COMPARE_SOURCES = [
  { name: 'Reddit', scores: [false, false, false, false, false, false] },
  { name: 'PCPartPicker', scores: [false, false, false, true, false, false] },
  { name: 'YouTube', scores: [false, false, false, false, false, false] },
  { name: 'Zuuke', scores: [true, true, true, true, true, true], highlight: true },
]

// ── Component ─────────────────────────────────────────────────────

export default function LandingPage() {
  const router = useRouter()
  const [isUpgrading, setIsUpgrading] = useState(false)
  const [budget, setBudget] = useState<string | null>(null)
  const [useCase, setUseCase] = useState<string | null>(null)
  const [goal, setGoal] = useState<string | null>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('visible')
            if (e.target.classList.contains('features-grid')) {
              e.target.querySelectorAll('.feature-card').forEach((c, i) => {
                setTimeout(() => c.classList.add('visible'), i * 80)
              })
            }
            if (e.target.classList.contains('builds-grid')) {
              e.target.querySelectorAll('.build-card-v2').forEach((c, i) => {
                setTimeout(() => c.classList.add('visible'), i * 120)
              })
            }
            if (e.target.classList.contains('why-cols')) {
              e.target.querySelectorAll('.why-col').forEach((c, i) => {
                setTimeout(() => c.classList.add('visible'), i * 80)
              })
            }
          }
        })
      },
      { threshold: 0.08 }
    )
    document.querySelectorAll(
      '.feature-card,.build-card-v2,.price-card,.builder-inner,.builds-grid,.why-cols'
    ).forEach((el) => observer.observe(el))
    const fg = document.querySelector('.features-grid')
    if (fg) observer.observe(fg)
    return () => observer.disconnect()
  }, [])

  function buildPrompt() {
    const parts: string[] = []
    if (useCase) parts.push(`Build me a ${useCase} PC`)
    else parts.push('Build me a PC')
    if (budget) parts.push(` with a budget of ${budget}`)
    if (goal) parts.push(`, ${goal}`)
    parts.push('. Provide a complete parts list with prices, compatibility notes, and AI reasoning for every component choice.')
    return parts.join('')
  }

  function handleBuildQuiz() {
    const prompt = buildPrompt()
    router.push(`/chat?prompt=${encodeURIComponent(prompt)}`)
  }

  async function handleUpgrade() {
    if (isUpgrading) return
    setIsUpgrading(true)
    try {
      const supabase = createBrowserClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/auth?mode=signup&next=upgrade')
        return
      }
      const res = await fetch('/api/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      })
      const data = await res.json()
      if (data.url) window.location.href = data.url
    } catch {
      router.push('/chat')
    } finally {
      setIsUpgrading(false)
    }
  }

  const canBuild = !!(budget || useCase || goal)

  return (
    <>
      <BgCanvas opacity={0.5} particleCount={100} connectDistance={120} />
      <MotionFX />

      {/* ── Promo Banner ── */}
      <div className="promo-banner">
        <span className="banner-text-full">🎉 Limited Time — First Month Free on Pro · Cancel anytime</span>
        <span className="banner-text-short">🎉 First Month Free on Pro</span>
        <button onClick={handleUpgrade} className="promo-link-btn">
          {isUpgrading ? 'Loading...' : 'Claim →'}
        </button>
      </div>

      {/* ── Nav ── */}
      <SiteNav style={{ top: 'var(--promo-h, 37px)' }} />

      {/* ── 1. HERO ── */}
      <section className="hero" style={{ paddingTop: 'clamp(120px, 15vw, 180px)' }}>
        <div className="hero-eyebrow">AI-Powered · Personalized · Instant</div>
        <h1 className="hero-title">
          <span className="line-1">BUILD YOUR </span>
          <span className="line-2">PERFECT RIG </span>
          <span className="line-3">IN SECONDS</span>
        </h1>
        <p className="hero-sub">
          Tell Zuuke your budget, games, and goals. Get a fully personalized, compatibility-verified PC build recommendation in under 30 seconds — not 30 hours of Reddit research.
        </p>
        <div className="hero-actions">
          <Link href="/chat" className="btn-primary">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
            Build My PC Free
          </Link>
          <a href="#builds" className="btn-secondary">See Example Builds</a>
        </div>

        {/* Trust indicators */}
        <div className="trust-row">
          {[
            { dot: 'cyan', text: 'Compatibility Verified' },
            { dot: 'cyan', text: 'Personalized to You' },
            { dot: 'cyan', text: 'Budget Optimized' },
            { dot: 'cyan', text: 'AI Reasoning Included' },
          ].map((t) => (
            <div className="trust-chip" key={t.text}>
              <div className="trust-chip-dot" />
              {t.text}
            </div>
          ))}
        </div>
      </section>

      {/* ── PARTS TICKER ── */}
      <div className="ticker-strip" aria-hidden="true">
        <div className="ticker-track">
          {[0, 1].map((copy) => (
            <span className="ticker-group" key={copy}>
              {TICKER.map((t, i) => (
                <span className="ticker-item" key={i}>
                  {t.name} <b>{t.price}</b>
                  <span className={t.dir === 'up' ? 'tick-up' : 'tick-down'}>
                    {t.dir === 'up' ? '▲' : '▼'}
                  </span>
                </span>
              ))}
            </span>
          ))}
        </div>
      </div>

      {/* ── 2. INTERACTIVE BUILDER ── */}
      <section className="builder-section" id="builder" style={{ position: 'relative', zIndex: 1 }}>
        <div className="builder-inner">
          <div className="section-label">Quick Builder</div>
          <h2 className="section-title">YOUR BUILD.<br /><span style={{ color: 'var(--cyan)' }}>30 SECONDS.</span></h2>
          <p className="builder-sub">Select your preferences below and let AI generate your personalized build.</p>

          {/* Step 1: Budget */}
          <div className="builder-step">
            <div className="builder-step-label">
              <span className="builder-step-num">01</span>
              What&apos;s your budget?
            </div>
            <div className="budget-pills">
              {BUDGETS.map((b) => (
                <button
                  key={b.val}
                  className={`budget-pill${budget === b.val ? ' active' : ''}`}
                  onClick={() => setBudget(budget === b.val ? null : b.val)}
                >
                  <span className="bp-main">{b.label}</span>
                  <span className="bp-sub">{b.note}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Step 2: Use Case */}
          <div className="builder-step">
            <div className="builder-step-label">
              <span className="builder-step-num">02</span>
              What will you use it for?
            </div>
            <div className="usecase-grid">
              {USE_CASES.map((u) => (
                <button
                  key={u.val}
                  className={`usecase-card${useCase === u.val ? ' active' : ''}`}
                  onClick={() => setUseCase(useCase === u.val ? null : u.val)}
                >
                  <span className="uc-icon">{u.icon}</span>
                  <span className="uc-label">{u.label}</span>
                  <span className="uc-desc">{u.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Step 3: Goal */}
          <div className="builder-step">
            <div className="builder-step-label">
              <span className="builder-step-num">03</span>
              What matters most?
            </div>
            <div className="goal-pills">
              {GOALS.map((g) => (
                <button
                  key={g.val}
                  className={`goal-pill${goal === g.val ? ' active' : ''}`}
                  onClick={() => setGoal(goal === g.val ? null : g.val)}
                >
                  <span>{g.icon}</span>
                  {g.label}
                </button>
              ))}
            </div>
          </div>

          <div className="builder-cta-row">
            <button
              className={`builder-cta-btn${canBuild ? ' ready' : ''}`}
              onClick={handleBuildQuiz}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
              </svg>
              {canBuild ? 'Generate My Build →' : 'Build My PC →'}
            </button>
            <span className="builder-cta-note">Free · No credit card · Results in seconds</span>
          </div>
        </div>
      </section>

      {/* ── 3. EXAMPLE BUILDS ── */}
      <section className="builds-section" id="builds" style={{ position: 'relative', zIndex: 1 }}>
        <div className="section-label">Example Builds</div>
        <h2 className="section-title">REAL BUILDS.<br />REAL REASONING.</h2>
        <p style={{ textAlign: 'center', fontFamily: 'var(--font-body)', fontSize: 15, color: 'var(--mist)', maxWidth: 500, margin: '0 auto 52px', lineHeight: 1.6 }}>
          Every Zuuke build includes AI reasoning explaining exactly why each part was chosen.
        </p>

        <div className="builds-grid">
          {BUILDS.map((b) => (
            <div className="build-card-v2" key={b.name}>
              {b.badge && (
                <div className="build-popular-badge" style={{ color: b.color, borderColor: b.color + '55' }}>
                  {b.badge}
                </div>
              )}
              <div className="build-tier-tag" style={{ color: b.color }}>
                {b.tier}
              </div>
              <div className="build-card-top">
                <div className="build-card-name">{b.name}</div>
                <div className="build-card-price" style={{ color: b.color }}>{b.price}</div>
              </div>

              <div className="build-specs-list">
                {b.specs.map((s) => (
                  <div className="build-spec-row" key={s.l}>
                    <span className="bsr-l">{s.l}</span>
                    <span className="bsr-v">{s.v}</span>
                  </div>
                ))}
              </div>

              <div className="build-perf-chip" style={{ borderColor: b.color + '44', color: b.color }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                </svg>
                {b.perf}
              </div>

              <div className="build-tags-row">
                {b.tags.map((t) => (
                  <span className="build-tag" key={t}>{t}</span>
                ))}
              </div>

              <div className="build-score-section">
                <div className="build-score-label">
                  <span>AI Confidence</span>
                  <span style={{ color: b.color, fontWeight: 700 }}>{b.score}/100</span>
                </div>
                <div className="build-score-track">
                  <div className="build-score-fill" style={{ width: `${b.score}%`, background: b.color }} />
                </div>
              </div>

              <div className="build-reason-box">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: b.color, flexShrink: 0, marginTop: 2 }}>
                  <circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" />
                </svg>
                <span>{b.reason}</span>
              </div>

              <button
                className="build-try-btn"
                style={{ borderColor: b.color + '55', color: b.color }}
                onClick={() => router.push(`/chat?prompt=${encodeURIComponent(b.promptHint)}`)}
              >
                Build Like This →
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* ── 4. WHY ZUUKE ── */}
      <section className="why-section" style={{ position: 'relative', zIndex: 1 }}>
        <div className="section-label">The Difference</div>
        <h2 className="section-title">WHY ZUUKE BEATS<br />THE OLD WAY.</h2>
        <p style={{ textAlign: 'center', fontFamily: 'var(--font-body)', fontSize: 15, color: 'var(--mist)', maxWidth: 480, margin: '0 auto 52px', lineHeight: 1.6 }}>
          Hours of Reddit research, conflicting YouTube advice, and random PCPartPicker lists are the old way. This is the new one.
        </p>

        <div className="why-table-wrap">
          {/* Header row */}
          <div className="why-table">
            <div className="why-table-head">
              <div className="why-feature-col" />
              {COMPARE_SOURCES.map((s) => (
                <div key={s.name} className={`why-source-col${s.highlight ? ' zuuke' : ''}`}>
                  {s.highlight ? <span style={{ color: 'var(--cyan)' }}>ZUUKE</span> : s.name}
                </div>
              ))}
            </div>
            {COMPARE_FEATURES.map((feat, fi) => (
              <div key={feat} className={`why-table-row${fi % 2 === 0 ? ' alt' : ''}`}>
                <div className="why-feature-col">{feat}</div>
                {COMPARE_SOURCES.map((s) => (
                  <div key={s.name} className={`why-source-col${s.highlight ? ' zuuke' : ''}`}>
                    {s.scores[fi] ? (
                      <span className="why-check">✓</span>
                    ) : (
                      <span className="why-cross">✗</span>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 5. FEATURES ── */}
      <section className="features" id="features" style={{ position: 'relative', zIndex: 1 }}>
        <div className="features-inner">
          <div className="section-label">Capabilities</div>
          <h2 className="section-title">BUILT FOR<br />BUILDERS.</h2>
          <div className="features-grid">
            {[
              {
                icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5M2 12l10 5 10-5"/></svg>,
                title: 'Full Build Generation',
                text: 'CPU, GPU, motherboard, RAM, storage, PSU, case — every component selected, explained, and optimized. No vague suggestions.',
              },
              {
                icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg>,
                title: 'Bottleneck Detection',
                text: 'Zuuke flags and eliminates CPU-GPU bottlenecks before they happen, ensuring every dollar contributes to real performance.',
              },
              {
                icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
                title: 'Upgrade Path Planning',
                text: "Already own parts? Tell Zuuke what you have. It builds around them and maps your future upgrade path with exact part suggestions.",
              },
              {
                icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2v-4M9 21H5a2 2 0 0 1-2-2v-4m0 0h18"/></svg>,
                title: 'Multi-Use Case Tuning',
                text: "Gaming, editing, 3D rendering, streaming, AI workloads — Zuuke understands each workload's unique hardware demands.",
              },
              {
                icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>,
                title: 'Budget Optimization',
                text: 'From $400 builds to $5,000 rigs, Zuuke squeezes maximum performance out of every dollar at every price point.',
              },
              {
                icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
                title: 'AI Reasoning Included',
                text: "Every recommendation explains the why — trade-offs, alternatives considered, and exactly what you gain by choosing each part.",
              },
            ].map((f) => (
              <div className="feature-card" key={f.title}>
                <div className="feature-icon">{f.icon}</div>
                <div className="feature-title">{f.title}</div>
                <div className="feature-text">{f.text}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 6. PRICING ── */}
      <section className="pricing" id="pricing" style={{ position: 'relative', zIndex: 1 }}>
        <div className="pricing-inner">
          <div className="section-label" style={{ justifyContent: 'center' }}>Pricing</div>
          <h2 className="section-title">FIRST MONTH<br /><span style={{ color: 'var(--orange)' }}>FREE.</span></h2>
          <p style={{ textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--mist)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 40, marginTop: -16 }}>
            Limited time offer · Cancel anytime
          </p>
          <div className="pricing-grid">
            <div className="price-card">
              <div className="price-plan">Free Tier</div>
              <div className="price-amount">$<span>0</span></div>
              <div className="price-period">forever free</div>
              <ul className="price-features">
                <li>10 messages per day</li>
                <li>Full build generation</li>
                <li>Compatibility checking</li>
                <li>Amazon affiliate links</li>
                <li className="dim">Saved build history</li>
                <li className="dim">Price drop alerts</li>
                <li className="dim">Priority responses</li>
              </ul>
              <Link href="/chat" className="price-btn outline">Start Building</Link>
            </div>
            <div className="price-card featured">
              <div className="price-badge" style={{ background: 'var(--orange)', color: '#000' }}>🎉 1 Month Free</div>
              <div className="price-plan">Pro Builder</div>
              <div className="price-free-row">
                <div className="price-amount price-amount-strike">$<span>5</span></div>
                <div className="price-free-text">FREE</div>
              </div>
              <div className="price-period">first month · then $5/mo</div>
              <ul className="price-features">
                <li>Unlimited messages</li>
                <li>Full build generation</li>
                <li>Compatibility checking</li>
                <li>Amazon affiliate links</li>
                <li>Saved build history</li>
                <li>Price drop alerts</li>
                <li>Priority responses</li>
              </ul>
              <button
                onClick={handleUpgrade}
                disabled={isUpgrading}
                className="price-btn filled"
                style={{ background: 'var(--orange)', boxShadow: '0 4px 20px rgba(255,107,43,0.35)', cursor: 'pointer', border: 'none' }}
              >
                {isUpgrading ? 'Loading...' : 'Claim Free Month →'}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── 7. COMMUNITY ── */}
      <section className="community-hp-section" id="community" style={{ position: 'relative', zIndex: 1 }}>
        <div className="community-hp-inner">
          <div className="section-label">Community</div>
          <h2 className="section-title">BUILD TOGETHER.<br /><span style={{ color: 'var(--cyan)' }}>LEARN TOGETHER.</span></h2>
          <p className="community-hp-sub">
            The Zuuke community is where PC builders share their AI-generated rigs, vote on the best setups, ask questions, and inspire each other. Real builds from real people — not paid reviews.
          </p>

          {/* Feature pills */}
          <div className="community-hp-pills">
            <div className="community-hp-pill">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M12 4l8 8H4l8-8z"/></svg>
              Vote on builds
            </div>
            <div className="community-hp-pill">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              Comment & discuss
            </div>
            <div className="community-hp-pill">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
              Share build photos
            </div>
            <div className="community-hp-pill">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              Public profiles
            </div>
          </div>

          <div className="community-hp-actions">
            <Link href="/community" className="btn-primary">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
              Browse Community Builds
            </Link>
            <Link href="/chat" className="btn-secondary">
              Generate Your Build →
            </Link>
          </div>
        </div>
      </section>

      {/* ── 8. FINAL CTA ── */}
      <section className="final-cta" style={{ position: 'relative', zIndex: 1 }}>
        <div className="final-cta-eyebrow">Ready to build?</div>
        <div className="final-cta-title">
          STOP RESEARCHING.<br />
          <span className="accent">START BUILDING.</span>
        </div>
        <p>Thousands of hours of PC building expertise distilled into 30 seconds. Free to try — create an account to save and share your builds.</p>
        <Link href="/chat" className="btn-primary" style={{ fontSize: 15, padding: '18px 52px' }}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
          </svg>
          Build My PC Now — Free
        </Link>
      </section>

      {/* ── Footer ── */}
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
