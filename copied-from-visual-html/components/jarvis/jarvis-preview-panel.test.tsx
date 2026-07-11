import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { JarvisPreviewPanel } from "./jarvis-preview-panel";

const SAMPLE_HTML = `<!DOCTYPE html><html><body><h1>Preview</h1></body></html>`;

describe("JarvisPreviewPanel fullscreen", () => {
  afterEach(() => {
    cleanup();
    document.body.style.overflow = "";
    document.documentElement.style.overflow = "";
  });

  it("shows fullscreen controls when preview HTML exists", () => {
    render(
      <JarvisPreviewPanel
        htmlContent={SAMPLE_HTML}
        previewHtmlContent={SAMPLE_HTML}
        showPreview
        showSource={false}
      />,
    );

    expect(screen.getByTestId("jarvis-preview-fullscreen-btn")).toBeInTheDocument();
    expect(screen.getByTestId("jarvis-preview-fullscreen-btn-sandbox")).toBeInTheDocument();
  });

  it("opens and closes a 100dvh fullscreen preview overlay", () => {
    render(
      <JarvisPreviewPanel
        htmlContent={SAMPLE_HTML}
        previewHtmlContent={SAMPLE_HTML}
        showPreview
        showSource={false}
      />,
    );

    fireEvent.click(screen.getByTestId("jarvis-preview-fullscreen-btn-sandbox"));

    const overlay = screen.getByTestId("jarvis-preview-fullscreen");
    expect(overlay).toBeInTheDocument();
    expect(overlay).toHaveStyle({ height: "100dvh", maxHeight: "100dvh" });
    expect(screen.getByTitle("Jarvis Fullscreen Preview")).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("jarvis-preview-fullscreen-exit"));
    expect(screen.queryByTestId("jarvis-preview-fullscreen")).not.toBeInTheDocument();
  });

  it("hides fullscreen controls without preview HTML", () => {
    render(<JarvisPreviewPanel showPreview showSource={false} />);

    expect(screen.queryByTestId("jarvis-preview-fullscreen-btn")).not.toBeInTheDocument();
    expect(screen.queryByTestId("jarvis-preview-fullscreen-btn-sandbox")).not.toBeInTheDocument();
  });
});