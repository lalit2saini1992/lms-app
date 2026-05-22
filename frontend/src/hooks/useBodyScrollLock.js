import { useEffect } from 'react';
import useModalStore from '../store/modalStore';

/**
 * iOS Safari compatible scroll lock.
 * Also hides bottom nav when modal is open.
 */
export default function useBodyScrollLock(isLocked) {
  const { openModal, closeModal } = useModalStore();

  useEffect(() => {
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
      closeModal();
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
