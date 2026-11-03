import { matchUserByFileName } from "@/app/schedule/import/_components/match-user-by-file-name";

const users = [
  { id: "12345", name: "山田太郎", displayName: "山田", email: "yamada@example.com" },
  { id: "23456", name: "佐藤花子", displayName: "佐藤", email: "hanako.sato@example.com" },
  { id: "34567", name: "山田次郎", displayName: "山田J", email: "jiro@example.com" },
  { id: "u-001", name: "鈴木一郎", displayName: "鈴木", email: "suzuki@example.com" },
  { id: "001", name: "高橋三郎", displayName: "高橋", email: "takahashi@example.com" },
];

describe("matchUserByFileName", () => {
  it.each([
    ["12345.csv", "12345"],
    ["山田太郎.csv", "12345"],
    ["山田 太郎.CSV", "12345"],
    ["山田　太郎.csv", "12345"],
    ["佐藤.csv", "23456"],
    ["yamada@example.com.csv", "12345"],
    ["hanako.sato.csv", "23456"],
    ["ＹＡＭＡＤＡ＠ＥＸＡＭＰＬＥ．ＣＯＭ.csv", "12345"],
    ["u-001.csv", "u-001"],
  ])("ファイル名 %s を個人コード・氏名・表示名・メールアドレスで照合し、ユーザー %s を選ぶこと", (fileName, userId) => {
    expect(matchUserByFileName(fileName, users)).toEqual({ status: "matched", userId });
  });

  it.each([
    ["12345_予定表.csv", "12345"],
    ["予定表（佐藤花子）.csv", "23456"],
    ["予定表 [23456].csv", "23456"],
    ["【34567】2026年11月.csv", "34567"],
  ])("ファイル名 %s の区切られた語で照合し、ユーザー %s を選ぶこと", (fileName, userId) => {
    expect(matchUserByFileName(fileName, users)).toEqual({ status: "matched", userId });
  });

  it("同じユーザーを指す語が複数あっても1人として扱うこと", () => {
    expect(matchUserByFileName("12345_山田太郎.csv", users)).toEqual({ status: "matched", userId: "12345" });
  });

  it("ファイル名全体で一致した場合は、区切られた語による一致より優先すること", () => {
    // 「u-001」全体は鈴木さん。語の区切りで「001」（高橋さん）とは照合しない
    expect(matchUserByFileName("u-001.csv", users)).toEqual({ status: "matched", userId: "u-001" });
  });

  it("複数のユーザーに一致する場合は候補として返し、自動では選ばないこと", () => {
    expect(matchUserByFileName("12345_23456.csv", users)).toEqual({
      status: "ambiguous",
      userIds: ["12345", "23456"],
    });
  });

  it.each(["予定表.csv", "calendar.csv", "山田.txt.csv", "山.csv"])(
    "一致するユーザーがいないファイル名 %s は未選択とすること",
    (fileName) => {
      expect(matchUserByFileName(fileName, users)).toEqual({ status: "unmatched" });
    }
  );

  it("表示名が未設定のユーザーも照合できること", () => {
    const usersWithoutDisplayName = [{ id: "99999", name: "田中", email: "tanaka@example.com" }];

    expect(matchUserByFileName("田中.csv", usersWithoutDisplayName)).toEqual({ status: "matched", userId: "99999" });
  });
});
