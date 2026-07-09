import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { StoryboardStrip } from "./storyboard-strip";

describe("StoryboardStrip", () => {
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("renders nothing when idle without a plan", () => {
    const { container } = render(<StoryboardStrip plan={null} isPlanning={false} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows planning cards and status while planner runs", () => {
    render(<StoryboardStrip plan={null} isPlanning />);

    expect(screen.getByTestId("storyboard-strip")).toBeInTheDocument();
    expect(screen.getByTestId("storyboard-status")).toHaveTextContent(/Analyzujem|Pridávam/i);
    expect(screen.getByTestId("storyboard-card-0")).toHaveAttribute("data-active", "true");
  });

  it("shows completed plan sections after planner finishes", () => {
    render(
      <StoryboardStrip
        isPlanning={false}
        plan={{
          summary: "Fitness landing page",
          sections: ["hero", "pricing", "contact"],
          primaryColor: "#0a0a0a",
          ctaLabel: "Start",
          language: "EN",
          mustHaveScript: true,
        }}
      />,
    );

    expect(screen.getByText("Hero")).toBeInTheDocument();
    expect(screen.getByText("Pricing")).toBeInTheDocument();
    expect(screen.getByText("Contact")).toBeInTheDocument();
    expect(screen.getByTestId("storyboard-status")).toHaveTextContent("Fitness landing page");
  });
});