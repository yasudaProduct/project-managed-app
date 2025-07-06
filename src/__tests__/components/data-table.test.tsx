import React from "react";
import { render, screen } from "@testing-library/react";
import { DataTable } from "@/components/data-table";
import "@testing-library/jest-dom";

// テスト用のモックカラム
const testColumns = [
  {
    accessorKey: "name",
    header: "名前",
  },
  {
    accessorKey: "email",
    header: "メールアドレス",
  },
];

const mockedUseRouter = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => mockedUseRouter(),
  usePathname: jest.fn().mockReturnValue("/some-route"),
}));

describe("DataTable", () => {
  it("データがある場合、テーブルの行と列が正しく表示されること", () => {
    const testData = [
      {
        id: "1",
        name: "山田太郎",
        email: "taro@example.com",
        link: "/projects/1",
      },
      {
        id: "2",
        name: "佐藤花子",
        email: "hanako@example.com",
        link: "/projects/2",
      },
    ];

    render(<DataTable columns={testColumns} data={testData} />);

    // ヘッダーが表示されていることを確認
    expect(screen.getByText("名前")).toBeInTheDocument();
    expect(screen.getByText("メールアドレス")).toBeInTheDocument();

    // データが表示されていることを確認
    expect(screen.getByText("山田太郎")).toBeInTheDocument();
    expect(screen.getByText("taro@example.com")).toBeInTheDocument();
    expect(screen.getByText("佐藤花子")).toBeInTheDocument();
    expect(screen.getByText("hanako@example.com")).toBeInTheDocument();
  });

  it("データがない場合、「結果がありません。」と表示されること", () => {
    render(<DataTable columns={testColumns} data={[]} />);

    // 「結果がありません。」というテキストが表示されていることを確認
    expect(screen.getByText("結果がありません。")).toBeInTheDocument();
  });
});
