import { create } from 'zustand';

// Global modal state — when any modal is open, bottom nav hides
const useModalStore = create((set) => ({
  isModalOpen: false,
  openModal: () => set({ isModalOpen: true }),
  closeModal: () => set({ isModalOpen: false }),
}));

export default useModalStore;
