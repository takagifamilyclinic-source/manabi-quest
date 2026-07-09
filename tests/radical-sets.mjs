// 部首の妥当性チェック用ヘルパ(テスト専用)
// 基底214部首 = Unicode康熙部首ブロック(U+2F00..U+2FD5)をNFKC正規化した通常漢字
export const BASE_RADICALS = new Set(
  Array.from({ length: 214 }, (_, i) =>
    String.fromCodePoint(0x2f00 + i).normalize("NFKC"),
  ),
);

// 学校辞書流の偏・冠バリエーション(g1/g2既存データ+今回抽出で使用する形)
// ※答え合わせ(Task 1)で確定した集合に合わせて増減してよい(理由をコミットに書く)
export const VARIANT_RADICALS = new Set([
  "亻",
  "刂",
  "忄",
  "扌",
  "攵",
  "氵",
  "灬",
  "犭",
  "王",
  "礻",
  "罒",
  "艹",
  "衤",
  "辶",
  "阝",
  "飠",
  "ネ",
  "川",
  "戸",
  "耂",
  "西",
  "青",
  "麦",
  "黄",
  "黒",
]);

export function isValidRadical(r) {
  return BASE_RADICALS.has(r) || VARIANT_RADICALS.has(r);
}
