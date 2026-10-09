// Behaviour the design only mocked: the contact form, the newsletter box and
// "copy link" on articles. Both forms post to the same endpoint as before
// (api/form.js, which emails the submission), with capitalised field names
// because that function treats lowercase ones as spam traps.

import { FALLBACK_MAILTO, FORM_ENDPOINT } from '../config.js';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function post(payload) {
  const res = await fetch(FORM_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ ...payload, page: location.pathname }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
}

// Endpoint unreachable: hand the message to the visitor's mail client instead.
function mailto(subject, fields) {
  const body = Object.entries(fields)
    .filter(([, v]) => String(v).trim())
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n');
  location.href = `mailto:${FALLBACK_MAILTO}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export async function sendContact(app, e) {
  const card = e.target.closest('.ct-card');
  if (!card || (app.state && app.state.busy)) return;
  const field = (name) => card.querySelector(`[name="${name}"]`);
  const value = (name) => (field(name)?.value || '').trim();
  const creator = !!(app.state && app.state.creator);
  const fields = {
    Type: creator ? 'Creator' : 'Brand',
    Name: value('name'),
    Email: value('email'),
    [creator ? 'Handle' : 'Website']: value('org'),
    Message: value('message'),
  };
  const missing = !fields.Name ? ['name', 'Please add your name.']
    : !EMAIL.test(fields.Email) ? ['email', 'Please enter a valid email address.']
    : !fields.Message ? ['message', 'Please tell us how we can help.']
    : null;
  if (missing) {
    app.setState({ error: missing[1] });
    field(missing[0])?.focus();
    return;
  }
  app.setState({ busy: true, error: null });
  try {
    await post({ ...fields, form: 'contact' });
    app.setState({ busy: false, sent: true });
  } catch {
    app.setState({ busy: false, error: 'We could not send this from the page, so your email app is opening with the message instead.' });
    mailto('Contact request from linkable.link', fields);
  }
}

export async function subscribe(app, e) {
  const input = document.getElementById('lk-news-email');
  const email = (input?.value || '').trim();
  if (!EMAIL.test(email)) {
    app.setState({ newsError: 'Please enter a valid email address.' });
    input?.focus();
    return;
  }
  const button = e.target.closest('button');
  button?.setAttribute('aria-busy', 'true');
  try {
    await post({ Email: email, form: 'newsletter' });
    app.setState({ subbed: true, newsError: null });
  } catch {
    app.setState({ newsError: null });
    mailto('Newsletter subscription', { Email: email });
  } finally {
    button?.removeAttribute('aria-busy');
  }
}

export async function copyLink(app, e, url) {
  e.preventDefault();
  try {
    await navigator.clipboard.writeText(url);
    app.setState({ copied: true });
    setTimeout(() => app.setState({ copied: false }), 2000);
  } catch {
    // Clipboard blocked (insecure context, permissions): the link still works
    // as an ordinary link to the article.
    location.href = url;
  }
}
