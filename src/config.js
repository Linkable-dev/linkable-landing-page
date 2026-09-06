// Endpoint that receives form submissions (contact form + newsletter).
// Framer used to handle these server-side; point this at your own API,
// a Vercel function, or a service such as Formspree. Leave empty to
// fall back to opening the visitor's mail client.
export const FORM_ENDPOINT = import.meta.env.VITE_FORM_ENDPOINT || '';
export const FALLBACK_MAILTO = 'support@linkable.link'; // address used on the live site
