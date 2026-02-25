import { create } from 'zustand'

interface SidebarState {
  isOpen: boolean
  toggle: () => void
  open: () => void
  close: () => void
}

// Start collapsed (icon-only) by default; user can expand
const getInitialState = (): boolean => {
  return false
}

export const useSidebarStore = create<SidebarState>((set) => ({
  isOpen: getInitialState(),
  toggle: () => set((state) => ({ isOpen: !state.isOpen })),
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
}))

