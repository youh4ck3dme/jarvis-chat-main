import "@testing-library/jest-dom/vitest"
import { beforeEach, vi } from "vitest"

class MockAudio {
  static instances: MockAudio[] = []
  src = ""
  volume = 1
  play = vi.fn().mockResolvedValue(undefined)
  pause = vi.fn()

  constructor(src?: string) {
    if (src) this.src = src
    MockAudio.instances.push(this)
  }
}

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

Object.defineProperty(window, "Audio", {
  writable: true,
  value: MockAudio,
})

Object.defineProperty(globalThis, "Audio", {
  writable: true,
  value: MockAudio,
})

Object.defineProperty(URL, "createObjectURL", {
  writable: true,
  value: vi.fn(() => "blob:mock-url"),
})

Object.defineProperty(URL, "revokeObjectURL", {
  writable: true,
  value: vi.fn(),
})

beforeEach(() => {
  MockAudio.instances = []
  localStorage.clear()
})

export { MockAudio }