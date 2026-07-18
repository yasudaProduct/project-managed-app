import { tsvBlob, downloadBlob } from "@/components/gantt/utils/downloadBlob";

describe("tsvBlob", () => {
  it("TSV用のMIMEタイプを持つ", () => {
    expect(tsvBlob("a\tb").type).toBe(
      "text/tab-separated-values;charset=utf-8",
    );
  });

  it("先頭に UTF-8 BOM(3バイト) を付与する", () => {
    // "a" = 1バイト + BOM 3バイト = 4バイト
    expect(tsvBlob("a").size).toBe(4);
  });
});

describe("downloadBlob", () => {
  const originalCreate = URL.createObjectURL;
  const originalRevoke = URL.revokeObjectURL;
  let clickSpy: jest.SpyInstance;
  const clicked: { download: string; href: string }[] = [];

  beforeEach(() => {
    clicked.length = 0;
    URL.createObjectURL = jest.fn(() => "blob:mock-url");
    URL.revokeObjectURL = jest.fn();
    clickSpy = jest
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(function (this: HTMLAnchorElement) {
        clicked.push({ download: this.download, href: this.href });
      });
  });

  afterEach(() => {
    clickSpy.mockRestore();
    URL.createObjectURL = originalCreate;
    URL.revokeObjectURL = originalRevoke;
  });

  it("オブジェクトURLを生成し、aタグでクリックし、URLを解放する", () => {
    const blob = tsvBlob("x");
    downloadBlob(blob, "wbs-tasks-2024-01-01.tsv");

    expect(URL.createObjectURL).toHaveBeenCalledWith(blob);
    expect(clicked).toHaveLength(1);
    expect(clicked[0].download).toBe("wbs-tasks-2024-01-01.tsv");
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:mock-url");
  });

  it("ダウンロード後にaタグはDOMに残さない", () => {
    downloadBlob(tsvBlob("x"), "f.tsv");
    expect(document.querySelectorAll("a").length).toBe(0);
  });
});
