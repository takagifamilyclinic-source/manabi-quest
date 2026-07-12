import { test } from "node:test";
import assert from "node:assert/strict";
import {
  noteToFreq,
  trackForScreen,
  clampVolume,
  parseAudioSettings,
} from "../js/audio-util.js";

test("noteToFreq: A4 は 440Hz", () => {
  assert.ok(Math.abs(noteToFreq("A4") - 440) < 0.001);
});

test("noteToFreq: 中央ドC4 は約261.63Hz", () => {
  assert.ok(Math.abs(noteToFreq("C4") - 261.626) < 0.01);
});

test("noteToFreq: シャープと1オクターブ上", () => {
  assert.ok(Math.abs(noteToFreq("A5") - 880) < 0.001);
  assert.ok(Math.abs(noteToFreq("A#4") - 466.164) < 0.01);
});

test("noteToFreq: 休符Rと不正入力は0", () => {
  assert.equal(noteToFreq("R"), 0);
  assert.equal(noteToFreq(""), 0);
  assert.equal(noteToFreq("H9"), 0);
  assert.equal(noteToFreq(null), 0);
  assert.equal(noteToFreq("B#4"), 0);
  assert.equal(noteToFreq("E#4"), 0);
  assert.equal(noteToFreq("B#"), 0);
});

test("trackForScreen: バトルはbattle、他の主要画面はfield", () => {
  assert.equal(trackForScreen("#screen-battle"), "battle");
  for (const id of [
    "#screen-home",
    "#screen-subject",
    "#screen-zukan",
    "#screen-badges",
    "#screen-profile",
    "#screen-parent",
    "#screen-reward",
    "#screen-result",
  ]) {
    assert.equal(trackForScreen(id), "field", id);
  }
});

test("trackForScreen: 未知IDはnull", () => {
  assert.equal(trackForScreen("#screen-unknown"), null);
  assert.equal(trackForScreen(""), null);
});

test("clampVolume: 範囲・境界・非有限", () => {
  assert.equal(clampVolume(0.5), 0.5);
  assert.equal(clampVolume(-1), 0);
  assert.equal(clampVolume(2), 1);
  assert.equal(clampVolume(0), 0);
  assert.equal(clampVolume(1), 1);
  assert.equal(clampVolume(NaN), 0.7);
  assert.equal(clampVolume("x"), 0.7);
});

test("parseAudioSettings: 正常・欠損・壊れJSON・範囲外", () => {
  assert.deepEqual(parseAudioSettings('{"muted":true,"volume":0.3}'), {
    muted: true,
    volume: 0.3,
  });
  assert.deepEqual(parseAudioSettings(null), { muted: false, volume: 0.7 });
  assert.deepEqual(parseAudioSettings("not json"), {
    muted: false,
    volume: 0.7,
  });
  assert.deepEqual(parseAudioSettings('{"muted":1}'), {
    muted: true,
    volume: 0.7,
  });
  assert.deepEqual(parseAudioSettings('{"volume":5}'), {
    muted: false,
    volume: 1,
  });
});
