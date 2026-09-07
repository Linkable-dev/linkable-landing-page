// Vercel serverless function: receives the contact / newsletter form
// submissions and emails them. Configure SMTP_USER and SMTP_PASS in the
// Vercel project (for Google Workspace: the mailbox and an App Password).
import nodemailer from 'nodemailer';

const TO = process.env.FORM_TO || 'federico@linkable.link';
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
    .map(([k, v]) => `${k}: ${String(v).trim()}`);
  fields.push(`Page: ${body.page || ''}`);

  const { SMTP_USER, SMTP_PASS, SMTP_HOST = 'smtp.gmail.com', SMTP_PORT = '465' } = process.env;
  if (!SMTP_USER || !SMTP_PASS) return res.status(503).json({ error: 'Email delivery is not configured' });

  const transport = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: Number(SMTP_PORT) === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
  try {
    await transport.sendMail({
      from: `"Linkable website" <${SMTP_USER}>`,
      to: TO,
      replyTo: email,
      subject: form === 'newsletter' ? `Newsletter signup: ${email}` : `Contact request from ${body.Name || email}`,
      text: fields.join('\n'),
    });
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('form email failed', err);
    return res.status(502).json({ error: 'Could not send the message' });
  }
}

function safeJson(s) {
  try { return JSON.parse(s); } catch { return {}; }
}
