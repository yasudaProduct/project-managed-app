import { decodeTextFile } from "@/utils/text-decoding";

/**
 * ファイルを文字コード（Shift_JIS / UTF-8 / UTF-16）を自動判定して文字列として読み込む
 */
export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const { result } = reader;
      if (result instanceof ArrayBuffer) {
        resolve(decodeTextFile(result));
      } else {
        reject(new Error("ファイルを読み込めませんでした"));
      }
    };
    reader.onerror = () => reject(reader.error ?? new Error("ファイルを読み込めませんでした"));
    reader.readAsArrayBuffer(file);
  });
}
