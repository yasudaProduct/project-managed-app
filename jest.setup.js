// Jest設定ファイル

// React Testing Libraryのカスタムマッチャーを追加
import "@testing-library/jest-dom";

// Node.js内蔵のTextEncoder/TextDecoderを使用
import { TextEncoder, TextDecoder } from "util";

// TextEncoder/TextDecoderポリフィル（Next.js Server Actions対応）
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// fetchのポリフィル（未定義の場合のみ）
if (typeof global.fetch === "undefined") {
  global.fetch = jest.fn(() =>
    Promise.resolve({
      json: () => Promise.resolve({}),
      text: () => Promise.resolve(""),
      ok: true,
      status: 200,
    })
  );
}
