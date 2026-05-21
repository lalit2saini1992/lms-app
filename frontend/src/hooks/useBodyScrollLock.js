import { useEffect } from 'react';

/**
 * iOS Safari compatible scroll lock.
 * Saves scroll position and uses position:fixed on html element (not body).
 * This is the most reliable approach for iOS Safari.
 */
export default function useBodyScrollLock(isLocked) {
  useEffect(() => {
    if (!isLocked) return;

    const html = document.documentElement;
    const body = document.body;
    const scrollY = window.scrollY;

    // Apply to both html and body for maximum iOS compatibility
    html.style.overflow = 'hidden';
    html.style.height = '100%';
    body.style.overflow = 'hidden';
    body.style.position = 'fixed';
    body.style.top = `-${scrollY}px`;
    body.style.width = '100%';

    return () => {
      html.style.overflow = '';
      html.style.height = '';
      body.style.overflow = '';
      body.style.position = '';
      body.style.top = '';
      body.style.width = '';
      window.scrollTo(0, scrollY);
    };
  }, [isLocked]);
}
