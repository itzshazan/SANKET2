import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(useGSAP);

const CLEAR = 'transform,opacity,visibility';

export function useAuthMotion(root, screenKey) {
  useGSAP((context, contextSafe) => {
    const select = gsap.utils.selector(root);
    const formItems = select('.au-card .au-field, .au-card .au-google, .au-card .au-or, .au-card .au-stepper, .au-card .au-row, .au-card .au-switch, .au-card .au-timeline > li, .au-card .au-summary, .au-card > .au-btn, .au-card form > .au-btn, .au-card .au-help, .au-card .au-setup');
    const intro = gsap.timeline({ defaults: { ease: 'power3.out', clearProps: CLEAR } });
    intro
      .from(select('.au-top'), { y: -10, autoAlpha: 0, duration: 0.55 }, 0)
      .from(select('.au-head > *'), { y: 18, autoAlpha: 0, duration: 0.75, stagger: 0.08 }, 0.08);
    if (formItems.length) intro.from(formItems, { y: 12, autoAlpha: 0, duration: 0.6, stagger: 0.045 }, 0.2);
    if (root.current.querySelector('.au-panel')?.getBoundingClientRect().width) {
      intro
        .from(select('.au-panel-mid > *'), { y: 20, autoAlpha: 0, duration: 0.85, stagger: 0.1 }, 0.12)
        .from(select('.au-panel-cards'), { y: 24, autoAlpha: 0, duration: 0.9 }, 0.35);
    }

    // Delegation also covers controls introduced by pagination and search.
    const onOver = contextSafe((event) => {
      const card = event.target.closest('.au-role');
      if (!card || card.contains(event.relatedTarget)) return;
      gsap.to(card.querySelector('.ic'), { scale: 1.08, duration: 0.25, ease: 'power2.out', overwrite: 'auto' });
    });
    const onOut = contextSafe((event) => {
      const card = event.target.closest('.au-role');
      if (!card || card.contains(event.relatedTarget)) return;
      gsap.to(card.querySelector('.ic'), { scale: 1, duration: 0.3, ease: 'power2.out', overwrite: 'auto', clearProps: 'transform' });
    });
    const onSelect = contextSafe((event) => {
      const chip = event.target.closest('.au-chip');
      if (!chip) return;
      gsap.fromTo(chip, { scale: 0.96 }, { scale: 1, duration: 0.3, ease: 'power2.out', overwrite: 'auto', clearProps: 'transform' });
    });
    const element = root.current;
    element.addEventListener('pointerover', onOver);
    element.addEventListener('pointerout', onOut);
    element.addEventListener('click', onSelect);
    return () => {
      element.removeEventListener('pointerover', onOver);
      element.removeEventListener('pointerout', onOut);
      element.removeEventListener('click', onSelect);
    };
  }, { scope: root, dependencies: [screenKey], revertOnUpdate: true });
}
