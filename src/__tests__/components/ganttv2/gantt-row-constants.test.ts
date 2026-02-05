import {
  GANTT_ROW_HEIGHTS,
  getTaskRowHeight,
  getTaskRowStyle,
  getGroupHeaderStyle,
  getTaskBarTop,
  getTaskBarStyle,
  calculateTaskRowHeight,
  getTaskBarTopDynamic,
} from "@/components/ganttv2/gantt-row-constants";

describe("gantt-row-constants", () => {
  describe("GANTT_ROW_HEIGHTS", () => {
    it("定数が正しく定義されている", () => {
      expect(GANTT_ROW_HEIGHTS.GROUP_HEADER).toBe(24);
      expect(GANTT_ROW_HEIGHTS.TASK_COLLAPSED).toBe(32);
      expect(GANTT_ROW_HEIGHTS.TASK_EXPANDED).toBe(52);
      expect(GANTT_ROW_HEIGHTS.TASK_BAR).toBe(24);
      expect(GANTT_ROW_HEIGHTS.TASK_PADDING_Y).toBe(8);
    });
  });

  describe("getTaskRowHeight", () => {
    it("折りたたみ状態で正しい高さを返す", () => {
      expect(getTaskRowHeight(true)).toBe(32);
      expect(getTaskRowHeight(false)).toBe(52);
    });
  });

  describe("getTaskRowStyle", () => {
    it("折りたたみ状態で正しいスタイルを返す", () => {
      const collapsedStyle = getTaskRowStyle(true);
      expect(collapsedStyle).toEqual({
        height: "32px",
        minHeight: "32px",
      });

      const expandedStyle = getTaskRowStyle(false);
      expect(expandedStyle).toEqual({
        height: "52px",
        minHeight: "52px",
      });
    });
  });

  describe("getGroupHeaderStyle", () => {
    it("グループヘッダーの正しいスタイルを返す", () => {
      const style = getGroupHeaderStyle();
      expect(style).toEqual({
        height: "24px",
        minHeight: "24px",
      });
    });
  });

  describe("getTaskBarTop", () => {
    it("タスクバーの正しい垂直位置を返す", () => {
      // 折りたたみ状態: (32 - 24) / 2 = 4px
      expect(getTaskBarTop(true)).toBe("4px");

      // 展開状態: (52 - 24) / 2 = 14px
      expect(getTaskBarTop(false)).toBe("14px");
    });
  });

  describe("getTaskBarStyle", () => {
    it("タスクバーの正しいスタイルを返す", () => {
      const collapsedStyle = getTaskBarStyle(true);
      expect(collapsedStyle).toEqual({
        height: "24px",
        top: "4px",
      });

      const expandedStyle = getTaskBarStyle(false);
      expect(expandedStyle).toEqual({
        height: "24px",
        top: "14px",
      });
    });
  });

  describe("一貫性のテスト", () => {
    it("タスクバーが常にタスク行の中央に配置される", () => {
      // 折りたたみ状態
      const collapsedRowHeight = getTaskRowHeight(true);
      const collapsedBarTop = parseInt(getTaskBarTop(true));
      const expectedCollapsedTop = (collapsedRowHeight - GANTT_ROW_HEIGHTS.TASK_BAR) / 2;
      expect(collapsedBarTop).toBe(expectedCollapsedTop);

      // 展開状態
      const expandedRowHeight = getTaskRowHeight(false);
      const expandedBarTop = parseInt(getTaskBarTop(false));
      const expectedExpandedTop = (expandedRowHeight - GANTT_ROW_HEIGHTS.TASK_BAR) / 2;
      expect(expandedBarTop).toBe(expectedExpandedTop);
    });

    it("タスクバーの下端がタスク行の範囲内に収まる", () => {
      // 折りたたみ状態
      const collapsedRowHeight = getTaskRowHeight(true);
      const collapsedBarTop = parseInt(getTaskBarTop(true));
      const collapsedBarBottom = collapsedBarTop + GANTT_ROW_HEIGHTS.TASK_BAR;
      expect(collapsedBarBottom).toBeLessThanOrEqual(collapsedRowHeight);

      // 展開状態
      const expandedRowHeight = getTaskRowHeight(false);
      const expandedBarTop = parseInt(getTaskBarTop(false));
      const expandedBarBottom = expandedBarTop + GANTT_ROW_HEIGHTS.TASK_BAR;
      expect(expandedBarBottom).toBeLessThanOrEqual(expandedRowHeight);
    });
  });

  describe("calculateTaskRowHeight", () => {
    it("折りたたみ状態では固定の高さを返す", () => {
      const task = {
        assignee: { displayName: "テストユーザー" },
        yoteiStart: new Date(),
        yoteiEnd: new Date(),
        yoteiKosu: 8,
      };
      expect(calculateTaskRowHeight(task, true)).toBe(32);
    });

    it("展開状態で日程情報がある場合の高さを計算する", () => {
      const task = {
        assignee: { displayName: "テストユーザー" },
        yoteiStart: new Date(),
        yoteiEnd: new Date(),
        yoteiKosu: 8,
      };
      // 基本: 24 (ヘッダー行) + 8 (マージン) + 16 (日程情報行) + 16 (パディング) = 64
      // ただし最小高さ52と比較して大きい方を返す
      expect(calculateTaskRowHeight(task, false)).toBe(64);
    });

    it("展開状態で日程情報がない場合の高さを計算する", () => {
      const task = {
        assignee: { displayName: "テストユーザー" },
        yoteiStart: null,
        yoteiEnd: null,
        yoteiKosu: null,
      };
      // 基本: 24 (ヘッダー行) + 16 (パディング) = 40
      // 最小高さ52と比較して大きい方を返す
      expect(calculateTaskRowHeight(task, false)).toBe(52);
    });

    it("展開状態で担当者がない場合でも正しく計算する", () => {
      const task = {
        assignee: null,
        yoteiStart: new Date(),
        yoteiEnd: new Date(),
        yoteiKosu: 8,
      };
      // 基本: 24 (ヘッダー行) + 8 (マージン) + 16 (日程情報行) + 16 (パディング) = 64
      expect(calculateTaskRowHeight(task, false)).toBe(64);
    });

    it("展開状態で詳細情報がない場合の最小高さを返す", () => {
      const task = {
        assignee: null,
        yoteiStart: null,
        yoteiEnd: null,
        yoteiKosu: null,
      };
      // 基本: 24 (ヘッダー行) + 16 (パディング) = 40
      // 最小高さ52と比較して大きい方を返す
      expect(calculateTaskRowHeight(task, false)).toBe(52);
    });
  });

  describe("getTaskBarTopDynamic", () => {
    it("折りたたみ状態では標準の位置を返す", () => {
      const task = {
        assignee: { displayName: "テストユーザー" },
        yoteiStart: new Date(),
        yoteiEnd: new Date(),
        yoteiKosu: 8,
      };
      expect(getTaskBarTopDynamic(task, true)).toBe("4px");
    });

    it("展開状態ではタスク名行の中央に配置する", () => {
      const task = {
        assignee: { displayName: "テストユーザー" },
        yoteiStart: new Date(),
        yoteiEnd: new Date(),
        yoteiKosu: 8,
      };
      // (32 - 24) / 2 = 4px
      expect(getTaskBarTopDynamic(task, false)).toBe("4px");
    });
  });
});
