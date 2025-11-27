// Type declarations for path aliases used in the frontend
declare module '@/lib/*'

// Provide a minimal signature for utils used across the app
declare module '@/lib/utils' {
  export function cn(...inputs: any[]): string
}

// Third-party modules (minimal declarations) - prevents TS from erroring during development
declare module 'next-themes'
declare module '@radix-ui/*'
declare module 'react-day-picker'
declare module 'embla-carousel-react'
declare module 'cmdk'
declare module 'vaul'
declare module 'input-otp'
declare module 'react-resizable-panels'
declare module 'sonner'

