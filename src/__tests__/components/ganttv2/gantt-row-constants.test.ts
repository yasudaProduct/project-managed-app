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
      expect(GANTT_ROW_HEIGHTS.GROUP_HEADER).toBe(32);
      expect(GANTT_ROW_HEIGHTS.TASK_COLLAPSED).toBe(48);
      expect(GANTT_ROW_HEIGHTS.TASK_EXPANDED).toBe(80);
      expect(GANTT_ROW_HEIGHTS.TASK_BAR).toBe(32);
      expect(GANTT_ROW_HEIGHTS.TASK_PADDING_Y).toBe(8);
    });
  });

  describe("getTaskRowHeight", () => {
    it("折りたたみ状態で正しい高さを返す", () => {
      expect(getTaskRowHeight(true)).toBe(48);
      expect(getTaskRowHeight(false)).toBe(80);
    });
  });

  describe("getTaskRowStyle", () => {
    it("折りたたみ状態で正しいスタイルを返す", () => {
      const collapsedStyle = getTaskRowStyle(true);
      expect(collapsedStyle).toEqual({
        height: "48px",
        minHeight: "48px",
      });

      const expandedStyle = getTaskRowStyle(false);
      expect(expandedStyle).toEqual({
        height: "80px",
        minHeight: "80px",
      });
    });
  });

  describe("getGroupHeaderStyle", () => {
    it("グループヘッダーの正しいスタイルを返す", () => {
      const style = getGroupHeaderStyle();
      expect(style).toEqual({
        height: "32px",
        minHeight: "32px",
      });
    });
  });

  describe("getTaskBarTop", () => {
    it("タスクバーの正しい垂直位置を返す", () => {
      // 折りたたみ状態: (48 - 32) / 2 = 8px
      expect(getTaskBarTop(true)).toBe("8px");
      
      // 展開状態: (80 - 32) / 2 = 24px
      expect(getTaskBarTop(false)).toBe("24px");
    });
  });

  describe("getTaskBarStyle", () => {
    it("タスクバーの正しいスタイルを返す", () => {
      const collapsedStyle = getTaskBarStyle(true);
      expect(collapsedStyle).toEqual({
        height: "32px",
        top: "8px",
      });

      const expandedStyle = getTaskBarStyle(false);
      expect(expandedStyle).toEqual({
        height: "32px",
        top: "24px",
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
      expect(calculateTaskRowHeight(task, true)).toBe(48);
    });

    it("展開状態で担当者と日程・工数がある場合の高さを計算する", () => {
      const task = {
        assignee: { displayName: "テストユーザー" },
        yoteiStart: new Date(),
        yoteiEnd: new Date(),
        yoteiKosu: 8,
      };
      // 基本: 32 + マージン: 8 + 担当者: 16 + マージン: 4 + 日程工数: 16 + パディング: 16 = 92
      expect(calculateTaskRowHeight(task, false)).toBe(92);
    });

    it("展開状態で担当者のみの場合の高さを計算する", () => {
      const task = {
        assignee: { displayName: "テストユーザー" },
        yoteiStart: null,
        yoteiEnd: null,
        yoteiKosu: null,
      };
      // 基本: 32 + マージン: 8 + 担当者: 16 + マージン: 4 + パディング: 16 = 76
      // 最小高さ80と比較して大きい方を返す
      expect(calculateTaskRowHeight(task, false)).toBe(80);
    });

    it("展開状態で日程・工数のみの場合の高さを計算する", () => {
      const task = {
        assignee: null,
        yoteiStart: new Date(),
        yoteiEnd: new Date(),
        yoteiKosu: 8,
      };
      // 基本: 32 + マージン: 8 + 日程工数: 16 + パディング: 16 = 72
      // 最小高さ80と比較して大きい方を返す
      expect(calculateTaskRowHeight(task, false)).toBe(80);
    });

    it("展開状態で詳細情報がない場合の最小高さを返す", () => {
      const task = {
        assignee: null,
        yoteiStart: null,
        yoteiEnd: null,
        yoteiKosu: null,
      };
      // 基本: 32 + マージン: 8 + パディング: 16 = 56
      // 最小高さ80と比較して大きい方を返す
      expect(calculateTaskRowHeight(task, false)).toBe(80);
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
      expect(getTaskBarTopDynamic(task, true)).toBe("8px");
    });

    it("展開状態ではタスク名行の中央に配置する", () => {
      const task = {
        assignee: { displayName: "テストユーザー" },
        yoteiStart: new Date(),
        yoteiEnd: new Date(),
        yoteiKosu: 8,
      };
      // (32 - 32) / 2 = 0px
      expect(getTaskBarTopDynamic(task, false)).toBe("0px");
    });
  });
});