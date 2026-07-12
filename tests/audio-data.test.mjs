import { test } from "node:test";
import assert from "node:assert/strict";
import { TRACKS, SFX } from "../js/audio-data.js";
import { noteToFreq } from "../js/audio-util.js";

function checkSeq(seq, label) {
  assert.ok(Array.isArray(seq) && seq.length > 0, `${label} は非空配列`);
  for (const ev of seq) {
    assert.ok(typeof ev.n === "string", `${label} n は文字列`);
    assert.ok(typeof ev.d === "number" && ev.d > 0, `${label} d>0`);
    if (ev.n !== "R") {
      assert.ok(noteToFreq(ev.n) > 0, `${label} 音名 ${ev.n} は解釈可能`);
    }
  }
}

test("TRACKS: 3曲そろっている", () => {
  assert.deepEqual(Object.keys(TRACKS).sort(), ["battle", "field", "victory"]);
});

test("TRACKS: 各曲の構造・音名・拍が妥当", () => {
  for (const [name, tr] of Object.entries(TRACKS)) {
    assert.ok(tr.bpm > 0, `${name} bpm>0`);
    assert.equal(typeof tr.loop, "boolean", `${name} loop は真偽`);
    assert.ok(tr.voices && tr.voices.melody, `${name} melody 必須`);
    for (const [vn, seq] of Object.entries(tr.voices)) {
      checkSeq(seq, `${name}.${vn}`);
    }
  }
});

test("TRACKS: field/battle はループ、victory はワンショット", () => {
  assert.equal(TRACKS.field.loop, true);
  assert.equal(TRACKS.battle.loop, true);
  assert.equal(TRACKS.victory.loop, false);
});

test("TRACKS: victory は短い（全声部の最長 < 4秒）", () => {
  const tr = TRACKS.victory;
  const beatSec = 60 / tr.bpm;
  const longest = Math.max(
    ...Object.values(tr.voices).map(
      (seq) => seq.reduce((s, ev) => s + ev.d, 0) * beatSec,
    ),
  );
  assert.ok(longest < 4, `victory 尺 ${longest.toFixed(2)}s < 4s`);
});

test("TRACKS: 各曲は全声部の拍合計が一致（ループ同期）", () => {
  for (const [name, tr] of Object.entries(TRACKS)) {
    const totals = Object.values(tr.voices).map((seq) =>
      seq.reduce((s, ev) => s + ev.d, 0),
    );
    const diff = Math.max(...totals) - Math.min(...totals);
    assert.ok(
      diff < 1e-9,
      `${name} の声部間で拍合計が不一致: ${totals.join("/")}`,
    );
  }
});

test("SFX: 4種そろい・妥当", () => {
  assert.deepEqual(Object.keys(SFX).sort(), [
    "button",
    "capture",
    "correct",
    "wrong",
  ]);
  for (const [name, seq] of Object.entries(SFX)) checkSeq(seq, `SFX.${name}`);
});
