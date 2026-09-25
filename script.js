/* واجهة الموقع — القائمة، الظهور عند التمرير، العدّادات، النموذج */

const nav = document.getElementById('nav');
const burger = document.getElementById('burger');
burger.addEventListener('click', () => {
  const open = nav.classList.toggle('open');
  burger.setAttribute('aria-expanded', String(open));
});
document.getElementById('navLinks').addEventListener('click', e => {
  if (e.target.tagName === 'A') { nav.classList.remove('open'); burger.setAttribute('aria-expanded', 'false'); }
});

/* الظهور التدريجي */
const io = new IntersectionObserver(es => {
  es.forEach(en => { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
}, { threshold: 0.1, rootMargin: '0px 0px -50px' });
document.querySelectorAll('.rv').forEach((el, i) => {
  el.style.transitionDelay = (i % 3) * 80 + 'ms';
  io.observe(el);
});

/* توهّج يتبع المؤشر داخل البطاقات */
document.querySelectorAll('.card').forEach(c => {
  c.addEventListener('pointermove', e => {
    const r = c.getBoundingClientRect();
    c.style.setProperty('--mx', (e.clientX - r.left) + 'px');
    c.style.setProperty('--my', (e.clientY - r.top) + 'px');
  });
});

/* عدّاد الأرقام */
const numIO = new IntersectionObserver(es => {
  es.forEach(en => {
    if (!en.isIntersecting) return;
    const el = en.target, raw = el.textContent.trim();
    const target = parseInt(raw.replace(/[^\d]/g, ''), 10);
    const suffix = /\+$/.test(raw) ? '+' : '';
    const grouped = raw.includes(',');
    let t0 = null;
    const step = ts => {
      if (!t0) t0 = ts;
      const p = Math.min((ts - t0) / 1200, 1);
      const cur = Math.round(target * (1 - Math.pow(1 - p, 3)));
      el.textContent = (grouped ? cur.toLocaleString('en-US') : cur) + suffix;
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
    numIO.unobserve(el);
  });
}, { threshold: 0.6 });
if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
  document.querySelectorAll('.stat b').forEach(n => numIO.observe(n));
}

document.getElementById('year').textContent = new Date().getFullYear();
