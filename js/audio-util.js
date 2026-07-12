// 純ロジック（AudioContext/localStorage に触れない・node --test 対象）
const NOTE_INDEX = {
  C: 0, "C#": 1, D: 2, "D#": 3, E: 4, F: 5,
  "F#": 6, G: 7, "G#": 8, A: 9, "A#": 10, B: 11,
};

// 音名(例 "A4","C#5") → 周波数Hz。休符/不正は 0。A4=440基準・等分平均律。
export function noteToFreq(note) {
  if (typeof note !== "string" || note === "R") return 0;
  const m = /^([A-G]#?)(-?\d+)$/.exec(note);
  if (!m) return 0;
  const midi = NOTE_INDEX[m[1]] + (parseInt(m[2], 10) + 1) * 12; // A4 => 69
  return 440 * Math.pow(2, (midi - 69) / 12);
}

const FIELD_SCREENS = new Set([
  "#screen-home", "#screen-subject", "#screen-zukan", "#screen-badges",
  "#screen-profile", "#screen-parent", "#screen-reward", "#screen-result",
]);

// 画面ID → ループ曲名。未知は null（曲を変えない）。
export function trackForScreen(screenId) {
  if (screenId === "#screen-battle") return "battle";
  if (FIELD_SCREENS.has(screenId)) return "field";
  return null;
}

// 音量を [0,1] に丸める。非有限は既定 0.7。
export function clampVolume(x) {
  const n = Number(x);
  if (!Number.isFinite(n)) return 0.7;
  return Math.min(1, Math.max(0, n));
}

// localStorage文字列を安全にパース。壊れていれば既定値。
export function parseAudioSettings(raw) {
  const def = { muted: false, volume: 0.7 };
  if (!raw) return { ...def };
  try {
    const o = JSON.parse(raw);
    return { muted: !!o.muted, volume: clampVolume(o.volume) };
  } catch {
    return { ...def };
  }
}
