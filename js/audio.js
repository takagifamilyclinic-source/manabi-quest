import { TRACKS, SFX } from "./audio-data.js";
import { clampVolume, noteToFreq, parseAudioSettings } from "./audio-util.js";

const STORAGE_KEY = "manabi-audio";
// 声部名 → 波形（melody=8bit矩形波、伴奏/ベース=丸い三角波、SFX=矩形波）
const WAVE = {
  melody: "square",
  harmony: "triangle",
  bass: "triangle",
  sfx: "square",
};
const LOOKAHEAD = 0.2; // 秒: 先読み
const TICK = 25; // ms: スケジューラ間隔

function acCtor() {
  return (
    typeof window !== "undefined" &&
    (window.AudioContext || window.webkitAudioContext)
  );
}

let ctx = null;
let master = null; // 音量ノード
let musicGain = null;
let sfxGain = null;
let settings = parseAudioSettings(
  typeof localStorage !== "undefined"
    ? localStorage.getItem(STORAGE_KEY)
    : null,
);
let current = null; // 現在のループ曲名 or null
let timer = null;
let voiceState = null; // { [voice]: {seq, idx, time, beatSec, wave, dest} }
let jingleTimeout = null;

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {}
}

function applyVolume() {
  if (master) master.gain.value = settings.muted ? 0 : settings.volume;
}

function ensureCtx() {
  if (ctx || !acCtor()) return;
  const AC = acCtor();
  ctx = new AC();
  master = ctx.createGain();
  applyVolume();
  master.connect(ctx.destination);
  musicGain = ctx.createGain();
  musicGain.gain.value = 0.5;
  musicGain.connect(master);
  sfxGain = ctx.createGain();
  sfxGain.gain.value = 0.9;
  sfxGain.connect(master);
}

// 1音を at 秒から dur 秒ぶん、簡易ADSRで鳴らす
function playNote(wave, freq, at, dur, dest) {
  if (!ctx || freq <= 0) return;
  const o = ctx.createOscillator();
  o.type = wave;
  o.frequency.value = freq;
  const g = ctx.createGain();
  const a = 0.008;
  const r = Math.min(0.06, dur * 0.4);
  const peak = 0.9;
  const sus = 0.6;
  const relStart = Math.max(at + a + 0.02, at + dur - r);
  g.gain.setValueAtTime(0, at);
  g.gain.linearRampToValueAtTime(peak, at + a);
  g.gain.linearRampToValueAtTime(sus, at + a + 0.03);
  g.gain.setValueAtTime(sus, relStart);
  g.gain.linearRampToValueAtTime(0.0001, at + dur);
  o.connect(g);
  g.connect(dest);
  o.start(at);
  o.stop(at + dur + 0.03);
}

function stopScheduler() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
  if (jingleTimeout) {
    clearTimeout(jingleTimeout);
    jingleTimeout = null;
  }
  voiceState = null;
}

// 曲を開始（loop=true でループ、false でワンショット）
function startSong(name, loop) {
  const tr = TRACKS[name];
  if (!tr || !ctx) return;
  stopScheduler();
  const beatSec = 60 / tr.bpm;
  const startAt = ctx.currentTime + 0.06;
  voiceState = {};
  for (const [vn, seq] of Object.entries(tr.voices)) {
    voiceState[vn] = {
      seq,
      idx: 0,
      time: startAt,
      beatSec,
      wave: WAVE[vn] || "square",
      dest: musicGain,
    };
  }
  timer = setInterval(() => scheduleTick(loop), TICK);
  scheduleTick(loop);
}

function scheduleTick(loop) {
  if (!ctx || !voiceState) return;
  const horizon = ctx.currentTime + LOOKAHEAD;
  for (const st of Object.values(voiceState)) {
    while (st.time < horizon) {
      if (st.idx >= st.seq.length) {
        if (loop) st.idx = 0;
        else break;
      }
      const ev = st.seq[st.idx];
      const dur = ev.d * st.beatSec;
      if (ev.n !== "R") {
        playNote(st.wave, noteToFreq(ev.n), st.time, dur, st.dest);
      }
      st.time += dur;
      st.idx++;
    }
  }
}

function songDuration(name) {
  const tr = TRACKS[name];
  const beatSec = 60 / tr.bpm;
  return Math.max(
    ...Object.values(tr.voices).map(
      (seq) => seq.reduce((s, ev) => s + ev.d, 0) * beatSec,
    ),
  );
}

export const audio = {
  init() {
    ensureCtx();
    if (ctx && ctx.state === "suspended") ctx.resume();
  },
  playTrack(name) {
    ensureCtx();
    if (!ctx) return;
    if (current === name && timer) return; // 既に同じ曲が再生中
    current = name;
    startSong(name, true);
  },
  playJingle(name, onDone) {
    ensureCtx();
    if (!ctx) {
      if (onDone) onDone();
      return;
    }
    current = null; // ループ扱いを解除
    startSong(name, false);
    jingleTimeout = setTimeout(
      () => {
        stopScheduler();
        if (onDone) onDone();
      },
      (songDuration(name) + 0.1) * 1000,
    );
  },
  stopTrack() {
    current = null;
    stopScheduler();
  },
  playSfx(name) {
    ensureCtx();
    if (!ctx) return;
    const seq = SFX[name];
    if (!seq) return;
    let t = ctx.currentTime + 0.02;
    for (const ev of seq) {
      if (ev.n !== "R") playNote(WAVE.sfx, noteToFreq(ev.n), t, ev.d, sfxGain);
      t += ev.d; // SFX の d は秒（beatSec=1）
    }
  },
  setMuted(b) {
    settings.muted = !!b;
    applyVolume();
    persist();
  },
  isMuted() {
    return settings.muted;
  },
  setVolume(v) {
    settings.volume = clampVolume(v);
    applyVolume();
    persist();
  },
  getVolume() {
    return settings.volume;
  },
};
