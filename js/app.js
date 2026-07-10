// 画面描画と遷移。ロジックはすべて他モジュールに委譲する(ここだけDOM依存)
import { buildSession } from "./session.js";
import { createBattle, answer } from "./battle.js";
import { pickEncounter } from "./capture.js";
import {
  load,
  save,
  recordSession,
  exchangeReward,
  setTitle,
  STORAGE_KEY,
} from "./state.js";
import {
  BADGES,
  badgeContext,
  badgeStatus,
  earnedBadges,
  newBadges,
} from "./badges.js";
import { todayString } from "./streak.js";
import { MONSTERS } from "../data/monsters.js";
import { weaknessTop } from "./weakness.js";
import {
  levelFromXp,
  ownedCount,
  sessionGain,
  isEvolved,
} from "./progress-calc.js";

const MONSTER_IDS = MONSTERS.map((m) => m.id);

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
// 進化していれば進化後の名前・画像に差し替えた表示用オブジェクトを返す。
// evolveImg が null の間は emoji にフォールバック(face が自動判定)。
function viewOf(m, captures) {
  return isEvolved(captures, m.id)
    ? { ...m, name: m.evolveName, img: m.evolveImg }
    : m;
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
      <div>れんぞく ${pr.streak}日 / セッション ${pr.sessions} / ずかん ${ownedCount(pr.captures)}</div>
      <div style="margin-top:6px"><b>にがて トップ5</b><br>${top}</div></div>`;
    })
    .join("");
  const rewardRows =
    app.state.settings.rewards
      .map(
        (r) => `<div class="rw-row">🎁 ${esc(r.name)} = ${r.cost}pt
      <button class="rw-del secondary" data-id="${esc(r.id)}">けす</button></div>`,
      )
      .join("") || "まだ ありません";
  const childOpts = app.state.profiles
    .map(
      (p) =>
        `<option value="${p.id}">${esc(p.nickname)}(${app.state.progress[p.id].points}pt)</option>`,
    )
    .join("");
  const rewardOpts = app.state.settings.rewards
    .map(
      (r) =>
        `<option value="${esc(r.id)}">${esc(r.name)} (${r.cost}pt)</option>`,
    )
    .join("");
  $("#screen-parent").innerHTML = `
    <h1>おうちの人ページ</h1>${rows}
    <div class="card"><b>🎁 ごほうび一覧</b>
      <div class="rw-list">${rewardRows}</div>
      <input id="rw-name" placeholder="なまえ (れい: アイス)" />
      <input id="rw-cost" inputmode="numeric" placeholder="ひつような ポイント" />
      <button id="rw-add">ついか</button></div>
    <div class="card"><b>🪙 ごほうび交換</b>
      <select id="ex-child">${childOpts}</select>
      <select id="ex-reward">${rewardOpts}</select>
      <button id="ex-do">こうかん</button>
      <div id="ex-msg" class="ex-msg"></div></div>
    <button id="p-export">きろくを 書き出す</button>
    <textarea id="p-export-area" class="export" readonly></textarea>
    <button id="p-pin" class="secondary">PINを かえる</button>
    <button id="p-reset" class="secondary">きろくを リセット</button>
    <button id="p-back" class="secondary">もどる</button>`;
  document.querySelectorAll(".rw-del").forEach((b) =>
    b.addEventListener("click", () => {
      app.state.settings.rewards = app.state.settings.rewards.filter(
        (r) => r.id !== b.dataset.id,
      );
      save(localStorage, app.state);
      renderParentDash();
    }),
  );
  $("#rw-add").addEventListener("click", () => {
    const name = $("#rw-name").value.trim();
    const cost = parseInt($("#rw-cost").value, 10);
    if (name && Number.isInteger(cost) && cost > 0) {
      app.state.settings.rewards.push({
        id: "r" + Date.now() + "-" + app.state.settings.rewards.length,
        name,
        cost,
      });
      save(localStorage, app.state);
      renderParentDash();
    }
  });
  $("#ex-do").addEventListener("click", () => {
    const pid = $("#ex-child").value;
    const reward = app.state.settings.rewards.find(
      (r) => r.id === $("#ex-reward").value,
    );
    if (!reward) {
      $("#ex-msg").textContent = "ごほうびを ついかしてね";
      return;
    }
    const res = exchangeReward(app.state, pid, reward, todayString());
    if (res.ok) {
      app.state = res.state;
      save(localStorage, app.state);
      renderParentDash();
      $("#ex-msg").textContent = `「${reward.name}」を こうかんしました`;
    } else {
      $("#ex-msg").textContent = "ポイントが たりません";
    }
  });
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
  const lv = levelFromXp(prog.xp);
  const titleBadge = BADGES.find((b) => b.id === prog.title);
  $("#screen-home").innerHTML = `
    <h1>${profile().avatar} ${profile().nickname}${
      titleBadge
        ? ` <span class="title-chip">${titleBadge.emoji} ${titleBadge.name}</span>`
        : ""
    }</h1>
    <div class="card streak">🔥 れんぞく <b>${prog.streak}</b> 日 / ずかん <b>${ownedCount(prog.captures)}</b>/${MONSTERS.length}</div>
    <div class="card streak">⭐ Lv <b>${lv.level}</b>
      <div class="xpbar"><div style="width:${(lv.inLevel / lv.need) * 100}%"></div></div>
      🪙 ポイント <b>${prog.points}</b></div>
    <button id="btn-battle">⚔️ バトルに でかける</button>
    <button id="btn-zukan" class="secondary">📖 モンスターずかん</button>
    <button id="btn-badges" class="secondary">🏅 バッジちょう</button>
    <button id="btn-reward" class="secondary">🎁 ごほうび</button>
    <button id="btn-back" class="secondary">👤 プレイヤーをかえる</button>
  `;
  $("#btn-battle").addEventListener("click", renderSubject);
  $("#btn-zukan").addEventListener("click", renderZukan);
  $("#btn-badges").addEventListener("click", renderBadges);
  $("#btn-reward").addEventListener("click", renderReward);
  $("#btn-back").addEventListener("click", renderProfile);
  show("#screen-home");
}

function renderBadges() {
  const ctx = badgeContext(app.state, app.profileId, MONSTER_IDS);
  const earned = earnedBadges(ctx);
  const title = progress().title;
  $("#screen-badges").innerHTML = `
    <h1>🏅 バッジちょう (${earned.size}/${BADGES.length})</h1>
    <div class="badge-grid">
      ${BADGES.map((b) => {
        const st = badgeStatus(b, ctx);
        if (!st.earned)
          return `<div class="badge-cell locked">
            <div class="badge-icon">🔒</div>
            <div class="badge-name">${b.name}</div>
            <div class="badge-left">${
              b.id.startsWith("streak-")
                ? `さいこう れんぞく あと${st.target - st.current}日`
                : `あと${st.target - st.current}${b.unit}`
            }</div>
          </div>`;
        const active = title === b.id;
        return `<button type="button" class="badge-cell earned ${active ? "active" : ""}" data-id="${b.id}" aria-pressed="${active}">
          <div class="badge-icon">${b.emoji}</div>
          <div class="badge-name">${b.name}</div>
          <div class="badge-left">${active ? "そうびちゅう!" : "タップで しょうごうに"}</div>
        </button>`;
      }).join("")}
    </div>
    <button id="badge-back" class="secondary">もどる</button>
  `;
  document.querySelectorAll(".badge-cell.earned").forEach((c) =>
    c.addEventListener("click", () => {
      const id = c.dataset.id;
      app.state = setTitle(
        app.state,
        app.profileId,
        progress().title === id ? null : id,
      );
      save(localStorage, app.state);
      renderBadges();
    }),
  );
  $("#badge-back").addEventListener("click", renderHome);
  show("#screen-badges");
}

function renderSubject() {
  $("#screen-subject").innerHTML = `
    <h1>きょうか を えらぶ</h1>
    <button id="sub-math">➗ さんすう</button>
    <button id="sub-kanji" class="secondary">✏️ かんじ</button>
    <button id="sub-eng" class="secondary">🗣️ えいご</button>
    <button id="sub-back" class="secondary">もどる</button>
  `;
  $("#sub-math").addEventListener("click", () => startBattle("math"));
  $("#sub-kanji").addEventListener("click", () => startBattle("kanji"));
  $("#sub-eng").addEventListener("click", () => startBattle("english"));
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
  const canSpeak = qn.speak && "speechSynthesis" in window;
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
    <div class="qtext">${qn.text}${canSpeak ? ` <button id="btn-speak" class="speak">🔊</button>` : ""}</div>
    ${answerArea}
  `;
  if (canSpeak)
    $("#btn-speak").addEventListener("click", () => {
      const u = new SpeechSynthesisUtterance(qn.speak);
      u.lang = "en-US";
      u.rate = 0.9;
      const en = speechSynthesis
        .getVoices()
        .find((v) => v.lang.startsWith("en"));
      if (en) u.voice = en;
      speechSynthesis.cancel();
      speechSynthesis.speak(u);
    });
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
    ? `<div class="mark">⭕</div><div>せいかい! ${question.choices ? `こたえは ${question.answer}` : question.text.replace("?", question.answer)}</div>
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
  const gain = sessionGain(b);
  const beforeEvolved = isEvolved(progress().captures, b.monster.id);
  const beforeBadges = earnedBadges(
    badgeContext(app.state, app.profileId, MONSTER_IDS),
  );
  app.state = recordSession(app.state, app.profileId, b, todayString());
  save(localStorage, app.state);
  const gotBadges = newBadges(
    beforeBadges,
    earnedBadges(badgeContext(app.state, app.profileId, MONSTER_IDS)),
  );
  const after = progress().streak;
  const captures = progress().captures;
  const owned = ownedCount(captures);
  const afterEvolved = isEvolved(captures, b.monster.id);
  const justEvolved = !beforeEvolved && afterEvolved;
  const view = viewOf(b.monster, captures);
  $("#screen-result").innerHTML = `
    <div class="get-title ${justEvolved ? "evolve" : ""}">${
      justEvolved
        ? `🎉✨ ${b.monster.name} が ${b.monster.evolveName} に しんか!`
        : `🎉 ${view.name} を ゲット!`
    }</div>
    <div class="big-face">${face(view)}</div>
    <div class="card">
      <div><span class="type-badge">${b.monster.type}</span> レアど: ${b.monster.rarity}</div>
      <div style="margin-top:8px">💡 ${b.monster.trivia}</div>
    </div>
    ${
      gotBadges.length
        ? `<div class="card badge-get">🏅 バッジかくとく!<br>${gotBadges
            .map(
              (bg) => `<span class="badge-chip">${bg.emoji} ${bg.name}</span>`,
            )
            .join(" ")}</div>`
        : ""
    }
    <div class="card streak">せいかい ${b.correctCount}/${b.questions.length} もん
      ${after > before ? `<br>🔥 れんぞく ${after} 日に なった!` : ""}
      <br>📖 ずかん ${owned}/${MONSTERS.length}
      <br>⭐ +${gain.xp}XP / 🪙 +${gain.points}ポイント</div>
    <button id="btn-home">ホームへ もどる</button>
  `;
  $("#btn-home").addEventListener("click", renderHome);
  show("#screen-result");
}

function renderZukan() {
  const captures = progress().captures;
  const owns = (id) => (captures[id] || 0) > 0;
  $("#screen-zukan").innerHTML = `
    <h1>📖 モンスターずかん (${ownedCount(captures)}/${MONSTERS.length})</h1>
    <div class="zukan-grid">
      ${MONSTERS.map((m) => {
        const owned = owns(m.id);
        const v = owned ? viewOf(m, captures) : m;
        const cnt = captures[m.id] || 0;
        return `
        <div class="zukan-cell rar-${m.rarity} ${owned ? "" : "unowned"}" data-id="${m.id}">
          ${face(v)}<div>${owned ? v.name : "???"}</div>
          ${owned ? `<div class="cap-count">×${cnt}</div>` : ""}
        </div>`;
      }).join("")}
    </div>
    <div class="card" id="zukan-detail">モンスターを タップすると せつめいが 見られるよ</div>
    <button id="btn-home2" class="secondary">ホームへ もどる</button>
  `;
  document.querySelectorAll(".zukan-cell").forEach((c) =>
    c.addEventListener("click", () => {
      const m = MONSTERS.find((x) => x.id === c.dataset.id);
      if (!owns(m.id)) {
        $("#zukan-detail").innerHTML = `??? まだ つかまえていないよ`;
        return;
      }
      const v = viewOf(m, captures);
      const evolved = isEvolved(captures, m.id);
      $("#zukan-detail").innerHTML =
        `<b>${v.name}</b> <span class="type-badge">${m.type}</span> (${m.rarity})${evolved ? " ✨しんか!" : ""}` +
        `<br>💡 ${m.trivia}<br>つかまえた かず: ${captures[m.id]}`;
    }),
  );
  $("#btn-home2").addEventListener("click", renderHome);
  show("#screen-zukan");
}

function renderReward() {
  const prog = progress();
  const rewards = app.state.settings.rewards;
  const list =
    rewards
      .map((r) => {
        const enough = prog.points >= r.cost;
        return `<div class="rw-row ${enough ? "rw-ok" : ""}">🎁 ${esc(r.name)}
          <b>${r.cost}pt</b> ${enough ? "✅ こうかんできる!" : ""}</div>`;
      })
      .join("") || `<div>まだ ごほうびが ありません</div>`;
  $("#screen-reward").innerHTML = `
    <h1>🎁 ごほうび</h1>
    <div class="card streak">🪙 いまの ポイント <b>${prog.points}</b></div>
    <div class="card">${list}</div>
    <div class="card note">こうかんは おうちの人に おねがいしてね</div>
    <button id="btn-home3" class="secondary">ホームへ もどる</button>
  `;
  $("#btn-home3").addEventListener("click", renderHome);
  show("#screen-reward");
}

renderProfile();
if ("serviceWorker" in navigator)
  navigator.serviceWorker.register("./sw.js").catch(() => {});
