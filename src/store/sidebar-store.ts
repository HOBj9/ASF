import { create } from 'zustand'

interface SidebarState {
  isOpen: boolean
  /** When true, sidebar state is fixed (no hover open/close). When false, hover opens and leave closes. */
  isPinned: boolean
  toggle: () => void
  open: () => void
  close: () => void
  /** Toggle pin: pin current state (open/closed) or unpin to restore hover behavior. */
  togglePin: () => void
}

export const useSidebarStore = create<SidebarState>((set) => ({
  isOpen: false,
  isPinned: false,
  toggle: () => set((state) => ({ isOpen: !state.isOpen })),
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
  togglePin: () => set((state) => ({ isPinned: !state.isPinned })),
}))

