import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ChatShell } from "@/components/chat/chat-shell";
import { DEVICE_PRESETS } from "@/lib/test/viewport-presets";
import {
  assertNoHorizontalOverflow,
  mockElementRects,
  setTestViewport,
} from "@/lib/test/responsive-test-utils";

vi.mock("next/dynamic", () => ({
  default: () => {
    const MemoryPanel = () => <div data-testid="memory-panel" />;
    return MemoryPanel;
  },
}));

vi.mock("next/image", () => ({
  default: ({ alt, src }: { alt: string; src: string }) => <img alt={alt} src={src} />,
}));

vi.mock("@/lib/memory", () => ({
  extractFromMessage: vi.fn().mockResolvedValue(undefined),
  updateConversationSummary: vi.fn().mockResolvedValue(undefined),
  clearConversationMemory: vi.fn().mockResolvedValue(undefined),
  buildAICcontext: vi.fn().mockResolvedValue({ systemPrompt: "" }),
}));

vi.mock("@/copied-from-visual-html/components/jarvis/jarvis-preview-panel", () => ({
  JarvisPreviewPanel: () => <div data-testid="jarvis-preview" />,
}));

vi.mock("@/components/chat/animated-orb", () => ({
  AnimatedOrb: () => <div data-testid="animated-orb" />,
}));

describe("workspace integrity across devices", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();

    class ResizeObserverMock {
      observe = vi.fn();
      unobserve = vi.fn();
      disconnect = vi.fn();
    }

    vi.stubGlobal("ResizeObserver", ResizeObserverMock);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{}", { status: 404 })));
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  for (const preset of DEVICE_PRESETS) {
    it(`[${preset.label}] mounts chat shell with core controls visible`, async () => {
      setTestViewport(preset);

      const { container } = render(<ChatShell />);

      await waitFor(() => {
        expect(screen.getByText("Ahoj, som Jarvis")).toBeInTheDocument();
      });

      expect(screen.getByTestId("jarvis-mode-control")).toBeInTheDocument();
      expect(screen.getByRole("textbox", { name: "Message input" })).toBeInTheDocument();
      expect(screen.getByLabelText("Open settings")).toBeInTheDocument();

      const workspace = container.querySelector(".jarvis-workspace") as HTMLElement | null;
      expect(workspace).toBeTruthy();
      mockElementRects(workspace!);
      assertNoHorizontalOverflow(workspace!, preset.width);
    });
  }

  it("iPhone 17 Air uses single-panel mobile workspace shell", async () => {
    setTestViewport(DEVICE_PRESETS[0]);

    render(<ChatShell />);

    await waitFor(() => {
      expect(screen.getByTestId("jarvis-empty-state")).toBeInTheDocument();
    });

    expect(window.matchMedia("(max-width: 767px)").matches).toBe(true);
    expect(screen.getByTestId("workspace-footer")).toBeInTheDocument();
    expect(screen.queryByLabelText("Back to chat")).not.toBeInTheDocument();
  });
});