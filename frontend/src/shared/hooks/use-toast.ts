import { create } from 'zustand';

interface ToastState {
  message: string;
  show: (message: string) => void;
  hide: () => void;
}

export const useToast = create<ToastState>()((set) => ({
  message: '',
  show: (message) => set({ message }),
  hide: () => set({ message: '' }),
}));
