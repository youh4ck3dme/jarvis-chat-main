'use client'

import * as React from 'react'

type ThemeProviderProps = {
  children: React.ReactNode
  attribute?: string
  defaultTheme?: string
  enableSystem?: boolean
  forcedTheme?: string
}

/**
 * App is always dark (see app/layout.tsx: className="dark" + forcedTheme).
 * Passthrough provider avoids next-themes inline <script> warnings in React 19 / Next 16.
 */
export function ThemeProvider({ children }: ThemeProviderProps) {
  return <>{children}</>
}