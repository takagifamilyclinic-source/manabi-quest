// 画面描画と遷移。ロジックはすべて他モジュールに委譲する(ここだけDOM依存)
import { buildSession } from "./session.js";
import { createBattle, answer } from "./battle.js";
import { pickEncounter } from "./capture.js";
import { load, save, recordSession, STORAGE_KEY } from "./state.js";
import { todayString } from "./streak.js";
import { MONSTERS } from "../data/monsters.js";
import { weaknessTop } from "./weakness.js";

const app = {
  state: load(localStorage),
  profileId: null,
  battle: null,
  input: "",
};

const esc = (s) =>
  String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );

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
  attachParentGear();
}

function attachParentGear() {
  if ($("#screen-profile .parent-gear")) return; // 二重付与防止
  const gear = document.createElement("div");
  gear.textContent = "⚙";
  gear.className = "parent-gear";
  let timer = null;
  const start = () => {
    timer = setTimeout(openParentGate, 900);
  };
  const cancel = () => clearTimeout(timer);
  gear.addEventListener("touchstart", start);
  gear.addEventListener("mousedown", start);
  ["touchend", "touchcancel", "mouseup", "mouseleave"].forEach((e) =>
    gear.addEventListener(e, cancel),
  );
  $("#screen-profile").appendChild(gear);
}

function openParentGate() {
  const pin = app.state.settings.pin;
  $("#screen-parent").innerHTML = pin
    ? `<h1>おうちの人ページ</h1><div class="card">PINを いれてください</div>
       <input id="pin-in" class="pin" inputmode="numeric" maxlength="4" />
       <button id="pin-ok">かくにん</button><button id="pin-cancel" class="secondary">もどる</button>
       <div id="pin-msg"></div>`
    : `<h1>おうちの人ページ</h1><div class="card">はじめに 4けたのPINを きめてください</div>
       <input id="pin-set" class="pin" inputmode="numeric" maxlength="4" />
       <button id="pin-save">せってい</button><button id="pin-cancel" class="secondary">もどる</button>`;
  show("#screen-parent");
  $("#pin-cancel").addEventListener("click", renderProfile);
  if (pin) {
    $("#pin-ok").addEventListener("click", () => {
      if ($("#pin-in").value === pin) renderParentDash();
      else $("#pin-msg").textContent = "PINが ちがいます";
    });
  } else {
    $("#pin-save").addEventListener("click", () => {
      const v = $("#pin-set").value;
      if (/^\d{4}$/.test(v)) {
        app.state.settings.pin = v;
        save(localStorage, app.state);
        renderParentDash();
      }
    });
  }
}

function renderParentDash() {
  const rows = app.state.profiles
    .map((p) => {
      const pr = app.state.progress[p.id];
      const top =
        weaknessTop(app.state.attempts, p.id, 5)
          .map(
            (t) =>
              `${esc(t.skillTag)} ${Math.round(t.rate * 100)}%(${t.tries})`,
          )
          .join("<br>") || "きろく なし";
      return `<div class="card"><b>${esc(p.avatar)} ${esc(p.nickname)}</b>
      <div>れんぞく ${pr.streak}日 / セッション ${pr.sessions} / ずかん ${pr.monsters.length}</div>
      <div style="margin-top:6px"><b>にがて トップ5</b><br>${top}</div></div>`;
    })
    .join("");
  $("#screen-parent").innerHTML = `
    <h1>おうちの人ページ</h1>${rows}
    <button id="p-export">きろくを 書き出す</button>
    <textarea id="p-export-area" class="export" readonly></textarea>
    <button id="p-pin" class="secondary">PINを かえる</button>
    <button id="p-reset" class="secondary">きろくを リセット</button>
    <button id="p-back" class="secondary">もどる</button>`;
  $("#p-export").addEventListener("click", () => {
    const { settings, ...rest } = app.state;
    const safe = {
      ...rest,
      settings: { ...settings, pin: settings.pin ? "****" : null },
    };
    $("#p-export-area").value = JSON.stringify(safe, null, 2);
    $("#p-export-area").select();
  });
  $("#p-pin").addEventListener("click", () => {
    app.state.settings.pin = null;
    save(localStorage, app.state);
    openParentGate();
  });
  $("#p-reset").addEventListener("click", () => {
    if (confirm("すべての きろくを けします。よいですか?")) {
      localStorage.removeItem(STORAGE_KEY);
      app.state = load(localStorage);
      renderProfile();
    }
  });
  $("#p-back").addEventListener("click", renderProfile);
  show("#screen-parent");
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
  $("#btn-battle").addEventListener("click", renderSubject);
  $("#btn-zukan").addEventListener("click", renderZukan);
  $("#btn-back").addEventListener("click", renderProfile);
  show("#screen-home");
}

function renderSubject() {
  $("#screen-subject").innerHTML = `
    <h1>きょうか を えらぶ</h1>
    <button id="sub-math">➗ さんすう</button>
    <button id="sub-kanji" class="secondary">✏️ かんじ</button>
    <button id="sub-back" class="secondary">もどる</button>
  `;
  $("#sub-math").addEventListener("click", () => startBattle("math"));
  $("#sub-kanji").addEventListener("click", () => startBattle("kanji"));
  $("#sub-back").addEventListener("click", renderHome);
  show("#screen-subject");
}

function startBattle(subject = "math") {
  const questions = buildSession(profile().grade, subject, {
    count: 10,
    attempts: app.state.attempts,
    profileId: app.profileId,
  });
  app.subject = subject;
  const monster = pickEncounter(MONSTERS);
  app.battle = createBattle(questions, monster);
  app.input = "";
  renderQuestion();
  show("#screen-battle");
}

function renderQuestion() {
  const b = app.battle;
  const qn = b.questions[b.index];
  const answerArea = qn.choices
    ? `<div class="choices">${qn.choices
        .map((c) => `<button class="choice" data-c="${c}">${c}</button>`)
        .join("")}</div>`
    : `<div class="answer-display" id="ans"></div>
       <div class="keypad">
         ${[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => `<button data-k="${n}">${n}</button>`).join("")}
         <button data-k="del">⌫</button><button data-k="0">0</button>
         <button data-k="ok" class="ok">こたえる!</button>
       </div>`;
  $("#screen-battle").innerHTML = `
    <div class="enemy card">
      <div>やせいの <b>${b.monster.name}</b> が あらわれた!</div>
      ${face(b.monster)}
      <div class="hpbar"><div style="width:${(b.hp / b.maxHp) * 100}%"></div></div>
      <div>だい ${b.index + 1} もん / ${b.questions.length}</div>
    </div>
    <div class="qtext">${qn.text}</div>
    ${answerArea}
  `;
  if (qn.choices) {
    document.querySelectorAll(".choice").forEach((btn) =>
      btn.addEventListener("click", () => {
        app.input = btn.dataset.c;
        submitAnswer();
      }),
    );
  } else {
    document
      .querySelectorAll(".keypad button")
      .forEach((btn) =>
        btn.addEventListener("click", () => onKey(btn.dataset.k)),
      );
    updateAnswerDisplay();
  }
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
  if (app.battle.finished) return;
  const { battle, correct, question } = answer(app.battle, app.input);
  app.battle = battle;
  app.input = "";
  const fb = document.createElement("div");
  fb.className = "feedback";
  fb.innerHTML = correct
    ? `<div class="mark">⭕</div><div>せいかい! こたえは ${question.answer}</div>
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
