import { test } from "node:test";
import assert from "node:assert/strict";
import { SCIENCE_G3 } from "../data/science/g3.js";

export const UNITS_G3 = new Set([
  "shokubutsu",
  "konchu",
  "hikari",
  "oto",
  "jishaku",
  "denki",
  "kazegomu",
  "omosa",
]);

export function validateScience(list, grade, units, label) {
  assert.ok(
    list.length >= 46 && list.length <= 54,
    `${label} 問数 ~50 (実際 ${list.length})`,
  );
  assert.equal(
    new Set(list.map((e) => e.q)).size,
    list.length,
    `${label} q重複あり`,
  );
  const tagRe = new RegExp(`^sci-([a-z]+)-g${grade}$`);
  for (const e of list) {
    const m = e.skillTag.match(tagRe);
    assert.ok(m, `${label} skillTag形式不正: ${e.skillTag}`);
    assert.ok(units.has(m[1]), `${label} 未知unit: ${e.skillTag}`);
    assert.ok(e.q && e.q.length >= 1, `${label} q空: ${e.skillTag}`);
    assert.ok(e.answer && e.answer.length >= 1, `${label} answer空: ${e.q}`);
    assert.ok(e.explain && e.explain.length >= 1, `${label} explain空: ${e.q}`);
    assert.equal(
      e.distractors.length,
      3,
      `${label} distractorsが3つでない: ${e.q}`,
    );
    for (const d of e.distractors)
      assert.ok(d && d.length >= 1, `${label} distractor空: ${e.q}`);
    const four = [e.answer, ...e.distractors];
    assert.equal(new Set(four).size, 4, `${label} 選択肢に重複: ${e.q}`);
    assert.ok(
      !e.distractors.includes(e.answer),
      `${label} distractorに正解混入: ${e.q}`,
    );
    assert.ok(!e.q.includes(e.answer), `${label} 問題文に正解が露出: ${e.q}`);
  }
  for (const u of units) {
    const n = list.filter((e) => e.skillTag === `sci-${u}-g${grade}`).length;
    assert.ok(
      n >= 3,
      `${label} unit ${u} の問数が少なすぎ (${n}) — 各単元3問以上`,
    );
  }
}

test("理科g3: 約50問・形式・重複なし・全単元3問以上", () =>
  validateScience(SCIENCE_G3, 3, UNITS_G3, "g3"));

import { SCIENCE_G4 } from "../data/science/g4.js";

export const UNITS_G4 = new Set([
  "kisetsu",
  "tenki",
  "mizusugata",
  "kukimizu",
  "denkihataraki",
  "tsukihoshi",
  "karada",
  "mizuyukue",
]);

test("理科g4: 約50問・形式・重複なし・全単元3問以上", () =>
  validateScience(SCIENCE_G4, 4, UNITS_G4, "g4"));

test("理科 全体: q が学年をまたいでユニーク・合計 ~100", () => {
  const all = [...SCIENCE_G3, ...SCIENCE_G4];
  assert.ok(
    all.length >= 92 && all.length <= 108,
    `合計 ~100 (実際 ${all.length})`,
  );
  const dup = all.map((e) => e.q).filter((q, i, a) => a.indexOf(q) !== i);
  assert.deepEqual(dup, [], `学年間で q 重複: ${dup.join(" / ")}`);
});
