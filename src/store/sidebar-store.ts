import { create } from 'zustand'

interface SidebarState {
  isOpen: boolean
  toggle: () => void
  open: () => void
  close: () => void
}

// Initialize based on screen size
const getInitialState = (): boolean => {
  if (typeof window === 'undefined') return true
  return window.innerWidth >= 1024
}

export const useSidebarStore = create<SidebarState>((set) => ({
  isOpen: getInitialState(),
  toggle: () => {
    set((state) => {
      // On desktop (lg and above), always keep sidebar open
      if (typeof window !== 'undefined' && window.innerWidth >= 1024) {
        return { isOpen: true }
      }
      // On mobile, toggle the state
      return { isOpen: !state.isOpen }
    })
  },
  open: () => set({ isOpen: true }),
  close: () => {
    // On desktop, don't allow closing
    if (typeof window !== 'undefined' && window.innerWidth >= 1024) {
      return
    }
    set({ isOpen: false })
  },
}))

