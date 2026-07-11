export type WebAppManifest = {
  name: string
  short_name: string
  description: string
  id: string
  start_url: string
  scope: string
  display: string
  orientation?: string
  theme_color: string
  background_color: string
  icons: Array<{
    src: string
    sizes: string
    type: string
    purpose?: string
  }>
  shortcuts?: Array<{
    name: string
    short_name?: string
    url: string
    icons?: Array<{ src: string; sizes: string; type: string }>
  }>
}

export const REQUIRED_MANIFEST_ICON_SIZES = ["192x192", "512x512"] as const

export function validateWebManifest(manifest: WebAppManifest): string[] {
  const errors: string[] = []

  if (!manifest.name?.trim()) errors.push("name is required")
  if (!manifest.short_name?.trim()) errors.push("short_name is required")
  if (!manifest.start_url?.startsWith("/")) errors.push("start_url must be a path")
  if (!manifest.scope?.startsWith("/")) errors.push("scope must be a path")
  if (!manifest.display) errors.push("display is required")

  for (const size of REQUIRED_MANIFEST_ICON_SIZES) {
    const hasSize = manifest.icons?.some((icon) => icon.sizes === size)
    if (!hasSize) errors.push(`missing icon size ${size}`)
  }

  const hasMaskable = manifest.icons?.some((icon) => icon.purpose?.includes("maskable"))
  if (!hasMaskable) errors.push("missing maskable icon")

  return errors
}