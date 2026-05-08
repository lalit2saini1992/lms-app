import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useThemeStore = create(
  persist(
    (set) => ({
      theme: 'light', // default light
      toggleTheme: () => set((s) => {
        const next = s.theme === 'light' ? 'dark' : 'light';
        // Apply immediately to DOM
        const html = document.documentElement;
        html.classList.remove('dark', 'light');
        if (next === 'dark') html.classList.add('dark');
        html.style.backgroundColor = next === 'dark' ? '#0f172a' : '#f1f5f9';
        document.body.style.backgroundColor = next === 'dark' ? '#0f172a' : '#f1f5f9';
        return { theme: next };
      }),
    }),
    {
      name: 'lms-theme',
      // On rehydrate, apply theme to DOM
      onRehydrateStorage: () => (state) => {
        if (state) {
          const html = document.documentElement;
          html.classList.remove('dark', 'light');
          if (state.theme === 'dark') html.classList.add('dark');
          html.style.backgroundColor = state.theme === 'dark' ? '#0f172a' : '#f1f5f9';
          document.body.style.backgroundColor = state.theme === 'dark' ? '#0f172a' : '#f1f5f9';
        }
      },
    }
  )
);

export default useThemeStore;
