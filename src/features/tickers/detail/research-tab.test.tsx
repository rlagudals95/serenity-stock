import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getFixtureTickerDetail } from "../fixtures";
import { ResearchTab } from "./research-tab";

const ticker = getFixtureTickerDetail("COHR")!;
beforeEach(() => { localStorage.clear(); vi.restoreAllMocks(); });

describe("ResearchTab", () => {
  it("restores the actual saved note and status after remounting", () => {
    const view = render(<ResearchTab ticker={ticker} />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "고객 주문 확인하기" } });
    fireEvent.change(screen.getByRole("combobox", { name: "검토 상태" }), { target: { value: "paused" } });
    fireEvent.click(screen.getByRole("button", { name: "기록 저장" }));
    expect(screen.getByText("기록을 이 브라우저에 저장했어요.")).toBeInTheDocument();
    view.unmount();
    render(<ResearchTab ticker={ticker} />);
    expect(screen.getByRole("textbox")).toHaveValue("고객 주문 확인하기");
    expect(screen.getByRole("combobox", { name: "검토 상태" })).toHaveValue("paused");
  });
  it("retains unsaved input and allows retry when storage fails", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("storage disabled"); });
    render(<ResearchTab ticker={ticker} />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "잃지 않을 메모" } });
    fireEvent.click(screen.getByRole("button", { name: "기록 저장" }));
    expect(screen.getByRole("alert")).toHaveTextContent("저장하지 못했어요");
    expect(screen.getByRole("textbox")).toHaveValue("잃지 않을 메모");
    expect(screen.getByRole("button", { name: "기록 저장" })).toBeEnabled();
  });
});
