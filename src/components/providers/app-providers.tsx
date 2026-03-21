"use client"

import { SessionProvider } from "./session-provider"
import { ThemeProvider } from "next-themes"
import { QueryProvider } from "./query-provider"
import { ErrorBoundary } from "@/components/error-boundary"
import { ChunkLoadRecovery } from "@/components/chunk-load-recovery"
import { Toaster } from "react-hot-toast"

const toastBaseStyle: React.CSSProperties = {
  borderRadius: '0.875rem',
  padding: '1.25rem 1.5rem',
  direction: 'rtl',
  textAlign: 'right',
  display: 'flex',
  flexDirection: 'row-reverse',
  alignItems: 'center',
  gap: '1rem',
  minWidth: '320px',
  maxWidth: '420px',
  fontSize: '0.9375rem',
  fontWeight: '500',
  backdropFilter: 'blur(8px)',
  transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
}

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <ChunkLoadRecovery />
      <ErrorBoundary>
        <QueryProvider>
          <SessionProvider>
            {children}
            <Toaster
              position="bottom-center"
              containerStyle={{ bottom: '2rem' }}
              toastOptions={{
                duration: 6000,
                style: {
                  ...toastBaseStyle,
                  background: 'hsl(var(--background))',
                  color: 'hsl(var(--foreground))',
                  border: '1px solid hsl(var(--border))',
                  boxShadow: '0 20px 60px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(0, 0, 0, 0.05)',
                },
                success: {
                  duration: 6000,
                  iconTheme: {
                    primary: 'hsl(var(--toast-success-text))',
                    secondary: 'hsl(var(--toast-success-bg))',
                  },
                  style: {
                    ...toastBaseStyle,
                    background: 'hsl(var(--toast-success-bg))',
                    color: 'hsl(var(--toast-success-text))',
                    border: '1px solid hsl(var(--toast-success-border))',
                    boxShadow: '0 20px 60px hsl(var(--toast-success-bg) / 0.4), 0 0 0 1px hsl(var(--toast-success-border) / 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                  },
                },
                error: {
                  duration: 6000,
                  iconTheme: {
                    primary: 'hsl(var(--toast-error-text))',
                    secondary: 'hsl(var(--toast-error-bg))',
                  },
                  style: {
                    ...toastBaseStyle,
                    background: 'hsl(var(--toast-error-bg))',
                    color: 'hsl(var(--toast-error-text))',
                    border: '1px solid hsl(var(--toast-error-border))',
                    boxShadow: '0 20px 60px hsl(var(--toast-error-bg) / 0.4), 0 0 0 1px hsl(var(--toast-error-border) / 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                  },
                },
              }}
            />
          </SessionProvider>
        </QueryProvider>
      </ErrorBoundary>
    </ThemeProvider>
  )
}
