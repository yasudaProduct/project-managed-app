import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { BarLabel } from "@/components/gantt/bar-label";

function renderInSvg(ui: React.ReactElement) {
  return render(<svg>{ui}</svg>);
}

const baseProps = { x: 0, y: 0, width: 120, height: 16 };

describe("BarLabel", () => {
  it("タスク名を表示する", () => {
    renderInSvg(<BarLabel {...baseProps} name="実装タスク" />);
    expect(screen.getByText(/実装タスク/)).toBeInTheDocument();
  });

  it("hours 指定時は名前に工数を併記する", () => {
    renderInSvg(<BarLabel {...baseProps} name="実装" hours={8} />);
    expect(screen.getByText("実装 (8h)")).toBeInTheDocument();
  });

  it("progress 指定かつ十分な幅なら進捗率を表示する", () => {
    renderInSvg(<BarLabel {...baseProps} name="実装" progress={40} />);
    expect(screen.getByText("40%")).toBeInTheDocument();
  });

  it("幅が狭いと進捗率は省略する（名前は表示）", () => {
    renderInSvg(<BarLabel {...baseProps} width={40} name="実装" progress={40} />);
    expect(screen.getByText("実装")).toBeInTheDocument();
    expect(screen.queryByText("40%")).not.toBeInTheDocument();
  });

  it("最小幅未満ではラベルを描画しない", () => {
    const { container } = renderInSvg(
      <BarLabel {...baseProps} width={10} name="実装" />,
    );
    expect(container.querySelector("foreignObject")).not.toBeInTheDocument();
    expect(screen.queryByText("実装")).not.toBeInTheDocument();
  });

  it("はみ出し防止のため truncate クラスを付与する", () => {
    const { container } = renderInSvg(
      <BarLabel {...baseProps} name="とても長いタスク名" />,
    );
    expect(container.querySelector(".truncate")).toBeInTheDocument();
  });
});
