// 画面描画と遷移。ロジックはすべて他モジュールに委譲する(ここだけDOM依存)
import { generateSession } from "./math-gen.js";
import { createBattle, answer } from "./battle.js";
import { pickEncounter } from "./capture.js";
import { load, save, recordSession } from "./state.js";
import { todayString } from "./streak.js";
import { MONSTERS } from "../data/monsters.js";

const app = {
  state: load(localStorage),
  profileId: null,
  battle: null,
  input: "",
};

const $ = (sel) => document.querySelector(sel);
function show(id) {
  document
    .querySelectorAll(".screen")
    .forEach((s) => s.classList.add("hidden"));
  $(id).classList.remove("hidden");
}
function face(m, cls = "face") {
  return m.img
    ? `<img class="monster-img" src="${m.img}" alt="${m.name}">`
    : `<span class="${cls}">${m.emoji}</span>`;
}
function profile() {
  return app.state.profiles.find((p) => p.id === app.profileId);
}
function progress() {
  return app.state.progress[app.profileId];
}

function renderProfile() {
  $("#screen-profile").innerHTML = `
    <h1>まなびクエスト</h1>
    <div class="card">だれが あそぶ?</div>
    ${app.state.profiles
      .map(
        (p) => `
      <button class="profile-btn" data-id="${p.id}">
        <span class="avatar">${p.avatar}</span>${p.nickname}
      </button>`,
      )
      .join("")}
  `;
  document.querySelectorAll(".profile-btn").forEach((b) =>
    b.addEventListener("click", () => {
      app.profileId = b.dataset.id;
      renderHome();
    }),
  );
  show("#screen-profile");
}

function renderHome() {
  const prog = progress();
  $("#screen-home").innerHTML = `
    <h1>${profile().avatar} ${profile().nickname}</h1>
    <div class="card streak">🔥 れんぞく <b>${prog.streak}</b> 日 / ずかん <b>${prog.monsters.length}</b>/${MONSTERS.length}</div>
    <button id="btn-battle">⚔️ バトルに でかける</button>
    <button id="btn-zukan" class="secondary">📖 モンスターずかん</button>
    <button id="btn-back" class="secondary">👤 プレイヤーをかえる</button>
  `;
  $("#btn-battle").addEventListener("click", startBattle);
  $("#btn-zukan").addEventListener("click", renderZukan);
  $("#btn-back").addEventListener("click", renderProfile);
  show("#screen-home");
}

function startBattle() {
  const questions = generateSession(profile().gradeBand, 10);
  const monster = pickEncounter(MONSTERS);
  app.battle = createBattle(questions, monster);
  app.input = "";
  renderQuestion();
  show("#screen-battle");
}

function renderQuestion() {
  const b = app.battle;
  const qn = b.questions[b.index];
  $("#screen-battle").innerHTML = `
    <div class="enemy card">
      <div>やせいの <b>${b.monster.name}</b> が あらわれた!</div>
      ${face(b.monster)}
      <div class="hpbar"><div style="width:${(b.hp / b.maxHp) * 100}%"></div></div>
      <div>だい ${b.index + 1} もん / ${b.questions.length}</div>
    </div>
    <div class="qtext">${qn.text}</div>
    <div class="answer-display" id="ans"></div>
    <div class="keypad">
      ${[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => `<button data-k="${n}">${n}</button>`).join("")}
      <button data-k="del">⌫</button>
      <button data-k="0">0</button>
      <button data-k="ok" class="ok">こたえる!</button>
    </div>
  `;
  document
    .querySelectorAll(".keypad button")
    .forEach((btn) =>
      btn.addEventListener("click", () => onKey(btn.dataset.k)),
    );
  updateAnswerDisplay();
}

function updateAnswerDisplay() {
  $("#ans").textContent = app.input;
}

function onKey(k) {
  if (k === "del") {
    app.input = app.input.slice(0, -1);
    updateAnswerDisplay();
    return;
  }
  if (k === "ok") {
    if (app.input !== "") submitAnswer();
    return;
  }
  if (app.input.length < 4) {
    app.input += k;
    updateAnswerDisplay();
  }
}

function submitAnswer() {
  const { battle, correct, question } = answer(app.battle, app.input);
  app.battle = battle;
  app.input = "";
  const fb = document.createElement("div");
  fb.className = "feedback";
  fb.innerHTML = correct
    ? `<div class="mark">⭕</div><div>こうげき せいこう! ${question.text.replace("?", question.answer)}</div>
       <button id="fb-next">つぎへ ▶</button>`
    : `<div class="mark">❌</div><div>こたえは <b>${question.answer}</b></div>
       <div class="explain">💡 ${question.explanation}</div>
       <button id="fb-next">つぎへ ▶</button>`;
  document.body.appendChild(fb);
  fb.querySelector("#fb-next").addEventListener("click", () => {
    fb.remove();
    if (app.battle.finished) finishBattle();
    else renderQuestion();
  });
}

function finishBattle() {
  const b = app.battle;
  const before = progress().streak;
  app.state = recordSession(app.state, app.profileId, b, todayString());
  save(localStorage, app.state);
  const after = progress().streak;
  const owned = progress().monsters;
  $("#screen-result").innerHTML = `
    <div class="get-title">🎉 ${b.monster.name} を ゲット!</div>
    <div class="big-face">${face(b.monster)}</div>
    <div class="card">
      <div><span class="type-badge">${b.monster.type}</span> レアど: ${b.monster.rarity}</div>
      <div style="margin-top:8px">💡 ${b.monster.trivia}</div>
    </div>
    <div class="card streak">せいかい ${b.correctCount}/${b.questions.length} もん
      ${after > before ? `<br>🔥 れんぞく ${after} 日に なった!` : ""}
      <br>📖 ずかん ${owned.length}/${MONSTERS.length}</div>
    <button id="btn-home">ホームへ もどる</button>
  `;
  $("#btn-home").addEventListener("click", renderHome);
  show("#screen-result");
}

function renderZukan() {
  const owned = new Set(progress().monsters);
  $("#screen-zukan").innerHTML = `
    <h1>📖 モンスターずかん (${owned.size}/${MONSTERS.length})</h1>
    <div class="zukan-grid">
      ${MONSTERS.map(
        (m) => `
        <div class="zukan-cell rar-${m.rarity} ${owned.has(m.id) ? "" : "unowned"}" data-id="${m.id}">
          ${face(m)}<div>${owned.has(m.id) ? m.name : "???"}</div>
        </div>`,
      ).join("")}
    </div>
    <div class="card" id="zukan-detail">モンスターを タップすると せつめいが 見られるよ</div>
    <button id="btn-home2" class="secondary">ホームへ もどる</button>
  `;
  document.querySelectorAll(".zukan-cell").forEach((c) =>
    c.addEventListener("click", () => {
      const m = MONSTERS.find((x) => x.id === c.dataset.id);
      $("#zukan-detail").innerHTML = owned.has(m.id)
        ? `<b>${m.name}</b> <span class="type-badge">${m.type}</span> (${m.rarity})<br>💡 ${m.trivia}`
        : `??? まだ つかまえていないよ`;
    }),
  );
  $("#btn-home2").addEventListener("click", renderHome);
  show("#screen-zukan");
}

renderProfile();
if ("serviceWorker" in navigator)
  navigator.serviceWorker.register("./sw.js").catch(() => {});
