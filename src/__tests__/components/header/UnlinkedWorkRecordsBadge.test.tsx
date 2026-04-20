import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";

import { UnlinkedWorkRecordsBadge } from "@/components/header/UnlinkedWorkRecordsBadge";

describe("UnlinkedWorkRecordsBadge", () => {
  it("count=0 のとき何も描画しない", () => {
    const { container } = render(<UnlinkedWorkRecordsBadge count={0} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("count>0 のときバッジが表示される", () => {
    render(<UnlinkedWorkRecordsBadge count={3} />);
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("バッジのテキストが count と一致する", () => {
    render(<UnlinkedWorkRecordsBadge count={42} />);
    expect(screen.getByText("42")).toBeInTheDocument();
  });

  it("バッジに tabIndex=0 が設定されている", () => {
    render(<UnlinkedWorkRecordsBadge count={5} />);
    const badge = screen.getByText("5");
    expect(badge).toHaveAttribute("tabindex", "0");
  });

  it("バッジにホバーするとツールチップに件数を含むメッセージが表示される", async () => {
    const user = userEvent.setup();
    render(<UnlinkedWorkRecordsBadge count={7} />);

    const badge = screen.getByText("7");
    await user.hover(badge);

    await waitFor(() => {
      const tooltips = screen.getAllByText("未紐付けの実績が7件あります");
      expect(tooltips.length).toBeGreaterThan(0);
    });
  });
});
