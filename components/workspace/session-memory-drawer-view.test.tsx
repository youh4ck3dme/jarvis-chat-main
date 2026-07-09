import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { SessionMemoryDrawerView } from "./session-memory-drawer-view";

vi.mock("@/lib/memory/session-memory-summary", () => ({
  getSessionMemorySummaries: vi.fn().mockResolvedValue([
    {
      conversationId: "session-a",
      title: "Káva chat",
      memoryCount: 2,
      lastUpdated: new Date("2026-03-01T12:00:00.000Z"),
      previewSnippet: "Používateľ má rád kávu",
      isActive: true,
    },
    {
      conversationId: "session-b",
      title: "Prázdna",
      memoryCount: 0,
      lastUpdated: null,
      previewSnippet: null,
      isActive: false,
    },
  ]),
  sumSessionMemoryCounts: vi.fn().mockReturnValue(2),
}));

describe("SessionMemoryDrawerView", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders per-session memory summaries and opens detail", async () => {
    const onOpenSessionMemory = vi.fn();
    const user = userEvent.setup();

    render(
      <SessionMemoryDrawerView
        chatSessions={[
          {
            id: "session-a",
            title: "Káva chat",
            messages: [],
            projectName: "Jarvis",
            updatedAt: new Date().toISOString(),
          },
        ]}
        activeSessionId="session-a"
        onOpenSessionMemory={onOpenSessionMemory}
        onClearSessionMemory={vi.fn().mockResolvedValue(undefined)}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId("session-memory-drawer-view")).toBeInTheDocument();
    });

    expect(screen.getByText(/2 záznamov v 1 konverzáciách/i)).toBeInTheDocument();
    expect(screen.getByText("Používateľ má rád kávu")).toBeInTheDocument();
    expect(screen.getByText("Aktívna")).toBeInTheDocument();

    await user.click(screen.getByText("Káva chat"));
    expect(onOpenSessionMemory).toHaveBeenCalledWith("session-a");
  });
});