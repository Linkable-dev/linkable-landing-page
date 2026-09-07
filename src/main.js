// Native replacement for the Framer runtime: scroll-in animations, FAQ
// accordion, mobile menu, testimonial slideshows, step progress bars,
// nested links, dynamic year and form handling.
import './site.css';
import menuExpandedHtml from './menu-expanded.html?raw';
import { FORM_ENDPOINT, FALLBACK_MAILTO } from './config.js';

const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------------------------------------------------------------- appear */
function initAppear() {
  // Framer leaves scroll-in elements at opacity 0(.001) + translateY(N px).
  const targets = $$('[style*="opacity:0"]').filter((el) =>
    /(?:^|;)opacity:0(?:\.001)?;transform:translateY\(\d+px\)/.test(el.getAttribute('style') || ''),
  );
  const reveal = (el) => {
    el.style.opacity = '1';
    el.style.transform = 'none';
  };
  if (!('IntersectionObserver' in window) || reduceMotion) return targets.forEach(reveal);
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        reveal(e.target);
        io.unobserve(e.target);
      }
    },
    { rootMargin: '0px 0px -8% 0px', threshold: 0.05 },
  );
  targets.forEach((el) => {
    el.classList.add('lk-appear');
    io.observe(el);
  });
}

/* ------------------------------------------------------------------- FAQ */
function initFaq() {
  const questions = $$('[data-framer-name="Question"]');
  const items = questions.map((q) => q.parentElement).filter(Boolean);
  const variantOf = (el) => Array.from(el.classList).find((c) => c.startsWith('framer-v-'));
  // The open variant is "framer-v-" + the item's own layout class.
  const openVariantOf = (el) =>
    Array.from(el.classList)
      .filter((c) => c.startsWith('framer-') && !c.startsWith('framer-v-'))
      .map((c) => 'framer-v-' + c.slice('framer-'.length))
      .find((v) => el.classList.contains(v) || true);
  // Closed variant: whatever variant a closed sibling carries.
  const closedVariant = items.map(variantOf).find((v, i) => v && v !== openVariantOf(items[i]));

  items.forEach((item) => {
    item.classList.add('lk-faq');
    const answer = item.querySelector('[data-framer-name="Answer"]');
    const question = item.querySelector('[data-framer-name="Question"]');
    const lines = question ? $$('[data-framer-name="Icon"] > div > div', question) : [];
    const vertical = lines.find((l) => /rotate\(270deg\)/.test(l.getAttribute('style') || '')) || lines[0];
    const isOpen = () => !closedVariant || !item.classList.contains(closedVariant);
    const openVariant = 'framer-v-' + (item.className.match(/framer-(\w+) framer-v-/)?.[1] || '');
    if (!answer || !question) return;

    if (isOpen()) {
      answer.style.opacity = '1';
      if (vertical) vertical.style.transform = 'rotate(180deg)';
    }
    item.setAttribute('role', 'button');
    item.setAttribute('aria-expanded', String(isOpen()));

    const toggle = () => {
      const open = !isOpen();
      const from = answer.getBoundingClientRect().height;
      if (open) {
        item.classList.remove(closedVariant);
        item.classList.add(openVariant);
      } else {
        item.classList.add(closedVariant);
        item.classList.remove(openVariant);
      }
      answer.style.height = 'auto';
      const to = open ? answer.scrollHeight : 1;
      answer.style.height = from + 'px';
      answer.style.opacity = open ? '1' : '0';
      requestAnimationFrame(() => {
        answer.style.height = to + 'px';
      });
      answer.addEventListener('transitionend', function done(ev) {
        if (ev.propertyName !== 'height') return;
        answer.removeEventListener('transitionend', done);
        answer.style.height = open ? 'auto' : '';
      });
      if (vertical) vertical.style.transform = open ? 'rotate(180deg)' : 'rotate(270deg)';
      item.setAttribute('aria-expanded', String(open));
    };
    item.addEventListener('click', toggle);
    item.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggle();
      }
    });
  });
}

/* ----------------------------------------------------------- mobile menu */
function initMobileMenu() {
  $$('header[data-framer-name^="Mobile"]').forEach((header) => {
    const nav = header.querySelector('nav');
    const burger = header.querySelector('.framer-8xZRi');
    const logo = header.querySelector('a[data-framer-name="Inverted"], a[data-framer-name="Default"]');
    if (!nav || !burger) return;
    const closedVariant = 'framer-v-e6shp0';
    const openVariant = 'framer-v-1w4sbda';
    const lines = $$('[data-framer-name="Line"]', burger);
    const logoBox = logo?.firstElementChild;
    const logoImg = logo?.querySelector('img');
    const darkLogo = '/assets/images/UZ39G8mUvL0K8fhNPlSxXcKKrRA.svg';
    const lightLogo = logoImg?.getAttribute('src');
    const navStyle = { bg: nav.style.backgroundColor, shadow: nav.style.boxShadow };
    let extra = null;
    let open = false;

    const setOpen = (next) => {
      open = next;
      const startH = nav.getBoundingClientRect().height;
      header.classList.toggle(openVariant, open);
      header.classList.toggle(closedVariant, !open);
      header.style.backgroundColor = open ? 'rgba(0, 0, 0, 0)' : 'rgba(255, 255, 255, 0)';
      header.setAttribute('data-framer-name', open ? 'Mobile - inverted - Expanded' : 'Mobile - inverted');
      nav.style.backgroundColor = open ? 'rgb(255, 255, 255)' : navStyle.bg;
      nav.style.boxShadow = open
        ? 'rgba(0, 0, 0, 0.11) 0px 0.5px 2px 0px, rgba(0, 0, 0, 0.01) 0px 0.602187px 1.56569px -0.416667px, rgba(0, 0, 0, 0.02) 0px 2.28853px 5.95019px -0.833333px, rgba(0, 0, 0, 0.04) 0px 10px 26px -1.25px'
        : navStyle.shadow;
      burger.classList.toggle('framer-v-87erhv', open);
      burger.classList.toggle('framer-v-1427v4s', !open);
      burger.style.backgroundColor = open ? 'rgb(238, 239, 242)' : 'rgb(246, 247, 248)';
      burger.setAttribute('aria-expanded', String(open));
      lines.forEach((l, i) => {
        l.style.backgroundColor = open ? 'rgb(18, 20, 25)' : 'rgb(50, 55, 69)';
        if (lines.length === 3) {
          if (i === 0) l.style.opacity = open ? '0' : '1';
          if (i === 1) l.style.transform = open ? 'rotate(45deg)' : 'none';
          if (i === 2) l.style.transform = open ? 'rotate(-45deg)' : 'none';
        }
      });
      if (logo && logoBox && logoImg) {
        logo.classList.toggle('framer-v-iq6bso', open);
        logo.classList.toggle('framer-v-11tgc3b', !open);
        logoBox.classList.toggle('framer-1i55h21', open);
        logoBox.classList.toggle('framer-svh1ej', !open);
        logoImg.setAttribute('src', open ? darkLogo : lightLogo);
      }
      if (open && !extra) {
        const tpl = document.createElement('template');
        tpl.innerHTML = menuExpandedHtml;
        extra = Array.from(tpl.content.children);
        const current = location.pathname.replace(/\/$/, '') || '/';
        extra.forEach((el) => {
          $$('a[href]', el).forEach((a) => {
            const href = a.getAttribute('href').replace(/\/$/, '') || '/';
            if (href === current) a.setAttribute('data-framer-page-link-current', 'true');
          });
        });
        const overlay = extra.find((el) => el.getAttribute('data-framer-name') === 'Mobile Overlay');
        overlay?.addEventListener('click', () => setOpen(false));
        $$('a[href]', extra[0]).forEach((a) => a.addEventListener('click', () => setOpen(false)));
      }
      if (extra) {
        extra.forEach((el) => {
          const isOverlay = el.getAttribute('data-framer-name') === 'Mobile Overlay';
          if (open) (isOverlay ? header : nav).appendChild(el);
          else el.remove();
        });
      }
      document.body.classList.toggle('lk-menu-locked', open);
      // Animate the pill height between the two layouts.
      if (!reduceMotion) {
        const endH = nav.getBoundingClientRect().height;
        nav.style.transition = 'none';
        nav.style.height = startH + 'px';
        nav.style.overflow = 'hidden';
        void nav.offsetHeight;
        nav.style.transition = '';
        nav.style.height = endH + 'px';
        nav.addEventListener(
          'transitionend',
          () => {
            nav.style.height = '';
            nav.style.overflow = '';
          },
          { once: true },
        );
      }
    };
    burger.setAttribute('role', 'button');
    burger.setAttribute('aria-label', 'Menu');
    burger.addEventListener('click', () => setOpen(!open));
    burger.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        setOpen(!open);
      }
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && open) setOpen(false);
    });
    window.matchMedia('(min-width: 1200px)').addEventListener('change', (e) => {
      if (e.matches && open) setOpen(false);
    });
  });
}

/* ------------------------------------------------------------ slideshows */
function initSlideshows() {
  $$('section[style*="opacity:0.001"]').forEach((section) => {
    const ul = section.querySelector('ul');
    if (!ul || ul.children.length < 2) return;
    section.style.opacity = '1';
    ul.classList.add('lk-slides');
    const vertical = getComputedStyle(ul).flexDirection === 'column';
    const gap = parseFloat(getComputedStyle(ul).gap) || 0;
    let index = Math.min(2, ul.children.length - 1);
    let animating = false;
    const slideOf = (li) => li.firstElementChild;
    const size = () => (vertical ? ul.parentElement.clientHeight : ul.parentElement.clientWidth);
    const apply = (instant) => {
      const offset = -(index * (size() + gap));
      ul.classList.toggle('lk-no-transition', !!instant);
      ul.style.transform = vertical ? `translateY(${offset}px)` : `translateX(${offset}px)`;
      if (instant) void ul.offsetWidth;
      ul.classList.remove('lk-no-transition');
      Array.from(ul.children).forEach((li, i) => {
        const s = slideOf(li);
        if (!s) return;
        s.style.visibility = 'visible';
        s.style.transform = i === index ? 'none' : 'scale(0.95)';
      });
    };
    const next = () => {
      if (animating || document.hidden || !section.isConnected) return;
      animating = true;
      index += 1;
      apply(false);
      setTimeout(() => {
        // Recycle the first slide so the loop is endless.
        ul.appendChild(ul.firstElementChild);
        index -= 1;
        apply(true);
        animating = false;
      }, 1250);
    };
    apply(true);
    window.addEventListener('resize', () => apply(true));
    if (!reduceMotion) setInterval(next, 4000);
  });
}

/* ------------------------------------------------------ step progress bar */
function initProgress() {
  const bars = $$('[data-framer-name="progress"]')
    .map((track) => ({ track, fill: track.firstElementChild, step: track.parentElement?.parentElement }))
    .filter((b) => b.fill && b.step);
  if (!bars.length) return;
  const update = () => {
    const vh = window.innerHeight;
    for (const { fill, step } of bars) {
      const r = step.getBoundingClientRect();
      if (r.height === 0) continue;
      const p = Math.min(1, Math.max(0, (vh * 0.62 - r.top) / r.height));
      fill.style.transform = `translateY(${(-(1 - p) * 100).toFixed(2)}%)`;
    }
  };
  window.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update);
  update();
}

/* ---------------------------------------------------------- nested links */
function initNestedLinks() {
  const go = (href, rel, target) => {
    const a = document.createElement('a');
    a.href = href;
    a.target = target;
    a.rel = rel;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };
  $$('[data-nested-link]').forEach((el) => {
    el.addEventListener('click', (e) => {
      const href = el.getAttribute('href');
      if (!href) return;
      e.preventDefault();
      e.stopPropagation();
      const newTab = /Mac|iPod|iPhone|iPad/u.test(navigator.userAgent) ? e.metaKey : e.ctrlKey;
      go(href, el.getAttribute('rel') ?? '', newTab ? '_blank' : el.getAttribute('target') ?? '');
    });
  });
}

/* ------------------------------------------------------------------ year */
function initYear() {
  const year = String(new Date().getFullYear());
  $$('[data-framer-name="Dynamic current year"] p').forEach((p) => {
    p.textContent = p.textContent.replace(/\d{4}/, year);
  });
}

/* ----------------------------------------------------------------- forms */
function initForms() {
  $$('form').forEach((form) => {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (form.hasAttribute('data-lk-busy')) return;
      const data = {};
      new FormData(form).forEach((v, k) => {
        if (k) data[k] = v;
      });
      // Honeypot fields Framer added: hidden inputs must stay empty.
      const trap = $$('input[aria-hidden="true"]', form).some((i) => i.value);
      const msg = form.querySelector('.lk-form-message') || form.appendChild(Object.assign(document.createElement('p'), { className: 'lk-form-message' }));
      const isNewsletter = form.querySelector('input[type="email"]') && !form.querySelector('textarea');
      const say = (text, state) => {
        msg.textContent = text;
        msg.dataset.state = state;
      };
      if (trap) return say('Thanks!', 'ok');
      const mailto = () => {
        const subject = isNewsletter ? 'Newsletter subscription' : 'Contact request from linkable.link';
        const body = Object.entries(data)
          .filter(([k, v]) => /^[A-Z]/.test(k) && String(v).trim())
          .map(([k, v]) => `${k}: ${v}`)
          .join('\n');
        location.href = `mailto:${FALLBACK_MAILTO}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        say('Opening your mail client…', 'ok');
      };
      if (!FORM_ENDPOINT) return mailto();
      form.setAttribute('data-lk-busy', '');
      try {
        const res = await fetch(FORM_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ ...data, form: isNewsletter ? 'newsletter' : 'contact', page: location.pathname }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        form.reset();
        say(isNewsletter ? 'You are subscribed. Thanks!' : 'Message sent. We will get back to you shortly.', 'ok');
      } catch (err) {
        // Endpoint unreachable or not configured: hand over to the mail client.
        mailto();
      } finally {
        form.removeAttribute('data-lk-busy');
      }
    });
    // Framer toggles this class to style empty/filled inputs.
    $$('.framer-form-input', form).forEach((input) => {
      const sync = () => input.classList.toggle('framer-form-input-empty', !input.value);
      input.addEventListener('input', sync);
      sync();
    });
  });
}

/* ----------------------------------------------------------------- boot */
function boot() {
  initYear();
  initNestedLinks();
  initAppear();
  initFaq();
  initMobileMenu();
  initSlideshows();
  initProgress();
  initForms();
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
