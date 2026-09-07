// Vercel serverless function: receives the contact / newsletter form
// submissions and emails them through Resend (RESEND_API_KEY in the
// Vercel project; the linkable.link domain is verified there).
const TO = process.env.FORM_TO || 'federico@linkable.link';
const FROM = process.env.FORM_FROM || 'Linkable website <noreply@linkable.link>';
const HONEYPOT = ['website', 'company', 'message', 'subject', 'title', 'description', 'feedback', 'notes'];

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const body = typeof req.body === 'string' ? safeJson(req.body) : req.body || {};
  const form = body.form === 'newsletter' ? 'newsletter' : 'contact';

  // Framer's hidden honeypot inputs (lowercase names) must stay empty; the
  // real fields are capitalised (Name, Email, Company, Phone, Message).
  if (HONEYPOT.some((k) => body[k])) return res.status(200).json({ ok: true });

  const email = String(body.Email || '').trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'A valid email is required' });

  const fields = Object.entries(body)
    .filter(([k, v]) => /^[A-Z]/.test(k) && String(v).trim())
    .map(([k, v]) => `${k}: ${String(v).trim().slice(0, 5000)}`);
  fields.push(`Page: ${String(body.page || '').slice(0, 200)}`);

  if (!process.env.RESEND_API_KEY) return res.status(503).json({ error: 'Email delivery is not configured' });

  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: FROM,
        to: [TO],
        reply_to: email,
        subject: form === 'newsletter' ? `Newsletter signup: ${email}` : `Contact request from ${body.Name || email}`,
        text: fields.join('\n'),
      }),
    });
    const out = await r.json().catch(() => ({}));
    if (!r.ok) {
      console.error('resend error', r.status, out);
      return res.status(502).json({ error: 'Could not send the message' });
    }
    return res.status(200).json({ ok: true, id: out.id });
  } catch (err) {
    console.error('form email failed', err);
    return res.status(502).json({ error: 'Could not send the message' });
  }
}

function safeJson(s) {
  try { return JSON.parse(s); } catch { return {}; }
}
