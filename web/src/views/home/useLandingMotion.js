import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(useGSAP, ScrollTrigger);

// Product preference: motion always runs, including when OS reduced motion is on.
export function motionScrollBehavior() { return 'smooth'; }
const CLEAR_STYLES = 'transform,opacity,visibility';

export function useLandingMotion(root, enabled) {
  useGSAP(() => {
    if (!enabled) return;
    {
      const entrance = gsap.timeline({ defaults: { ease: 'power3.out', clearProps: CLEAR_STYLES } });
      entrance
        .from('.h-nav', { y: -16, autoAlpha: 0, duration: 0.65 }, 0)
        .from('.h-hero-content > *', { y: 28, autoAlpha: 0, duration: 0.9, stagger: 0.12 }, 0.12)
        .from('.h-hero-sun', { scale: 1.06, autoAlpha: 0.6, duration: 1.5 }, 0);

      // Animate headings and card content, leaving sticky ancestors in normal flow.
      root.current.querySelectorAll('section:not(.h-hero)').forEach((section) => {
        const headings = section.querySelectorAll(':scope > .h-eyebrow, :scope > h2, :scope > .h-lead, :scope > .h-segment');
        if (headings.length) {
          gsap.from(headings, {
            y: 22, autoAlpha: 0, duration: 0.75, stagger: 0.08, ease: 'power3.out',
            clearProps: CLEAR_STYLES,
            scrollTrigger: { trigger: section, start: 'clamp(top 88%)', once: true },
          });
        }
      });

      root.current.querySelectorAll('.h-aud-card, .h-feat-card, .h-acc-wide, .h-acc-card, .h-faq, .h-cta, .h-footer-top, .h-footer-card').forEach((card) => {
        // Feature-card positions also drive the active left-hand selection.
        // Move their children so that the scroll tracking geometry stays stable.
        const targets = card.classList.contains('h-feat-card') ? card.children : card;
        gsap.from(targets, {
          y: 24, autoAlpha: 0, duration: 0.8,
          stagger: card.classList.contains('h-feat-card') ? 0.06 : 0,
          ease: 'power3.out', clearProps: CLEAR_STYLES,
          scrollTrigger: { trigger: card, start: 'clamp(top 90%)', once: true },
        });
      });
    }

    // Async readings, audience tabs, FAQ expansion, fonts, and image loads can
    // change section heights. Refresh measurements without restarting animations.
    let mounted = true;
    let frame = 0;
    const refresh = () => {
      if (!mounted) return;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        frame = 0;
        if (mounted) ScrollTrigger.refresh();
      });
    };
    const observer = new ResizeObserver(refresh);
    observer.observe(root.current);
    const element = root.current;
    element.addEventListener('load', refresh, true);
    document.fonts?.ready.then(refresh);
    return () => {
      mounted = false;
      cancelAnimationFrame(frame);
      observer.disconnect();
      element.removeEventListener('load', refresh, true);
    };
  }, { scope: root, dependencies: [enabled], revertOnUpdate: true });
}

export function useAudienceMotion(root, activeTab, enabled) {
  useGSAP(() => {
    if (!enabled) return;
    {
      gsap.timeline({ defaults: { ease: 'power3.out', clearProps: CLEAR_STYLES } })
        .from('.h-aud-text > *', { y: 14, autoAlpha: 0, duration: 0.5, stagger: 0.045 })
        .from('.h-aud-img img', { scale: 1.045, autoAlpha: 0, duration: 0.7 }, 0);
    }
  }, { scope: root, dependencies: [activeTab, enabled], revertOnUpdate: true });
}

export function useLiveSnapshotMotion(root, hasData, enabled) {
  useGSAP(() => {
    if (!hasData) return;
    if (!enabled) return;
    {
      gsap.timeline({
        defaults: { ease: 'power3.out', clearProps: CLEAR_STYLES },
        scrollTrigger: { trigger: root.current, start: 'clamp(top 85%)', once: true },
      })
        .from('.h-live-status', { y: 14, autoAlpha: 0, duration: 0.6 })
        .from('.h-district-grid > li', { y: 28, autoAlpha: 0, duration: 0.75, stagger: 0.08 }, 0.12)
        .from('.h-live-foot', { y: 12, autoAlpha: 0, duration: 0.55 }, 0.5);
    }
  }, { scope: root, dependencies: [hasData, enabled], revertOnUpdate: true });
}
