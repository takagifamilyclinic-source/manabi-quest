import { test } from "node:test";
import assert from "node:assert/strict";
import { englishSkills, makeEnglishQuestion } from "../js/english-quiz.js";
import { buildSession } from "../js/session.js";

test("englishSkills は全学年で mean/word の2形式", () => {
  for (const g of [1, 2, 3, 4])
    assert.deepEqual(englishSkills(g), [`eng-mean-g${g}`, `eng-word-g${g}`]);
});

test("英→日: 4択・正解含有・重複なし・speak=出題語・1,2年はカナ併記", () => {
  for (const g of [1, 2, 3, 4]) {
    for (let i = 0; i < 300; i++) {
      const q = makeEnglishQuestion(`eng-mean-g${g}`);
      assert.equal(q.subject, "english");
      assert.equal(q.choices.length, 4);
      assert.ok(q.choices.includes(q.answer));
      assert.equal(new Set(q.choices).size, 4);
      assert.ok(
        q.speak && q.text.startsWith(q.speak),
        `speak=${q.speak} text=${q.text}`,
      );
      if (g <= 2)
        assert.match(
          q.text,
          /（[ァ-ヶー・\s]+）/u,
          `g${g} カナ併記なし: ${q.text}`,
        );
      else
        assert.doesNotMatch(
          q.text,
          /（[ァ-ヶー・\s]+）/u,
          `g${g} にカナ併記: ${q.text}`,
        );
    }
  }
});

test("日→英: 4択・正解含有・重複なし・speakなし", () => {
  for (const g of [1, 2, 3, 4]) {
    for (let i = 0; i < 300; i++) {
      const q = makeEnglishQuestion(`eng-word-g${g}`);
      assert.equal(q.choices.length, 4);
      assert.ok(q.choices.includes(q.answer));
      assert.equal(new Set(q.choices).size, 4);
      assert.equal(q.speak, undefined, "日→英にspeakを付けない(正解バレ防止)");
    }
  }
});

test("buildSession が english を受け付け10問返す", () => {
  const qs = buildSession(3, "english", { count: 10 });
  assert.equal(qs.length, 10);
  for (const q of qs) assert.equal(q.subject, "english");
});

test("未知のskillTag/学年はthrow", () => {
  assert.throws(() => makeEnglishQuestion("eng-mean-g9"));
  assert.throws(() => makeEnglishQuestion("eng-foo-g1"));
});
