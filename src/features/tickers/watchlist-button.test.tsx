import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { WatchlistButton } from "./watchlist-button";

const refresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh }),
}));

describe("WatchlistButton", () => {
  beforeEach(() => {
    refresh.mockClear();
    vi.restoreAllMocks();
  });

  it("persists the optimistic selection and confirms success", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(null, { status: 204 }));

    render(<WatchlistButton initialActive={false} ticker="COHR" />);
    fireEvent.click(screen.getByRole("button", { name: "COHR Watchlist 추가" }));

    expect(screen.getByRole("button", { name: "COHR Watchlist 제거" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(await screen.findByText("Watchlist 저장됨")).toBeInTheDocument();
    expect(refresh).toHaveBeenCalled();
  });

  it("rolls back and explains a failed save", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(null, { status: 500 }),
    );

    render(<WatchlistButton initialActive={false} ticker="COHR" />);
    fireEvent.click(screen.getByRole("button", { name: "COHR Watchlist 추가" }));

    expect(await screen.findByText("Watchlist 저장 실패")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "COHR Watchlist 추가" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });
});
