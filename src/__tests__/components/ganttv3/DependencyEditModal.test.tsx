import React from "react";
import { render, screen, fireEvent, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import { DependencyEditModal } from "@/components/ganttv3/dependency-edit-modal";
import { makeTask, makeDependency } from "./_fixtures";

// Radix Dialog / cmdk が要求する jsdom 非対応API のポリフィル
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));
window.HTMLElement.prototype.scrollIntoView = jest.fn();
window.HTMLElement.prototype.hasPointerCapture = jest.fn();
window.HTMLElement.prototype.releasePointerCapture = jest.fn();

const candidateB = makeTask({ id: "B", name: "設計" });
const candidateC = makeTask({ id: "C", name: "実装" });

const baseProps = {
  open: true,
  onOpenChange: jest.fn(),
  candidateTasks: [candidateB, candidateC],
  onAdd: jest.fn(),
  onRemove: jest.fn(),
};

beforeEach(() => jest.clearAllMocks());

describe("DependencyEditModal", () => {
  it("open=false では何も描画しない", () => {
    render(
      <DependencyEditModal
        {...baseProps}
        open={false}
        task={makeTask({ id: "A", name: "テスト" })}
      />,
    );
    expect(screen.queryByText("依存関係を編集")).not.toBeInTheDocument();
  });

  it("先行タスクがない場合は空メッセージを表示", () => {
    render(
      <DependencyEditModal {...baseProps} task={makeTask({ id: "A" })} />,
    );
    expect(
      screen.getByText("まだ先行タスクはありません。下から追加できます。"),
    ).toBeInTheDocument();
  });

  it("既存の依存を タスク名・タイプ・ラグ付きで一覧表示する", () => {
    const task = makeTask({
      id: "A",
      name: "結合テスト",
      predecessors: [
        makeDependency("B", { type: "FS", lag: 2, dbId: 10 }),
        makeDependency("C", { type: "SS", lag: -1, dbId: 11 }),
      ],
    });
    render(<DependencyEditModal {...baseProps} task={task} />);
    expect(screen.getByText("完了したら開始・2日あけて")).toBeInTheDocument();
    expect(screen.getByText("同時に開始・1日前倒し")).toBeInTheDocument();
  });

  it("削除ボタンで onRemove がDB上の依存IDで発火", () => {
    const task = makeTask({
      id: "A",
      predecessors: [makeDependency("B", { dbId: 10 })],
    });
    render(<DependencyEditModal {...baseProps} task={task} />);
    fireEvent.click(screen.getByTitle("削除"));
    expect(baseProps.onRemove).toHaveBeenCalledWith(10);
  });

  it("dbId がない依存（未保存ドラフト等）は削除ボタンが無効", () => {
    const task = makeTask({
      id: "A",
      predecessors: [makeDependency("B")], // dbId なし
    });
    render(<DependencyEditModal {...baseProps} task={task} />);
    expect(screen.getByTitle("削除")).toBeDisabled();
  });

  it("先行タスク未選択では追加ボタンが無効", () => {
    render(
      <DependencyEditModal {...baseProps} task={makeTask({ id: "A" })} />,
    );
    expect(
      screen.getByRole("button", { name: /依存関係を追加/ }),
    ).toBeDisabled();
  });

  it("候補選択→追加で onAdd が (後続, 先行, タイプ, ラグ) で発火し、プレビュー文を表示", () => {
    const task = makeTask({ id: "A", name: "結合テスト" });
    render(<DependencyEditModal {...baseProps} task={task} />);

    // cmdk の候補リストから「設計」(B) を選択
    fireEvent.click(screen.getByText("設計"));

    // ライブプレビュー（FS, lag=0）
    expect(
      screen.getByText("「設計」の完了後に「結合テスト」を開始します"),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /依存関係を追加/ }));
    expect(baseProps.onAdd).toHaveBeenCalledWith("A", "B", "FS", 0);
  });

  it("タイプとラグを変えて追加すると onAdd に反映される", () => {
    const task = makeTask({ id: "A", name: "結合テスト" });
    render(<DependencyEditModal {...baseProps} task={task} />);

    fireEvent.click(screen.getByText("設計"));
    // タイプ: SS（同時に開始）を選択
    fireEvent.click(screen.getByRole("button", { name: /同時に開始/ }));
    // ラグ: +1日
    fireEvent.click(screen.getByRole("button", { name: "+1日" }));

    expect(
      screen.getByText("「設計」の開始の1日後に「結合テスト」を開始します"),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /依存関係を追加/ }));
    expect(baseProps.onAdd).toHaveBeenCalledWith("A", "B", "SS", 1);
  });

  it("循環依存になる候補を選ぶと警告を表示し追加ボタンが無効になる", () => {
    // B は A に依存済み → A のモーダルで B を先行に選ぶと循環
    const task = makeTask({ id: "A", name: "結合テスト" });
    const cyclicB = makeTask({
      id: "B",
      name: "設計",
      predecessors: [makeDependency("A")],
    });
    render(
      <DependencyEditModal
        {...baseProps}
        task={task}
        candidateTasks={[cyclicB, candidateC]}
      />,
    );

    fireEvent.click(screen.getByText("設計"));

    expect(
      screen.getByText("このタスクが循環依存になるため追加できません。"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /依存関係を追加/ }),
    ).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: /依存関係を追加/ }));
    expect(baseProps.onAdd).not.toHaveBeenCalled();
  });

  it("既存依存の編集: タイプ・ラグを変更して保存すると onUpdate が発火", () => {
    const onUpdate = jest.fn();
    const task = makeTask({
      id: "A",
      name: "結合テスト",
      predecessors: [makeDependency("B", { type: "FS", lag: 2, dbId: 10 })],
    });
    const { baseElement } = render(
      <DependencyEditModal {...baseProps} task={task} onUpdate={onUpdate} />,
    );

    fireEvent.click(screen.getByTitle("編集"));
    // インライン編集フォーム（新規追加フォームにも同名ボタンがあるため枠内に絞る）
    const editBox = within(
      baseElement.querySelector(".border-blue-300") as HTMLElement,
    );
    // FF（同時に完了）へ変更、ラグを 2→1 に
    fireEvent.click(editBox.getByRole("button", { name: /同時に完了/ }));
    fireEvent.click(editBox.getByRole("button", { name: "−1日" }));
    fireEvent.click(editBox.getByRole("button", { name: /保存/ }));

    expect(onUpdate).toHaveBeenCalledWith(10, "A", "B", "FF", 1);
  });

  it("onUpdate 未指定なら既存依存に編集ボタンを表示しない", () => {
    const task = makeTask({
      id: "A",
      predecessors: [makeDependency("B", { dbId: 10 })],
    });
    render(<DependencyEditModal {...baseProps} task={task} />);
    expect(screen.queryByTitle("編集")).not.toBeInTheDocument();
  });

  it("閉じるボタンで onOpenChange(false) が発火", () => {
    render(
      <DependencyEditModal {...baseProps} task={makeTask({ id: "A" })} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "閉じる" }));
    expect(baseProps.onOpenChange).toHaveBeenCalledWith(false);
  });
});
