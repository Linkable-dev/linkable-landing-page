// Endpoint that receives form submissions (contact form + newsletter).
// Defaults to the Vercel function in api/form.js, which emails them to
// federico@linkable.link (see README for the SMTP variables it needs).
export const FORM_ENDPOINT = import.meta.env.VITE_FORM_ENDPOINT ?? '/api/form';
// Used when the endpoint is unavailable: opens the visitor's mail client.
export const FALLBACK_MAILTO = 'federico@linkable.link';
