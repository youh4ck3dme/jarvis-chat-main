import { expect, type Page } from "@playwright/test"

export const IPHONE_17_AIR_VIEWPORT = { width: 420, height: 912 } as const
export const MIN_TOUCH_TARGET = 44

export type RectMetrics = {
  top: number
  bottom: number
  left: number
  right: number
  width: number
  height: number
}

export type TouchTargetMetrics = {
  selector: string
  size: number
}

export type IphoneLayoutMetrics = {
  viewportWidth: number
  viewportHeight: number
  scrollWidth: number
  clientWidth: number
  header: RectMetrics | null
  emptyState: RectMetrics | null
  footer: RectMetrics | null
  composer: RectMetrics | null
  touchTargets: TouchTargetMetrics[]
}

export async function gotoIphoneChatEmptyState(page: Page): Promise<void> {
  await page.setViewportSize(IPHONE_17_AIR_VIEWPORT)
  await page.goto("/chat")
  await page.waitForSelector('[data-testid="jarvis-empty-state"]', { timeout: 30_000 })
  await page.waitForFunction(
    () => {
      const emptyState = document.querySelector('[data-testid="jarvis-empty-state"]')
      if (!emptyState) return false
      return emptyState.getBoundingClientRect().width >= 400
    },
    undefined,
    { timeout: 15_000 },
  )
}

export async function collectIphoneLayoutMetrics(page: Page): Promise<IphoneLayoutMetrics> {
  return page.evaluate((minTarget) => {
    const pick = (selector: string) => {
      const element = document.querySelector(selector)
      if (!element) return null
      const rect = element.getBoundingClientRect()
      return {
        top: Math.round(rect.top),
        bottom: Math.round(rect.bottom),
        left: Math.round(rect.left),
        right: Math.round(rect.right),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
      }
    }

    const root = document.querySelector(".jarvis-workspace") ?? document.body
    const selectors = [
      '[aria-label="Open workspace menu"]',
      '[data-testid="jarvis-mode-chat"]',
      '[data-testid="jarvis-mode-builder"]',
      '[aria-label="Open settings"]',
    ]

    return {
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      scrollWidth: root.scrollWidth,
      clientWidth: root.clientWidth,
      header: pick('[data-testid="workspace-header"]'),
      emptyState: pick('[data-testid="jarvis-empty-state"]'),
      footer: pick('[data-testid="workspace-footer"]'),
      composer: pick(".jarvis-composer-shell") ?? pick('[aria-label="Message input"]'),
      touchTargets: selectors.map((selector) => {
        const element = document.querySelector(selector)
        if (!element) return { selector, size: 0 }
        const rect = element.getBoundingClientRect()
        return {
          selector,
          size: Math.round(Math.max(rect.width, rect.height)),
        }
      }),
    }
  }, MIN_TOUCH_TARGET)
}

export function assertIphoneLayoutMetrics(
  metrics: IphoneLayoutMetrics,
  viewportWidth = IPHONE_17_AIR_VIEWPORT.width,
): void {
  expect(metrics.viewportWidth).toBe(viewportWidth)
  expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.clientWidth + 1)

  expect(metrics.header).not.toBeNull()
  expect(metrics.emptyState).not.toBeNull()
  expect(metrics.footer).not.toBeNull()
  expect(metrics.composer).not.toBeNull()

  expect(metrics.header!.bottom).toBeLessThanOrEqual(metrics.emptyState!.top + 2)
  expect(metrics.emptyState!.bottom).toBeLessThanOrEqual(metrics.footer!.top + 2)
  expect(metrics.footer!.bottom).toBe(metrics.viewportHeight)
  expect(metrics.composer!.width).toBeGreaterThanOrEqual(metrics.viewportWidth - 4)

  for (const region of [metrics.header, metrics.emptyState, metrics.footer, metrics.composer]) {
    expect(region!.left).toBeGreaterThanOrEqual(0)
    expect(region!.right).toBeLessThanOrEqual(metrics.viewportWidth + 1)
  }

  for (const target of metrics.touchTargets) {
    expect(target.size, `${target.selector} touch size ${target.size}px`).toBeGreaterThanOrEqual(
      MIN_TOUCH_TARGET - 1,
    )
  }
}