export const JARVIS_MOBILE_MEDIA_QUERY = "(max-width: 767px)"

export function readIsMobileViewport(): boolean {
  if (typeof window === "undefined") return false
  return window.matchMedia(JARVIS_MOBILE_MEDIA_QUERY).matches
}