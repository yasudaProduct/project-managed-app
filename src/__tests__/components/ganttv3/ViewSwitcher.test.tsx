import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { ViewSwitcher } from "@/components/ganttv3/ViewSwitcher";

describe("ViewSwitcher", () => {
  it("ガント/テーブルの切替ボタンを描画する（E2E用 testid 付き）", () => {
    render(<ViewSwitcher onViewChange={jest.fn()} />);
    expect(screen.getByTestId("view-switcher-gantt")).toBeInTheDocument();
    expect(screen.getByTestId("view-switcher-table")).toBeInTheDocument();
  });

  it("各ボタンのクリックで onViewChange が対応するビュー名で発火", () => {
    const onViewChange = jest.fn();
    render(<ViewSwitcher onViewChange={onViewChange} />);

    fireEvent.click(screen.getByTestId("view-switcher-table"));
    expect(onViewChange).toHaveBeenLastCalledWith("table");

    fireEvent.click(screen.getByTestId("view-switcher-gantt"));
    expect(onViewChange).toHaveBeenLastCalledWith("gantt");
  });

  it("currentView のボタンが強調表示（default variant）になる", () => {
    render(<ViewSwitcher currentView="table" onViewChange={jest.fn()} />);
    // default variant は bg-primary、ghost にはない
    expect(screen.getByTestId("view-switcher-table").className).toContain(
      "bg-primary",
    );
    expect(screen.getByTestId("view-switcher-gantt").className).not.toContain(
      "bg-primary",
    );
  });
});
