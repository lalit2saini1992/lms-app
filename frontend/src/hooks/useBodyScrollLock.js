import { useEffect } from 'react';

/**
 * iOS Safari compatible body scroll lock.
 * Uses touchmove prevention instead of position:fixed which breaks iOS.
 */
export default function useBodyScrollLock(isLocked) {
  useEffect(() => {
    if (!isLocked) return;

    // Save current scroll position
    const scrollY = window.scrollY;

    // Prevent touchmove on body (iOS Safari fix)
    const preventScroll = (e) => {
      // Allow scroll inside elements that have overflow scroll
      let el = e.target;
      while (el && el !== document.body) {
        const style = window.getComputedStyle(el);
        const overflow = style.overflow + style.overflowY;
        if (overflow.includes('scroll') || overflow.includes('auto')) {
          return; // allow scroll inside modal content
        }
        el = el.parentElement;
      }
      e.preventDefault();
    };

    document.addEventListener('touchmove', preventScroll, { passive: false });

    return () => {
      document.removeEventListener('touchmove', preventScroll);
    };
  }, [isLocked]);
}
