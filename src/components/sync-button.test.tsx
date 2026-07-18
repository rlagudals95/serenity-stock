import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { SyncButton } from "./sync-button";

const refresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh }),
}));

describe("SyncButton", () => {
  beforeEach(() => {
    refresh.mockReset();
    vi.restoreAllMocks();
  });

  it("stays disabled and names missing pipeline variables", () => {
    render(
      <SyncButton
        configured={false}
        missing={["X_API_BEARER_TOKEN", "DEEPSEEK_API_KEY"]}
      />,
    );

    expect(screen.getByRole("button", { name: "데이터 동기화" })).toBeDisabled();
    expect(screen.getByRole("button")).toHaveAttribute(
      "title",
      "필수 환경 변수: X_API_BEARER_TOKEN, DEEPSEEK_API_KEY",
    );
  });

  it("runs the local sync and refreshes server data", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          fetched: 2,
          inserted: 2,
          duplicates: 0,
          jobsCreated: 2,
          analyzed: 2,
          failed: 0,
        }),
        { status: 200 },
      ),
    );
    render(<SyncButton configured missing={[]} />);

    fireEvent.click(screen.getByRole("button", { name: "데이터 동기화" }));

    await waitFor(() => expect(refresh).toHaveBeenCalledOnce());
    expect(screen.getByRole("button")).toHaveTextContent("2건 완료");
  });
});
