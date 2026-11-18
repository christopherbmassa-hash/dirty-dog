/* Dirty Dog score keeper. Plain JS, no build step. */
(() => {
  "use strict";

  const STORE_KEY = "dirtydog:game";
  const HANDS = [8, 7, 6, 5, 4, 3, 2, 1, 2, 3, 4, 5, 6, 7, 8];
  const MIN_PLAYERS = 3;
  const MAX_PLAYERS = 6; // 6 players x 8 cards + a trump card fits in 52
  const AUTO_SECONDS = 7;

  const $ = (sel) => document.querySelector(sel);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const fmt = (n) => (n < 0 ? "−" + Math.abs(n) : String(n));

  /** Points for one player in one hand. */
  const score = (bid, took) => (bid === took ? 10 + took : took - 10);

  // ---------- state ----------
  // { v, players: [name], firstDealer, rounds: [{bids:[], tricks:[], done}], current, phase: 'bid'|'tricks'|'over', editing: index|null }
  let game = load();
  let setupNames = game ? [...game.players] : ["", "", "", ""];
  let setupDealer = game ? game.firstDealer : 0;

  function newGame(players, firstDealer) {
    return {
      v: 1,
      players,
      firstDealer,
      rounds: HANDS.map(() => ({ bids: players.map(() => 0), tricks: players.map(() => 0), done: false })),
      current: 0,
      phase: "bid",
      editing: null,
    };
  }
  function load() {
    try {
      const g = JSON.parse(localStorage.getItem(STORE_KEY));
      if (g && g.v === 1 && Array.isArray(g.players) && g.rounds?.length === HANDS.length) return g;
    } catch (_) { /* ignore */ }
    return null;
  }
  function save() {
    try {
      if (game) localStorage.setItem(STORE_KEY, JSON.stringify(game));
      else localStorage.removeItem(STORE_KEY);
    } catch (_) { /* private mode: keep going without saving */ }
  }

  const dealerOf = (r) => (game.firstDealer + r) % game.players.length;
  /** Seats in bidding order for hand r: left of the dealer first, dealer last. */
  const bidOrder = (r) => {
    const n = game.players.length, d = dealerOf(r);
    return Array.from({ length: n }, (_, i) => (d + 1 + i) % n);
  };
  function totals(uptoInclusive = HANDS.length - 1) {
    const t = game.players.map(() => 0);
    game.rounds.forEach((rd, r) => {
      if (rd.done && r <= uptoInclusive) rd.bids.forEach((b, p) => (t[p] += score(b, rd.tricks[p])));
    });
    return t;
  }

  // ---------- screens ----------
  function show(id) {
    for (const s of document.querySelectorAll(".screen")) s.hidden = s.id !== id;
    window.scrollTo(0, 0);
    if (id === "setup") renderSetup();
    if (id === "game") renderGame();
  }
  const proceed = () => { stopAuto(); show(game ? "game" : "setup"); };

  // ---------- title + auto-advance ----------
  let autoTimer = null, tickTimer = null;
  function startAuto() {
    let left = AUTO_SECONDS;
    $("#countNum").textContent = left;
    $("#autoNote").hidden = false;
    $("#enterBtn").classList.add("counting");
    tickTimer = setInterval(() => { left = Math.max(0, left - 1); $("#countNum").textContent = left; }, 1000);
    autoTimer = setTimeout(proceed, AUTO_SECONDS * 1000);
    // Reading the rules means staying put.
    ["wheel", "touchmove", "keydown"].forEach((ev) => window.addEventListener(ev, onLinger, { passive: true }));
    window.addEventListener("scroll", onLinger, { passive: true });
    $("#ruleCards").addEventListener("pointerdown", onLinger);
  }
  function onLinger(e) {
    if (e.type === "keydown" && (e.key === "Enter" || e.key === " ")) return;
    if (!autoTimer) return;
    stopAuto();
    $("#autoNote").innerHTML = "Take your time. Deal yourself in when you're ready.";
  }
  function stopAuto() {
    clearTimeout(autoTimer); clearInterval(tickTimer);
    autoTimer = tickTimer = null;
    $("#enterBtn").classList.remove("counting");
    ["wheel", "touchmove", "keydown", "scroll"].forEach((ev) => window.removeEventListener(ev, onLinger));
  }
  $("#enterBtn").addEventListener("click", proceed);
  document.querySelectorAll("[data-go='title']").forEach((b) => b.addEventListener("click", () => {
    $("#autoNote").hidden = true;
    $("#enterBtn .btn-label").textContent = game ? "Back to the Game" : "Deal Me In";
    show("title");
  }));

  // ---------- setup ----------
  function renderSetup() {
    const list = $("#playerList");
    list.innerHTML = setupNames.map((name, i) => `
      <li>
        <span class="seat">${i + 1}</span>
        <input type="text" maxlength="16" autocomplete="off" enterkeyhint="next" placeholder="Player ${i + 1}" value="${esc(name)}" data-i="${i}" aria-label="Player ${i + 1} name">
        <button type="button" class="dealer-chip" data-i="${i}" aria-pressed="${i === setupDealer}" title="Deals first">D</button>
      </li>`).join("");
    $("#addPlayer").disabled = setupNames.length >= MAX_PLAYERS;
    $("#removePlayer").disabled = setupNames.length <= MIN_PLAYERS;
  }
  $("#playerList").addEventListener("input", (e) => {
    if (e.target.matches("input")) setupNames[+e.target.dataset.i] = e.target.value;
  });
  $("#playerList").addEventListener("keydown", (e) => {
    if (e.key !== "Enter" || !e.target.matches("input")) return;
    e.preventDefault();
    const next = $(`#playerList input[data-i="${+e.target.dataset.i + 1}"]`);
    next ? next.focus() : $("#startGame").focus();
  });
  $("#playerList").addEventListener("click", (e) => {
    const chip = e.target.closest(".dealer-chip");
    if (!chip) return;
    setupDealer = +chip.dataset.i;
    renderSetup();
  });
  $("#addPlayer").addEventListener("click", () => {
    if (setupNames.length >= MAX_PLAYERS) return;
    setupNames.push("");
    renderSetup();
    $(`#playerList input[data-i="${setupNames.length - 1}"]`).focus();
  });
  $("#removePlayer").addEventListener("click", () => {
    if (setupNames.length <= MIN_PLAYERS) return;
    setupNames.pop();
    if (setupDealer >= setupNames.length) setupDealer = 0;
    renderSetup();
  });
  $("#startGame").addEventListener("click", () => {
    const names = setupNames.map((n, i) => n.trim() || `Player ${i + 1}`);
    game = newGame(names, setupDealer);
    setupNames = [...names];
    save();
    show("game");
  });

  // ---------- game ----------
  function renderGame() {
    renderEntry();
    renderGrid();
    renderScoreboard();
  }

  /** Pinned standings bar: ranked by total, with last hand's points. */
  function renderScoreboard() {
    const t = totals();
    const lastDone = game.rounds.map((rd) => rd.done).lastIndexOf(true);
    const last = lastDone < 0 ? null : game.rounds[lastDone];
    const ranked = game.players
      .map((name, p) => ({ name, p, pts: t[p], delta: last ? score(last.bids[p], last.tricks[p]) : null }))
      .sort((a, b) => b.pts - a.pts || a.p - b.p);
    const top = ranked[0].pts;
    const ord = (n) => ["1st", "2nd", "3rd", "4th", "5th", "6th"][n - 1];
    let rank = 0;
    $("#scoreboard").style.setProperty("--n", ranked.length);
    $("#scoreboard").innerHTML = ranked.map((x, i) => {
      if (i === 0 || x.pts !== ranked[i - 1].pts) rank = i + 1;
      const lead = lastDone >= 0 && x.pts === top;
      return `<div class="sb-player ${lead ? "leader" : ""}">
        <span class="sb-rank">${lead ? "&#9733; " : ""}${ord(rank)}</span>
        <span class="sb-name" title="${esc(x.name)}">${esc(x.name)}</span>
        <span class="sb-total">${fmt(x.pts)}</span>
        <span class="sb-delta ${x.delta == null ? "" : x.delta > 0 ? "good" : "bad"}">${x.delta == null ? "&nbsp;" : (x.delta > 0 ? "+" : "") + fmt(x.delta) + " last"}</span>
      </div>`;
    }).join("");
  }

  function stepperHTML(p, key, val, max, sub) {
    return `
      <div class="stepper">
        <div class="who">${esc(game.players[p])}${sub ? `<small>${sub}</small>` : ""}</div>
        <div class="ctrl">
          <button type="button" class="step" data-p="${p}" data-k="${key}" data-d="-1" ${val <= 0 ? "disabled" : ""} aria-label="One fewer for ${esc(game.players[p])}">&minus;</button>
          <span class="val" aria-live="polite">${val}</span>
          <button type="button" class="step" data-p="${p}" data-k="${key}" data-d="1" ${val >= max ? "disabled" : ""} aria-label="One more for ${esc(game.players[p])}">+</button>
        </div>
      </div>`;
  }

  function renderEntry() {
    const el = $("#entry");
    if (game.editing != null) return renderEdit(el);
    if (game.phase === "over") return renderOver(el);

    const r = game.current, cards = HANDS[r], rd = game.rounds[r], d = dealerOf(r);
    const order = bidOrder(r);
    const bidding = game.phase === "bid";
    const sum = (bidding ? rd.bids : rd.tricks).reduce((a, b) => a + b, 0);

    let tally;
    if (bidding) {
      const diff = sum - cards;
      const word = diff === 0 ? "exactly even" : diff > 0 ? `over by ${diff}` : `under by ${-diff}`;
      tally = `<div class="tally">Bids total ${sum} of ${cards} &middot; ${word}</div>`;
    } else {
      tally = `<div class="tally ${sum === cards ? "ok" : "warn"}">Tricks counted ${sum} of ${cards}${sum === cards ? " ✓" : sum > cards ? ` (${sum - cards} too many)` : ` (${cards - sum} missing)`}</div>`;
    }

    el.innerHTML = `
      <div class="entry-head">
        <h2>Hand ${r + 1} of ${HANDS.length}: ${cards} card${cards > 1 ? "s" : ""} <span class="phase-pill">${bidding ? "Bids" : "Tricks taken"}</span></h2>
        <div class="entry-sub">${esc(game.players[d])} deals${bidding ? ` &middot; ${esc(game.players[order[0]])} bids first` : ""}</div>
      </div>
      <div class="steppers">
        ${order.map((p) => bidding
          ? stepperHTML(p, "bids", rd.bids[p], cards, p === d ? "dealer, bids last" : "")
          : stepperHTML(p, "tricks", rd.tricks[p], cards, `bid ${rd.bids[p]}`)).join("")}
      </div>
      <div class="entry-foot">
        ${tally}
        <div class="entry-btns">
          ${bidding
            ? `<button type="button" class="btn btn-gold" data-act="lockBids">Lock in bids &rarr;</button>`
            : `<button type="button" class="btn btn-ghost" data-act="backToBids">&larr; Bids</button>
               <button type="button" class="btn btn-gold" data-act="scoreHand" ${sum !== cards ? "disabled" : ""}>Score the hand</button>`}
        </div>
      </div>`;
  }

  function renderEdit(el) {
    const r = game.editing, cards = HANDS[r], rd = game.rounds[r];
    const sum = rd.tricks.reduce((a, b) => a + b, 0);
    el.innerHTML = `
      <div class="entry-head">
        <h2>Fixing hand ${r + 1}: ${cards} card${cards > 1 ? "s" : ""} <span class="phase-pill">Edit</span></h2>
        <div class="entry-sub">${esc(game.players[dealerOf(r)])} dealt</div>
      </div>
      <div class="steppers">
        ${bidOrder(r).map((p) => `
          <div class="stepper edit-both">
            <div class="who">${esc(game.players[p])}</div>
            <div class="pair">
              ${["bids", "tricks"].map((k) => `
                <label>${k === "bids" ? "Bid" : "Took"}
                  <span class="ctrl">
                    <button type="button" class="step" data-p="${p}" data-k="${k}" data-d="-1" ${rd[k][p] <= 0 ? "disabled" : ""} aria-label="Lower ${k === "bids" ? "bid" : "tricks"} for ${esc(game.players[p])}">&minus;</button>
                    <span class="val">${rd[k][p]}</span>
                    <button type="button" class="step" data-p="${p}" data-k="${k}" data-d="1" ${rd[k][p] >= cards ? "disabled" : ""} aria-label="Raise ${k === "bids" ? "bid" : "tricks"} for ${esc(game.players[p])}">+</button>
                  </span>
                </label>`).join("")}
            </div>
          </div>`).join("")}
      </div>
      <div class="entry-foot">
        <div class="tally ${sum === cards ? "ok" : "warn"}">Tricks counted ${sum} of ${cards}${sum === cards ? " ✓" : ""}</div>
        <div class="entry-btns">
          <button type="button" class="btn btn-ghost" data-act="cancelEdit">Cancel</button>
          <button type="button" class="btn btn-gold" data-act="saveEdit" ${sum !== cards ? "disabled" : ""}>Save hand</button>
        </div>
      </div>`;
  }

  function renderOver(el) {
    const t = totals();
    const ranked = game.players.map((name, p) => ({ name, pts: t[p] })).sort((a, b) => b.pts - a.pts);
    const top = ranked[0].pts;
    const winners = ranked.filter((x) => x.pts === top).map((x) => esc(x.name));
    el.innerHTML = `
      <div class="winner">
        <div class="crown" aria-hidden="true">&#127942;</div>
        <h2>${winners.join(" &amp; ")} ${winners.length > 1 ? "tie" : "wins"}!</h2>
        <p class="muted">Final score: ${fmt(top)} points</p>
        <ol class="standings">${ranked.map((x) => `<li><span>${esc(x.name)}</span><span>${fmt(x.pts)}</span></li>`).join("")}</ol>
        <div class="entry-btns" style="justify-content:center;margin:0">
          <button type="button" class="btn btn-ghost" data-act="newPlayers">New players</button>
          <button type="button" class="btn btn-gold" data-act="rematch">Rematch</button>
        </div>
      </div>`;
  }

  function renderGrid() {
    const t = totals();
    const max = Math.max(...t);
    const anyDone = game.rounds.some((r) => r.done);
    const running = game.players.map(() => 0);

    let html = `<thead><tr><th class="hand" scope="col">Hand</th>${game.players.map((name, p) => `
      <th scope="col"><span class="pname" title="${esc(name)}">${esc(name)}</span><span class="ptotal ${anyDone && t[p] === max ? "leader" : ""}">${fmt(t[p])}</span></th>`).join("")}</tr></thead><tbody>`;

    HANDS.forEach((cards, r) => {
      const rd = game.rounds[r];
      const isCurrent = game.phase !== "over" && r === game.current;
      const cls = [rd.done ? "done" : isCurrent ? "current" : "future", r === HANDS.indexOf(1) + 1 ? "turn" : "", game.editing === r ? "current" : ""].join(" ");
      const d = dealerOf(r);
      html += `<tr class="${cls}" data-r="${r}" ${rd.done ? `tabindex="0" title="Tap to fix this hand"` : ""}>
        <th class="hand" scope="row"><span class="cards">${cards}<small>card${cards > 1 ? "s" : ""}</small></span><span class="hn">hand ${r + 1}</span><span class="dl" title="${esc(game.players[d])} deals">${esc(game.players[d])}</span></th>`;
      game.players.forEach((_, p) => {
        if (rd.done) {
          const pts = score(rd.bids[p], rd.tricks[p]);
          running[p] += pts;
          html += `<td class="cell"><div class="bt"><span class="b">${rd.bids[p]}</span><span class="t">${rd.tricks[p]}</span></div><div class="pts ${pts > 0 ? "good" : "bad"}">${fmt(pts)}</div><div class="run">${fmt(running[p])}</div></td>`;
        } else if (isCurrent && game.phase === "tricks") {
          html += `<td class="cell"><div class="bt"><span class="b">${rd.bids[p]}</span><span class="t">?</span></div></td>`;
        } else {
          html += `<td class="cell"></td>`;
        }
      });
      html += `</tr>`;
    });
    $("#grid").innerHTML = html + `</tbody>`;
  }

  // steppers + action buttons
  $("#entry").addEventListener("click", (e) => {
    const step = e.target.closest(".step");
    if (step) {
      const r = game.editing ?? game.current;
      const cards = HANDS[r], arr = game.rounds[r][step.dataset.k], p = +step.dataset.p;
      arr[p] = Math.min(cards, Math.max(0, arr[p] + +step.dataset.d));
      save();
      renderGame();
      // keep focus on the same control after re-render
      const again = $(`#entry .step[data-p="${p}"][data-k="${step.dataset.k}"][data-d="${step.dataset.d}"]`);
      if (again && !again.disabled) again.focus();
      return;
    }
    const act = e.target.closest("[data-act]")?.dataset.act;
    if (!act) return;
    const rd = game.rounds[game.current];
    if (act === "lockBids") {
      rd.tricks = [...rd.bids]; // start at the bids; adjust the ones who missed
      game.phase = "tricks";
    } else if (act === "backToBids") {
      game.phase = "bid";
    } else if (act === "scoreHand") {
      rd.done = true;
      if (game.current === HANDS.length - 1) game.phase = "over";
      else { game.current++; game.phase = "bid"; }
    } else if (act === "saveEdit") {
      game.editing = null;
      game.editBackup = null;
    } else if (act === "cancelEdit") {
      game.rounds[game.editing] = game.editBackup;
      game.editing = null;
    } else if (act === "rematch") {
      game = newGame(game.players, (game.firstDealer + 1) % game.players.length);
    } else if (act === "newPlayers") {
      setupNames = [...game.players];
      game = null; save(); show("setup"); return;
    }
    save();
    renderGame();
    if (act === "scoreHand" || act === "rematch") $("#entry").scrollIntoView({ behavior: "smooth", block: "start" });
  });

  // tap a finished hand to fix it
  function startEdit(r) {
    if (!game.rounds[r]?.done || game.editing != null) return;
    game.editBackup = JSON.parse(JSON.stringify(game.rounds[r]));
    game.editing = r;
    renderGame();
    $("#entry").scrollIntoView({ behavior: "smooth", block: "start" });
  }
  $("#grid").addEventListener("click", (e) => {
    const tr = e.target.closest("tbody tr");
    if (tr) startEdit(+tr.dataset.r);
  });
  $("#grid").addEventListener("keydown", (e) => {
    const tr = e.target.closest("tbody tr");
    if (tr && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); startEdit(+tr.dataset.r); }
  });

  // new game dialog
  $("#newGameBtn").addEventListener("click", () => { $("#confirm").returnValue = ""; $("#confirm").showModal(); });
  $("#confirm").addEventListener("close", () => {
    const v = $("#confirm").returnValue;
    if (v === "same") {
      game = newGame(game.players, (game.firstDealer + 1) % game.players.length);
      save(); renderGame();
    } else if (v === "new") {
      setupNames = [...game.players];
      setupDealer = 0;
      game = null; save(); show("setup");
    }
  });

  // ---------- boot ----------
  // A half-finished fix from a closed tab is thrown away, not kept.
  if (game && game.editing != null) {
    if (game.editBackup) game.rounds[game.editing] = game.editBackup;
    game.editing = null; game.editBackup = null; save();
  }
  if (game) $("#enterBtn .btn-label").textContent = "Back to the Game";
  show("title");
  startAuto();
})();
