import { useEffect, useRef } from 'react';
import useModalStore from '../store/modalStore';

/**
 * iOS Safari compatible scroll lock.
 * Hides bottom nav when modal is open.
 * Uses ref to avoid redundant store updates.
 */
export default function useBodyScrollLock(isLocked) {
  const { openModal, closeModal } = useModalStore();
  const wasLocked = useRef(false);

  useEffect(() => {
    // Only act when state actually changes
    if (isLocked === wasLocked.current) return;
    wasLocked.current = isLocked;

    if (!isLocked) {
      closeModal();
      return;
    }

    openModal();

    const scrollY = window.scrollY;
    const html = document.documentElement;
    const body = document.body;

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
