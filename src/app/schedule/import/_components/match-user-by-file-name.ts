export type FileNameMatchUser = {
  id: string;
  name: string;
  email: string;
  displayName?: string;
};

export type FileNameUserMatch =
  | { status: "matched"; userId: string }
  | { status: "ambiguous"; userIds: string[] }
  | { status: "unmatched" };

/** ファイル名を語に区切る文字（メールアドレスや個人コードを壊さないよう「.」「-」「@」は含めない） */
const TOKEN_SEPARATOR_REGEX = /[\s_,、()[\]{}【】「」『』]+/;

const normalize = (text: string): string => text.normalize("NFKC").toLowerCase().replace(/\s+/g, "");

const stripCsvExtension = (fileName: string): string => fileName.replace(/\.csv$/i, "");

function keysOf(user: FileNameMatchUser): Set<string> {
  const emailLocalPart = user.email.split("@")[0] ?? "";
  return new Set(
    [user.id, user.name, user.displayName ?? "", user.email, emailLocalPart].map(normalize).filter((key) => key !== "")
  );
}

function findUsersByKeys(candidates: string[], users: ReadonlyArray<FileNameMatchUser>): string[] {
  const normalizedCandidates = new Set(candidates.map(normalize).filter((candidate) => candidate !== ""));
  return users
    .filter((user) => [...keysOf(user)].some((key) => normalizedCandidates.has(key)))
    .map((user) => user.id);
}

/**
 * ファイル名から取り込み先ユーザーを推定する
 * @description 個人コード・氏名・表示名・メールアドレス（@より前を含む）と完全一致で照合する。
 * ファイル名全体での一致を優先し、なければ区切られた語ごとに照合する。
 * 推定はあくまで初期値であり、利用者が画面で確認・変更する前提。
 */
export function matchUserByFileName(fileName: string, users: ReadonlyArray<FileNameMatchUser>): FileNameUserMatch {
  const baseName = stripCsvExtension(fileName).normalize("NFKC");

  const wholeMatches = findUsersByKeys([baseName], users);
  const userIds = wholeMatches.length > 0 ? wholeMatches : findUsersByKeys(baseName.split(TOKEN_SEPARATOR_REGEX), users);

  if (userIds.length === 1) {
    return { status: "matched", userId: userIds[0] };
  }
  if (userIds.length > 1) {
    return { status: "ambiguous", userIds };
  }
  return { status: "unmatched" };
}
