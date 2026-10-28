import { useEffect } from 'react';
import { gsap, ScrollTrigger, prefersReducedMotion } from './motion';

/** Pops split text in (words/chars rise out of their masks). */
export function popText(root: Element | null, opts: { delay?: number; stagger?: number; duration?: number } = {}) {
  if (!root) return;
  const items = root.querySelectorAll('.split__item');
  if (prefersReducedMotion()) { gsap.set(items, { yPercent: 0, rotate: 0, opacity: 1 }); return; }
  gsap.fromTo(items, { yPercent: 115, rotate: 7, opacity: 0 }, {
    yPercent: 0, rotate: 0, opacity: 1, duration: opts.duration ?? 1.05, ease: 'expo.out',
    stagger: opts.stagger ?? 0.045, delay: opts.delay ?? 0,
  });
}

/**
 * Site-wide scroll reveals:
 *  [data-reveal]      fade + rise
 *  [data-pop]         scale pop with overshoot
 *  [data-split]       split-text pop when it enters the viewport
 *  [data-wipe]        image clip-path wipe
 */
export function useScrollReveals() {
  useEffect(() => {
    if (prefersReducedMotion()) return;
    const ctx = gsap.context(() => {
      if (document.querySelector('[data-reveal]')) ScrollTrigger.batch('[data-reveal]', {
        start: 'top 88%', once: true,
        onEnter: (els) => gsap.fromTo(els, { y: 48, opacity: 0 }, { y: 0, opacity: 1, duration: 1.1, ease: 'expo.out', stagger: 0.09 }),
      });
      if (document.querySelector('[data-pop]')) ScrollTrigger.batch('[data-pop]', {
        start: 'top 90%', once: true,
        onEnter: (els) => gsap.fromTo(els, { scale: 0.6, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.9, ease: 'back.out(2)', stagger: 0.07 }),
      });
      gsap.utils.toArray<HTMLElement>('[data-split]').forEach((el) => {
        gsap.set(el.querySelectorAll('.split__item'), { yPercent: 115, opacity: 0 });
        ScrollTrigger.create({ trigger: el, start: 'top 88%', once: true, onEnter: () => popText(el) });
      });
      gsap.utils.toArray<HTMLElement>('[data-wipe]').forEach((el) => {
        gsap.fromTo(el, { clipPath: 'inset(100% 0% 0% 0%)' }, {
          clipPath: 'inset(0% 0% 0% 0%)', duration: 1.4, ease: 'expo.inOut',
          scrollTrigger: { trigger: el, start: 'top 85%', once: true },
        });
        const img = el.querySelector('img');
        if (img) gsap.fromTo(img, { scale: 1.35 }, { scale: 1, duration: 1.8, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 85%', once: true } });
      });
    });
    // Images loading later can change layout heights.
    const refresh = () => ScrollTrigger.refresh();
    window.addEventListener('load', refresh);
    return () => { window.removeEventListener('load', refresh); ctx.revert(); };
  }, []);
}

/** Counts a number up when it scrolls into view. */
export function countUp(el: HTMLElement | null, to: number) {
  if (!el) return;
  const fmt = (n: number) => Math.round(n).toLocaleString('en-GB');
  if (prefersReducedMotion()) { el.textContent = fmt(to); return; }
  const o = { v: 0 };
  gsap.to(o, { v: to, duration: 1.6, ease: 'power3.out', onUpdate: () => { el.textContent = fmt(o.v); } });
}
