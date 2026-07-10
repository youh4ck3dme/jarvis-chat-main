import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { Composer } from "@/components/chat/composer";
import { MessageList } from "@/components/chat/message-list";
import { JarvisModeControl } from "@/components/workspace/jarvis-mode-control";
import { OrbMindMap } from "@/components/workspace/orb-mind-map";
import { StoryboardStrip } from "@/components/workspace/storyboard-strip";
import { WorkspaceFooter } from "@/components/workspace/workspace-footer";
import { WorkspaceHeader } from "@/components/workspace/workspace-header";
import {
  assertMinTouchTargets,
  assertNoHorizontalOverflow,
  expectMobileLayoutActive,
  mockElementRects,
  setTestViewport,
} from "@/lib/test/responsive-test-utils";
import { IPHONE_17_AIR } from "@/lib/test/viewport-presets";

vi.mock("next/image", () => ({
  default: ({ alt, src }: { alt: string; src: string }) => <img alt={alt} src={src} />,
}));

vi.mock("@/components/chat/animated-orb", () => ({
  AnimatedOrb: () => <div data-testid="animated-orb" />,
}));

describe("iPhone 17 Air responsive layout", () => {
  beforeEach(() => {
    setTestViewport(IPHONE_17_AIR);
  });

  afterEach(() => {
    cleanup();
  });

  it("activates mobile breakpoint at 420px width", () => {
    expectMobileLayoutActive(IPHONE_17_AIR);
  });

  it("renders workspace header without horizontal overflow", () => {
    const { container } = render(
      <WorkspaceHeader
        projectName="Jarvis"
        onProjectNameChange={vi.fn()}
        onOpenMenu={vi.fn()}
        onOpenSettings={vi.fn()}
        jarvisMode="chat"
        builderUnlocked={false}
        onJarvisModeChange={vi.fn()}
        onBuilderUnlock={vi.fn()}
      />,
    );

    const header = container.querySelector("header");
    expect(header).toBeTruthy();
    mockElementRects(header!);
    assertNoHorizontalOverflow(header!, IPHONE_17_AIR.width);
    expect(screen.getByTestId("jarvis-mode-control")).toBeInTheDocument();
    expect(screen.getByLabelText("Open settings")).toBeInTheDocument();
  });

  it("keeps mode control and touch-sized header actions on narrow width", () => {
    const { container } = render(
      <WorkspaceHeader
        projectName="Jarvis"
        onProjectNameChange={vi.fn()}
        onOpenMenu={vi.fn()}
        onOpenSettings={vi.fn()}
        jarvisMode="chat"
        builderUnlocked={false}
        onJarvisModeChange={vi.fn()}
        onBuilderUnlock={vi.fn()}
      />,
    );

    mockElementRects(container);
    assertMinTouchTargets(container);
  });

  it("renders composer input within iPhone 17 Air width", () => {
    const { container } = render(
      <Composer
        onSend={vi.fn()}
        onStop={vi.fn()}
        isStreaming={false}
        selectedModel="mistral/mistral-small-latest"
        onModelChange={vi.fn()}
        variant="workspace"
      />,
    );

    mockElementRects(container);
    assertNoHorizontalOverflow(container, IPHONE_17_AIR.width);
    expect(screen.getByRole("textbox", { name: "Message input" })).toBeInTheDocument();
  });

  it("renders workspace footer navigation without overflow", () => {
    const { container } = render(
      <WorkspaceFooter
        workspaceView="chat"
        onWorkspaceViewChange={vi.fn()}
        artifactTab="preview"
        onArtifactTabChange={vi.fn()}
        hasArtifact
        onSend={vi.fn()}
        onStop={vi.fn()}
        isStreaming={false}
        selectedModel="mistral/mistral-small-latest"
        onModelChange={vi.fn()}
        onPlayPreview={vi.fn()}
      />,
    );

    const footer = container.querySelector("footer");
    expect(footer).toBeTruthy();
    mockElementRects(footer!);
    assertNoHorizontalOverflow(footer!, IPHONE_17_AIR.width);
    expect(screen.getByLabelText("Back to chat")).toBeInTheDocument();
  });

  it("shows static workspace landing on empty chat", () => {
    render(
      <MessageList
        messages={[]}
        isStreaming={false}
        error={null}
        onRetry={vi.fn()}
        isLoaded
        variant="workspace"
      />,
    );

    expect(screen.getByTestId("jarvis-empty-state")).toBeInTheDocument();
    expect(screen.getByText("Ahoj, som Jarvis")).toBeInTheDocument();
  });

  it("renders storyboard strip as horizontally scrollable on narrow screens", () => {
    const { container } = render(<StoryboardStrip isPlanning plan={null} />);

    const scroller = container.querySelector(".overflow-x-auto");
    expect(scroller).toBeTruthy();
    mockElementRects(container);
    assertNoHorizontalOverflow(container, IPHONE_17_AIR.width);
  });

  it("renders orb mind-map centered in preview empty state", () => {
    const { container } = render(<OrbMindMap isPlanning={false} plan={null} />);

    expect(screen.getByTestId("orb-mind-map")).toBeInTheDocument();
    mockElementRects(container);
    assertNoHorizontalOverflow(container, IPHONE_17_AIR.width);
  });

  it("shows chat-mode idle copy instead of build streaming text", () => {
    render(<OrbMindMap isPlanning={false} plan={null} variant="chat" />);

    expect(screen.getByTestId("orb-mind-status")).toHaveTextContent(/Chat režim/i);
    expect(screen.getByTestId("orb-mind-status")).not.toHaveTextContent(/Generujem HTML/i);
  });

  it("exposes compact mode control buttons for iPhone 17 Air", () => {
    render(
      <JarvisModeControl
        mode="chat"
        builderUnlocked={false}
        onModeChange={vi.fn()}
        onBuilderUnlock={vi.fn()}
      />,
    );

    expect(screen.getByTestId("jarvis-mode-chat")).toBeInTheDocument();
    expect(screen.getByTestId("jarvis-mode-builder")).toBeInTheDocument();
  });
});