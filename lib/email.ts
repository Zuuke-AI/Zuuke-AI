import { Resend } from 'resend'

function getResend() {
  if (!process.env.RESEND_API_KEY) throw new Error('RESEND_API_KEY is not set')
  return new Resend(process.env.RESEND_API_KEY)
}

export const FROM_ADDRESS = 'Zuuke <noreply@zuuke.shop>'

// ── Weekly digest ──────────────────────────────────────────────────

interface Build {
  id: string
  title: string
  budget: string | null
  vote_score: number
}

export async function sendWeeklyDigest({
  to,
  firstName,
  builds,
}: {
  to: string
  firstName: string
  builds: Build[]
}) {
  const buildRows = builds
    .slice(0, 5)
    .map(
      b => `
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid #1a2a35;">
          <a href="https://zuuke.shop/build/${b.id}"
             style="color:#00d4ff;text-decoration:none;font-family:monospace;font-size:13px;">
            ${b.title}
          </a>
          ${b.budget ? `<span style="color:#4d6a7a;font-size:11px;margin-left:8px;">${b.budget}</span>` : ''}
        </td>
        <td style="padding:10px 0;border-bottom:1px solid #1a2a35;text-align:right;
                   font-family:monospace;font-size:12px;color:#4d6a7a;">
          ${b.vote_score > 0 ? '+' : ''}${b.vote_score} pts
        </td>
      </tr>`
    )
    .join('')

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="background:#020305;margin:0;padding:0;font-family:system-ui,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:40px 24px;">

    <!-- Header -->
    <div style="border-bottom:1px solid #1a2a35;padding-bottom:24px;margin-bottom:32px;">
      <span style="background:#00d4ff;color:#020305;font-weight:900;font-size:13px;
                   padding:4px 10px;letter-spacing:0.15em;">ZUUKE</span>
      <span style="color:#3a5060;font-size:11px;margin-left:12px;letter-spacing:0.1em;
                   text-transform:uppercase;">Weekly Build Update</span>
    </div>

    <!-- Greeting -->
    <h1 style="color:#ffffff;font-size:22px;font-weight:800;margin:0 0 8px;letter-spacing:-0.01em;">
      Hey ${firstName} 👋
    </h1>
    <p style="color:#4d6a7a;font-size:14px;line-height:1.6;margin:0 0 32px;">
      Your saved builds are ready to review. Component prices change weekly —
      now's a good time to check if anything dropped or if you're ready to pull the trigger.
    </p>

    <!-- Builds table -->
    <div style="background:#0d1f2d;border:1px solid #1a2a35;border-radius:8px;
                padding:20px 24px;margin-bottom:28px;">
      <p style="color:#4d6a7a;font-size:10px;letter-spacing:0.12em;text-transform:uppercase;
                margin:0 0 16px;">Your Saved Builds</p>
      <table width="100%" cellpadding="0" cellspacing="0">
        <tbody>${buildRows}</tbody>
      </table>
    </div>

    <!-- CTA -->
    <div style="text-align:center;margin-bottom:40px;">
      <a href="https://zuuke.shop/chat"
         style="display:inline-block;background:#00d4ff;color:#020305;
                font-weight:800;font-size:13px;padding:14px 32px;
                text-decoration:none;letter-spacing:0.08em;">
        GENERATE NEW BUILD →
      </a>
    </div>

    <!-- Footer -->
    <div style="border-top:1px solid #1a2a35;padding-top:20px;text-align:center;">
      <p style="color:#2a4050;font-size:11px;margin:0 0 8px;">
        You're receiving this because you have saved builds on Zuuke.
      </p>
      <p style="color:#2a4050;font-size:11px;margin:0;">
        <a href="https://zuuke.shop/settings" style="color:#3a5060;">Unsubscribe</a>
        &nbsp;·&nbsp;
        <a href="https://zuuke.shop" style="color:#3a5060;">zuuke.shop</a>
      </p>
    </div>

  </div>
</body>
</html>`

  const resend = getResend()
  return resend.emails.send({
    from: FROM_ADDRESS,
    to,
    subject: `Your Zuuke builds — weekly update`,
    html,
  })
}

// ── Welcome email ──────────────────────────────────────────────────

export async function sendWelcomeEmail({
  to,
  firstName,
}: {
  to: string
  firstName: string
}) {
  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="background:#020305;margin:0;padding:0;font-family:system-ui,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:40px 24px;">

    <div style="border-bottom:1px solid #1a2a35;padding-bottom:24px;margin-bottom:32px;">
      <span style="background:#00d4ff;color:#020305;font-weight:900;font-size:13px;
                   padding:4px 10px;letter-spacing:0.15em;">ZUUKE</span>
    </div>

    <h1 style="color:#ffffff;font-size:24px;font-weight:800;margin:0 0 8px;">
      Welcome, ${firstName}! 🚀
    </h1>
    <p style="color:#4d6a7a;font-size:14px;line-height:1.7;margin:0 0 24px;">
      You're in. Zuuke will build you a fully personalised, compatibility-verified PC in under 30 seconds —
      with AI reasoning for every single component.
    </p>

    <div style="background:#0d1f2d;border:1px solid #1a2a35;border-radius:8px;padding:20px 24px;margin-bottom:28px;">
      <p style="color:#4d6a7a;font-size:10px;letter-spacing:0.12em;text-transform:uppercase;margin:0 0 14px;">
        What you can do now
      </p>
      <div style="display:flex;flex-direction:column;gap:10px;">
        <p style="color:#c8d8e0;font-size:13px;margin:0;">⚡ <strong>Generate a build</strong> — just describe your budget and use case</p>
        <p style="color:#c8d8e0;font-size:13px;margin:0;">🌐 <strong>Browse community</strong> — see what others are building</p>
        <p style="color:#c8d8e0;font-size:13px;margin:0;">👤 <strong>Set up your profile</strong> — share your builds with the world</p>
      </div>
    </div>

    <div style="text-align:center;margin-bottom:40px;">
      <a href="https://zuuke.shop/chat"
         style="display:inline-block;background:#00d4ff;color:#020305;
                font-weight:800;font-size:13px;padding:14px 32px;
                text-decoration:none;letter-spacing:0.08em;">
        BUILD MY PC NOW →
      </a>
    </div>

    <div style="border-top:1px solid #1a2a35;padding-top:20px;text-align:center;">
      <p style="color:#2a4050;font-size:11px;margin:0;">
        <a href="https://zuuke.shop" style="color:#3a5060;">zuuke.shop</a>
      </p>
    </div>

  </div>
</body>
</html>`

  const resend = getResend()
  return resend.emails.send({
    from: FROM_ADDRESS,
    to,
    subject: `Welcome to Zuuke — let's build your PC`,
    html,
  })
}
