import { expect, type Page } from "@playwright/test"

import {
  IPHONE_17_AIR_VIEWPORT,
  MIN_TOUCH_TARGET,
  type RectMetrics,
} from "./iphone-layout"

/** Strict pixel tolerance — layout must be even within ±1px. */
export const PIXEL_TOLERANCE = 1

export type ControlRect = RectMetrics & {
  label: string
}

export type StarterChipRect = RectMetrics & {
  label: string
}

export type IphonePixelPerfectMetrics = {
  viewport: { width: number; height: number }
  workspace: RectMetrics
  header: RectMetrics
  emptyState: RectMetrics
  footer: RectMetrics
  composerShell: RectMetrics
  messageInput: RectMetrics
  modeControl: RectMetrics
  menuButton: RectMetrics
  settingsButton: RectMetrics
  landingOrb: RectMetrics
  landingTitle: RectMetrics
  vertical: {
    headerToContentGap: number
    contentToFooterGap: number
    regionHeightSum: number
    composerBottomInset: number
  }
  symmetry: {
    headerLeftInset: number
    headerRightInset: number
    headerInsetDelta: number
    modeControlViewportOffset: number
    landingOrbCenterOffset: number
    landingTitleCenterOffset: number
    composerShellPaddingLeft: number
    composerShellPaddingRight: number
    composerShellPaddingDelta: number
    starterRowLeftInset: number
    starterRowRightInset: number
    starterRowInsetDelta: number
  }
  composerControls: ControlRect[]
  starterChips: StarterChipRect[]
  starterChipGaps: number[]
}

function roundRect(rect: DOMRect): RectMetrics {
  return {
    top: Math.round(rect.top),
    bottom: Math.round(rect.bottom),
    left: Math.round(rect.left),
    right: Math.round(rect.right),
    width: Math.round(rect.width),
    height: Math.round(rect.height),
  }
}

function centerX(rect: RectMetrics): number {
  return Math.round((rect.left + rect.right) / 2)
}

function pickRect(selector: string): RectMetrics | null {
  const element = document.querySelector(selector)
  if (!element) return null
  return roundRect(element.getBoundingClientRect())
}

function pickControl(selector: string, label: string): ControlRect | null {
  const rect = pickRect(selector)
  if (!rect) return null
  return { ...rect, label }
}

export async function collectIphonePixelPerfectMetrics(page: Page): Promise<IphonePixelPerfectMetrics> {
  return page.evaluate(() => {
    const roundRect = (rect: DOMRect) => ({
      top: Math.round(rect.top),
      bottom: Math.round(rect.bottom),
      left: Math.round(rect.left),
      right: Math.round(rect.right),
      width: Math.round(rect.width),
      height: Math.round(rect.height),
    })

    const pick = (selector: string) => {
      const element = document.querySelector(selector)
      if (!element) return null
      return roundRect(element.getBoundingClientRect())
    }

    const pickControl = (selector: string, label: string) => {
      const rect = pick(selector)
      if (!rect) return null
      return { ...rect, label }
    }

    const viewport = {
      width: window.innerWidth,
      height: window.innerHeight,
    }

    const workspace = pick(".jarvis-workspace")!
    const header = pick('[data-testid="workspace-header"]')!
    const emptyState = pick('[data-testid="jarvis-empty-state"]')!
    const footer = pick('[data-testid="workspace-footer"]')!
    const composerShell = pick(".jarvis-composer-shell")!
    const messageInput = pick('[aria-label="Message input"]')!
    const modeControl = pick('[data-testid="jarvis-mode-control"]')!
    const menuButton = pick('[aria-label="Open workspace menu"]')!
    const settingsButton = pick('[aria-label="Open settings"]')!
    const landingOrb = pick('[data-testid="animated-orb"]') ?? pick(".orb-static")!
    const landingTitle = pick('[data-testid="jarvis-empty-state"] p')!

    const composerControlSelectors = [
      ['[aria-label="Add attachment"]', "attachment"],
      ['[aria-label="More options"]', "more"],
      ['[aria-label="Start voice input"], [aria-label="Stop recording"]', "voice"],
      ['[aria-label="Send message"]', "send"],
    ] as const

    const composerControls = composerControlSelectors
      .map(([selector, label]) => pickControl(selector, label))
      .filter((item): item is ControlRect => item !== null)

    const starterChips = Array.from(document.querySelectorAll(".jarvis-starter-chip")).map(
      (chip, index) => ({
        ...roundRect(chip.getBoundingClientRect()),
        label: chip.textContent?.trim() || `chip-${index}`,
      }),
    )

    const starterChipGaps: number[] = []
    for (let index = 0; index < starterChips.length - 1; index += 1) {
      const current = starterChips[index]
      const next = starterChips[index + 1]
      if (Math.abs(current.top - next.top) <= 1) {
        starterChipGaps.push(next.left - current.right)
      }
    }

    const headerToContentGap = emptyState.top - header.bottom
    const contentToFooterGap = footer.top - emptyState.bottom
    const regionHeightSum = header.height + emptyState.height + footer.height
    const composerBottomInset = viewport.height - composerShell.bottom

    const headerLeftInset = menuButton.left
    const headerRightInset = viewport.width - settingsButton.right
    const headerInsetDelta = Math.abs(headerLeftInset - headerRightInset)

    const viewportCenter = viewport.width / 2
    const modeControlViewportOffset = Math.abs(
      Math.round((modeControl.left + modeControl.right) / 2) - viewportCenter,
    )
    const landingOrbCenterOffset = Math.abs(
      Math.round((landingOrb.left + landingOrb.right) / 2) - viewportCenter,
    )
    const landingTitleCenterOffset = Math.abs(
      Math.round((landingTitle.left + landingTitle.right) / 2) - viewportCenter,
    )

    const composerButtons = composerControls.filter((control) => control.label !== "send")
    const firstControl = composerButtons[0]
    const lastControl = composerControls[composerControls.length - 1]
    const composerShellPaddingLeft = firstControl ? firstControl.left - composerShell.left : 0
    const composerShellPaddingRight = lastControl ? composerShell.right - lastControl.right : 0
    const composerShellPaddingDelta = Math.abs(composerShellPaddingLeft - composerShellPaddingRight)

    const starterRowLeftInset =
      starterChips.length > 0 ? Math.min(...starterChips.map((chip) => chip.left)) : 0
    const starterRowRightInset =
      starterChips.length > 0 ? viewport.width - Math.max(...starterChips.map((chip) => chip.right)) : 0
    const starterRowInsetDelta = Math.abs(starterRowLeftInset - starterRowRightInset)

    return {
      viewport,
      workspace,
      header,
      emptyState,
      footer,
      composerShell,
      messageInput,
      modeControl,
      menuButton,
      settingsButton,
      landingOrb,
      landingTitle,
      vertical: {
        headerToContentGap,
        contentToFooterGap,
        regionHeightSum,
        composerBottomInset,
      },
      symmetry: {
        headerLeftInset,
        headerRightInset,
        headerInsetDelta,
        modeControlViewportOffset,
        landingOrbCenterOffset,
        landingTitleCenterOffset,
        composerShellPaddingLeft,
        composerShellPaddingRight,
        composerShellPaddingDelta,
        starterRowLeftInset,
        starterRowRightInset,
        starterRowInsetDelta,
      },
      composerControls,
      starterChips,
      starterChipGaps,
    }
  })
}

function expectWithin(value: number, expected: number, tolerance = PIXEL_TOLERANCE, label?: string) {
  const delta = Math.abs(value - expected)
  expect(delta, label ?? `expected ${value} ≈ ${expected} (±${tolerance}px)`).toBeLessThanOrEqual(
    tolerance,
  )
}

export function assertIphonePixelPerfectMetrics(metrics: IphonePixelPerfectMetrics): void {
  const { viewport } = metrics
  const T = PIXEL_TOLERANCE

  expect(viewport.width).toBe(IPHONE_17_AIR_VIEWPORT.width)
  expect(viewport.height).toBe(IPHONE_17_AIR_VIEWPORT.height)

  // ── Vertical stack: zero dead gaps, full viewport budget ──
  expect(metrics.header.top).toBe(0)
  expectWithin(metrics.vertical.headerToContentGap, 0, T, "header→content gap")
  expectWithin(metrics.vertical.contentToFooterGap, 0, T, "content→footer gap")
  expect(metrics.footer.bottom).toBe(viewport.height)
  expectWithin(metrics.vertical.regionHeightSum, viewport.height, T, "header+content+footer height")
  expectWithin(metrics.vertical.composerBottomInset, 0, T, "composer bottom inset")

  // ── Full-bleed horizontal rails ──
  for (const [label, region] of [
    ["workspace", metrics.workspace],
    ["header", metrics.header],
    ["emptyState", metrics.emptyState],
    ["footer", metrics.footer],
    ["composerShell", metrics.composerShell],
  ] as const) {
    expect(region.left, `${label} left`).toBe(0)
    expect(region.right, `${label} right`).toBe(viewport.width)
    expect(region.width, `${label} width`).toBe(viewport.width)
  }

  // ── Header symmetry: menu vs settings insets ──
  expectWithin(metrics.symmetry.headerInsetDelta, 0, T, "header left/right inset delta")

  // ── Mode control optically centered on viewport (3-col header grid) ──
  expect(metrics.symmetry.modeControlViewportOffset).toBeLessThanOrEqual(T + 1)
  expect(metrics.symmetry.landingOrbCenterOffset).toBeLessThanOrEqual(T + 1)
  expect(metrics.symmetry.landingTitleCenterOffset).toBeLessThanOrEqual(T + 1)

  // ── Composer docked inside footer, shell flush to bottom edge ──
  expect(metrics.composerShell.top).toBeGreaterThanOrEqual(metrics.footer.top)
  expect(metrics.composerShell.bottom).toBe(metrics.footer.bottom)
  expect(metrics.messageInput.left).toBeGreaterThan(metrics.composerShell.left)
  expect(metrics.messageInput.right).toBeLessThan(metrics.composerShell.right)

  // ── Composer internal padding even left/right ──
  expectWithin(metrics.symmetry.composerShellPaddingDelta, 0, T, "composer shell padding delta")

  // ── Composer action buttons uniform touch squares ──
  expect(metrics.composerControls.length).toBeGreaterThanOrEqual(4)
  const controlSizes = metrics.composerControls.map((control) => ({
    label: control.label,
    size: Math.max(control.width, control.height),
  }))
  const uniqueSizes = new Set(controlSizes.map((item) => item.size))
  expect(uniqueSizes.size, `composer controls must be uniform: ${JSON.stringify(controlSizes)}`).toBe(1)
  expect(controlSizes[0]?.size).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET - 1)

  // ── Starter chips: equal height + even 8px gaps on one row ──
  expect(metrics.starterChips.length).toBe(3)
  const chipHeights = metrics.starterChips.map((chip) => chip.height)
  expect(new Set(chipHeights).size, `starter chip heights: ${chipHeights.join(",")}`).toBe(1)
  expect(chipHeights[0]).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET - 1)
  expect(metrics.symmetry.starterRowInsetDelta).toBeLessThanOrEqual(T + 2)

  for (const gap of metrics.starterChipGaps) {
    expectWithin(gap, 8, T, "starter chip horizontal gap")
  }

  // ── Message input breathes between side controls (not crushed) ──
  expect(metrics.messageInput.width).toBeGreaterThanOrEqual(120)
}