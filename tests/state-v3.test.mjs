import { test } from "node:test";
import assert from "node:assert/strict";
import { defaultState, load } from "../js/state.js";

function mem() {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, v),
  };
}

test("defaultState は settings.pin=null・version3", () => {
  const s = defaultState();
  assert.equal(s.version, 3);
  assert.deepEqual(s.settings, { pin: null });
});

test("v2データはv3デフォルトにリセット", () => {
  const st = mem();
  st.setItem(
    "manabi-quest-v1",
    JSON.stringify({
      version: 2,
      profiles: [],
      progress: {},
      attempts: [],
    }),
  );
  const s = load(st);
  assert.equal(s.version, 3);
  assert.deepEqual(s.settings, { pin: null });
});
