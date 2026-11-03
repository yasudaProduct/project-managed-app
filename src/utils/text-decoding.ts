/**
 * テキストファイルのバイト列を文字コードを自動判定して文字列にする
 * @description BOM があれば UTF-8 / UTF-16 として読む。BOM がなければ UTF-8 として厳密に読み、
 * UTF-8 として不正なバイト列なら Shift_JIS（日本語版 Windows / Outlook の既定）として読む。
 */
export function decodeTextFile(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);

    if (startsWith(bytes, [0xef, 0xbb, 0xbf])) {
        return new TextDecoder("utf-8").decode(bytes);
    }
    if (startsWith(bytes, [0xff, 0xfe])) {
        return new TextDecoder("utf-16le").decode(bytes);
    }
    if (startsWith(bytes, [0xfe, 0xff])) {
        return new TextDecoder("utf-16be").decode(bytes);
    }

    try {
        return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    } catch {
        return new TextDecoder("shift_jis").decode(bytes);
    }
}

function startsWith(bytes: Uint8Array, prefix: readonly number[]): boolean {
    return prefix.every((byte, index) => bytes[index] === byte);
}
