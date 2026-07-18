/**
 * TSV文字列を Excel 等で文字化けしないよう BOM 付きの Blob にする。
 */
export function tsvBlob(tsv: string): Blob {
  // 先頭に UTF-8 BOM(U+FEFF) を付与
  return new Blob(["﻿" + tsv], {
    type: "text/tab-separated-values;charset=utf-8",
  });
}

/**
 * Blob を指定ファイル名でダウンロードさせる（ブラウザDOM操作）。
 * jsdom 非対応の DOM 依存をこの関数に隔離する。
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
