import { create } from 'zustand';

interface LogoutState {
  isLoggingOut: boolean;
  setIsLoggingOut: (value: boolean) => void;
}

export const useLogoutStore = create<LogoutState>((set) => ({
  isLoggingOut: false,
  setIsLoggingOut: (value) => set({ isLoggingOut: value }),
}));
