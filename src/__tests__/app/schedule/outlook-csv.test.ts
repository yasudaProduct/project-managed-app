import { parseOutlookCalendarCsv } from "@/app/schedule/import/_components/outlook-csv";

/** 日本語版 Outlook の予定表エクスポート（一部の列を抜粋） */
const JA_HEADER =
  '"件名","開始日","開始時刻","終了日","終了時刻","終日イベント","アラーム オン/オフ","会議の開催者","必須出席者","内容","場所","公開する時間帯の種類"';

describe("parseOutlookCalendarCsv", () => {
  it("日本語版のCSVを列名を正規化した行へ変換し、取り込みに使わない列は除くこと", () => {
    const csv = [
      JA_HEADER,
      '"定例会議","2026/11/2","10:00:00","2026/11/2","11:00:00","FALSE","TRUE","山田 太郎","佐藤;鈴木","週次の定例","会議室A","2"',
      '"夏季休暇","2026/8/12","0:00:00","2026/8/15","0:00:00","TRUE","FALSE","","","","","4"',
    ].join("\r\n");

    const result = parseOutlookCalendarCsv(csv);

    expect(result).toEqual({
      success: true,
      rows: [
        {
          rowNumber: 2,
          subject: "定例会議",
          startDate: "2026/11/2",
          startTime: "10:00:00",
          endDate: "2026/11/2",
          endTime: "11:00:00",
          allDay: "FALSE",
          description: "週次の定例",
          location: "会議室A",
          showTimeAs: "2",
        },
        {
          rowNumber: 3,
          subject: "夏季休暇",
          startDate: "2026/8/12",
          startTime: "0:00:00",
          endDate: "2026/8/15",
          endTime: "0:00:00",
          allDay: "TRUE",
          description: "",
          location: "",
          showTimeAs: "4",
        },
      ],
    });
  });

  it("英語版のCSV（列の順序が異なる場合も）を変換すること", () => {
    const csv = [
      '"Start Date","Subject","Start Time","End Date","End Time","All day event","Location","Description","Show time as"',
      '"11/2/2026","Team meeting","9:30:00 AM","11/2/2026","10:30:00 AM","False","Room 1","Weekly sync","2"',
    ].join("\n");

    expect(parseOutlookCalendarCsv(csv)).toEqual({
      success: true,
      rows: [
        {
          rowNumber: 2,
          subject: "Team meeting",
          startDate: "11/2/2026",
          startTime: "9:30:00 AM",
          endDate: "11/2/2026",
          endTime: "10:30:00 AM",
          allDay: "False",
          location: "Room 1",
          description: "Weekly sync",
          showTimeAs: "2",
        },
      ],
    });
  });

  it("列名のBOM・前後空白・大文字小文字の違いを吸収すること", () => {
    const csv = ["﻿ subject ,START DATE", "定例会議,2026/11/2"].join("\n");

    expect(parseOutlookCalendarCsv(csv)).toEqual({
      success: true,
      rows: [{ rowNumber: 2, subject: "定例会議", startDate: "2026/11/2" }],
    });
  });

  it("「説明」列を内容として扱うこと", () => {
    const csv = ["件名,開始日,説明", "定例会議,2026/11/2,メモ"].join("\n");

    const result = parseOutlookCalendarCsv(csv);

    expect(result).toEqual({
      success: true,
      rows: [{ rowNumber: 2, subject: "定例会議", startDate: "2026/11/2", description: "メモ" }],
    });
  });

  it("改行を含む内容があっても行番号はCSVのレコード単位で数えること", () => {
    const csv = [
      "件名,開始日,内容",
      '"打合せ","2026/11/2","1行目\r\n2行目"',
      '"レビュー","2026/11/3",""',
    ].join("\r\n");

    const result = parseOutlookCalendarCsv(csv);

    expect(result.success && result.rows.map((row) => [row.rowNumber, row.subject, row.description])).toEqual([
      [2, "打合せ", "1行目\r\n2行目"],
      [3, "レビュー", ""],
    ]);
  });

  it("全列が空の行は無視すること", () => {
    const csv = ["件名,開始日", ",", "定例会議,2026/11/2"].join("\n");

    const result = parseOutlookCalendarCsv(csv);

    expect(result.success && result.rows.map((row) => row.subject)).toEqual(["定例会議"]);
  });

  it("必須の列（件名・開始日）がない場合はエラーを返すこと", () => {
    const csv = ["個人ｺｰﾄﾞ\t氏名\t年月日", "u1\t山田\t2026/11/02 00:00:00"].join("\n");

    expect(parseOutlookCalendarCsv(csv)).toEqual({
      success: false,
      error: "Outlookの予定表エクスポート（CSV）の形式ではありません。必要な列（件名、開始日）が見つかりません。",
    });
  });

  it("予定の行がない場合はエラーを返すこと", () => {
    expect(parseOutlookCalendarCsv(JA_HEADER)).toEqual({
      success: false,
      error: "取り込む予定がありません。",
    });
  });

  it("空のファイルはエラーを返すこと", () => {
    expect(parseOutlookCalendarCsv("")).toEqual({
      success: false,
      error: "取り込む予定がありません。",
    });
  });

  it("CSVとして読み込めない場合はエラーを返すこと", () => {
    const csv = ['件名,開始日', '"閉じていない引用符,2026/11/2'].join("\n");

    expect(parseOutlookCalendarCsv(csv)).toEqual({
      success: false,
      error: "CSVファイルを読み込めませんでした。Outlookからエクスポートしたファイルか確認してください。",
    });
  });
});
