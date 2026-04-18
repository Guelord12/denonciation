import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UIState {
  sidebarOpen: boolean;
  darkMode: boolean;
  searchQuery: string;
  activeModal: string | null;
  modalData: any;
  toastMessage: string | null;
  toastType: 'success' | 'error' | 'info' | 'warning' | null;
  
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  toggleDarkMode: () => void;
  setDarkMode: (enabled: boolean) => void;
  setSearchQuery: (query: string) => void;
  openModal: (modalId: string, data?: any) => void;
  closeModal: () => void;
  showToast: (message: string, type: 'success' | 'error' | 'info' | 'warning') => void;
  hideToast: () => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarOpen: false,
      darkMode: false,
      searchQuery: '',
      activeModal: null,
      modalData: null,
      toastMessage: null,
      toastType: null,

      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      
      toggleDarkMode: () => set((state) => {
        const newDarkMode = !state.darkMode;
        if (newDarkMode) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
        return { darkMode: newDarkMode };
      }),
      
      setDarkMode: (enabled) => {
        if (enabled) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
        set({ darkMode: enabled });
      },
      
      setSearchQuery: (query) => set({ searchQuery: query }),
      
      openModal: (modalId, data) => set({ activeModal: modalId, modalData: data }),
      
      closeModal: () => set({ activeModal: null, modalData: null }),
      
      showToast: (message, type) => set({ toastMessage: message, toastType: type }),
      
      hideToast: () => set({ toastMessage: null, toastType: null }),
    }),
    {
      name: 'ui-storage',
      partialize: (state) => ({
        darkMode: state.darkMode,
      }),
    }
  )
);

// Initialize dark mode from storage
if (typeof window !== 'undefined') {
  const stored = localStorage.getItem('ui-storage');
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      if (parsed.state?.darkMode) {
        document.documentElement.classList.add('dark');
      }
    } catch (e) {
      // Ignore
    }
  }
}