import "fake-indexeddb/auto"

import "@testing-library/jest-dom/vitest"
import { beforeEach, vi } from "vitest"

// Polyfill localStorage if Node 22 native localStorage throws errors
try {
  if (typeof localStorage === "undefined" || !localStorage.setItem) {
    throw new Error("No localStorage");
  }
  localStorage.setItem("__test_ls_probe__", "1");
  localStorage.removeItem("__test_ls_probe__");
} catch {
  const store: Record<string, string> = {};
  const mockLocalStorage = {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: any) => { store[key] = String(value); },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { for (const key in store) delete store[key]; },
    get length() { return Object.keys(store).length; },
    key: (index: number) => Object.keys(store)[index] || null,
  };
  Object.defineProperty(globalThis, "localStorage", {
    value: mockLocalStorage,
    writable: true,
    configurable: true,
  });
}

process.env.MISTRAL_API_KEY ??= "test-mistral-key"

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