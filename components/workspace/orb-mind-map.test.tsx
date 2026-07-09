import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { OrbMindMap } from "./orb-mind-map";

describe("OrbMindMap", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("renders idle empty state with orb", () => {
    render(<OrbMindMap isPlanning={false} plan={null} />);
    expect(screen.getByTestId("orb-mind-map")).toBeInTheDocument();
    expect(screen.getByTestId("orb-mind-status")).toHaveTextContent("Tu sa zrodí tvoj build");
  });

  it("reveals orbital nodes while planning", () => {
    render(<OrbMindMap isPlanning plan={null} />);

    expect(screen.getByTestId("orb-mind-node-hero")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(1500);
    });

    expect(screen.getByTestId("orb-mind-node-navigation")).toBeInTheDocument();
    expect(screen.getByTestId("orb-mind-status")).toHaveTextContent(/Mapujem myšlienky/i);
  });

  it("collapses plan nodes into a Build button", () => {
    render(
      <OrbMindMap
        isPlanning={false}
        plan={{
          summary: "Coffee shop",
          sections: ["hero", "contact"],
          primaryColor: "#222222",
          ctaLabel: "Order",
          language: "EN",
          mustHaveScript: true,
        }}
      />,
    );

    act(() => {
      vi.advanceTimersByTime(600);
    });

    expect(screen.getByTestId("orb-mind-build-button")).toHaveClass("opacity-100");
    expect(screen.getByRole("button", { name: "Build" })).toBeInTheDocument();
  });
});