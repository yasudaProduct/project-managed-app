/**
 * @jest-environment node
 */
import { decodeTextFile } from "@/utils/text-decoding";

const EXPECTED_TEXT = "件名,開始日\r\n定例会議,2026/11/2\r\n";

/** EXPECTED_TEXT を Shift_JIS でエンコードしたバイト列 */
const SHIFT_JIS_BYTES = [
  0x8c, 0x8f, 0x96, 0xbc, 0x2c, 0x8a, 0x4a, 0x8e, 0x6e, 0x93, 0xfa, 0x0d, 0x0a, 0x92, 0xe8, 0x97, 0xe1, 0x89, 0xef,
  0x8b, 0x63, 0x2c, 0x32, 0x30, 0x32, 0x36, 0x2f, 0x31, 0x31, 0x2f, 0x32, 0x0d, 0x0a,
];

const toArrayBuffer = (bytes: Uint8Array): ArrayBuffer =>
  bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;

describe("decodeTextFile", () => {
  it("Shift_JIS のファイルを文字化けせずに読み込むこと", () => {
    expect(decodeTextFile(toArrayBuffer(new Uint8Array(SHIFT_JIS_BYTES)))).toBe(EXPECTED_TEXT);
  });

  it("BOMなしUTF-8のファイルを読み込むこと", () => {
    expect(decodeTextFile(toArrayBuffer(new TextEncoder().encode(EXPECTED_TEXT)))).toBe(EXPECTED_TEXT);
  });

  it("BOM付きUTF-8のファイルはBOMを除いて読み込むこと", () => {
    const body = new TextEncoder().encode(EXPECTED_TEXT);
    const bytes = new Uint8Array([0xef, 0xbb, 0xbf, ...body]);

    expect(decodeTextFile(toArrayBuffer(bytes))).toBe(EXPECTED_TEXT);
  });

  it("BOM付きUTF-16LEのファイルを読み込むこと", () => {
    const bytes = new Uint8Array(2 + EXPECTED_TEXT.length * 2);
    bytes.set([0xff, 0xfe]);
    for (let i = 0; i < EXPECTED_TEXT.length; i++) {
      const code = EXPECTED_TEXT.charCodeAt(i);
      bytes[2 + i * 2] = code & 0xff;
      bytes[3 + i * 2] = code >> 8;
    }

    expect(decodeTextFile(toArrayBuffer(bytes))).toBe(EXPECTED_TEXT);
  });

  it("ASCIIのみのファイルを読み込むこと", () => {
    const text = "Subject,Start Date\r\nTeam meeting,11/2/2026\r\n";

    expect(decodeTextFile(toArrayBuffer(new TextEncoder().encode(text)))).toBe(text);
  });
});
