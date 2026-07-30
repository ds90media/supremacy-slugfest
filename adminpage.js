import {
  watchPlayers,
  addPlayer,
  removePlayer,
  watchMatches,
  createMatch,
  deleteMatch,
  watchTournamentState,
  setTournamentState,
} from "./firebase.js";
import { analyzeMatch, tournamentTotals } from "./scoring.js";
import { COURSES } from "./courses.js";

const TEAM1 = "Strokes & Slams";
const TEAM2 = "The Brown Bowl";

let players = [];
let matches = [];
let tournamentState = { currentRound: 1, round1Status: "not_started", round2Status: "not_started", tournamentStatus: "not_started" };

// ---------- Tabs ----------
document.querySelectorAll(".tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach((t) => t.classList.remove("active"));
    document.querySelectorAll(".tab-panel").forEach((p) => (p.style.display = "none"));
    tab.classList.add("active");
    document.getElementById("tab-" + tab.dataset.tab).style.display = "block";
  });
});

// ---------- Data subscriptions ----------
watchPlayers((p) => {
  players = p;
  renderRoster();
  renderCreateMatch();
});
watchMatches((m) => {
  matches = m;
  renderManageMatches();
  renderCreateMatch();
  renderRoundControl();
});
watchTournamentState((s) => {
  tournamentState = s;
  renderCreateMatch();
  renderRoundControl();
});

// ================= ROSTER TAB =================

function renderRoster() {
  const t1players = players.filter((p) => p.team === "team1");
  const t2players = players.filter((p) => p.team === "team2");

  document.getElementById("tab-roster").innerHTML = `
    <div class="panel roster-col t1">
      <h4>Strokes &amp; Slams <span class="count-badge ${t1players.length >= 12 ? "full" : ""}">${t1players.length}/12</span></h4>
      <div class="roster-list">
        ${t1players.map((p) => rosterItem(p)).join("") || `<div class="empty-state">No players yet.</div>`}
      </div>
      <div class="add-row">
        <input type="text" id="add-name-t1" placeholder="Player name" />
        <button class="btn btn-gold" id="add-btn-t1">Add</button>
      </div>
    </div>

    <div class="panel roster-col t2">
      <h4>The Brown Bowl <span class="count-badge ${t2players.length >= 12 ? "full" : ""}">${t2players.length}/12</span></h4>
      <div class="roster-list">
        ${t2players.map((p) => rosterItem(p)).join("") || `<div class="empty-state">No players yet.</div>`}
      </div>
      <div class="add-row">
        <input type="text" id="add-name-t2" placeholder="Player name" />
        <button class="btn btn-gold" id="add-btn-t2">Add</button>
      </div>
    </div>
  `;

  document.getElementById("add-btn-t1").addEventListener("click", () => addFromInput("t1", "team1"));
  document.getElementById("add-btn-t2").addEventListener("click", () => addFromInput("t2", "team2"));
  document.getElementById("add-name-t1").addEventListener("keydown", (e) => {
    if (e.key === "Enter") addFromInput("t1", "team1");
  });
  document.getElementById("add-name-t2").addEventListener("keydown", (e) => {
    if (e.key === "Enter") addFromInput("t2", "team2");
  });

  document.querySelectorAll("[data-remove]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      if (confirm("Remove this player from the roster?")) {
        await removePlayer(btn.dataset.remove);
      }
    });
  });
}

function rosterItem(p) {
  return `<div class="roster-item"><span>${p.name}</span><span class="rm-btn" data-remove="${p.id}">Remove</span></div>`;
}

async function addFromInput(suffix, team) {
  const input = document.getElementById("add-name-" + suffix);
  const name = input.value.trim();
  if (!name) return;
  await addPlayer(name, team);
  input.value = "";
}

// ================= CREATE MATCH TAB =================

function activePlayerIdsForRound(round) {
  const active = new Set();
  matches
    .filter((m) => m.round === round)
    .forEach((m) => {
      const a = analyzeMatch(m.holes || [], TEAM1, TEAM2);
      if (!a.matchComplete) {
        (m.team1?.playerIds || []).forEach((id) => active.add(id));
        (m.team2?.playerIds || []).forEach((id) => active.add(id));
      }
    });
  return active;
}

function renderCreateMatch() {
  const round = tournamentState.currentRound || 1;
  const activeIds = activePlayerIdsForRound(round);

  const t1Available = players.filter((p) => p.team === "team1" && !activeIds.has(p.id));
  const t2Available = players.filter((p) => p.team === "team2" && !activeIds.has(p.id));

  document.getElementById("tab-create").innerHTML = `
    <div class="panel">
      <h3>New Match — Round ${round} (${round === 2 ? COURSES.south.name : COURSES.north.name})</h3>
      <div class="warn-banner" id="create-warning" style="display:none;"></div>

      <div class="field">
        <label class="field-label">Strokes &amp; Slams — Player 1</label>
        <select id="sel-t1-p1">${optionList(t1Available, "")}</select>
      </div>
      <div class="field">
        <label class="field-label">Strokes &amp; Slams — Player 2</label>
        <select id="sel-t1-p2">${optionList(t1Available, "")}</select>
      </div>
      <div class="field">
        <label class="field-label">The Brown Bowl — Player 1</label>
        <select id="sel-t2-p1">${optionList(t2Available, "")}</select>
      </div>
      <div class="field">
        <label class="field-label">The Brown Bowl — Player 2</label>
        <select id="sel-t2-p2">${optionList(t2Available, "")}</select>
      </div>

      <button class="btn btn-gold btn-block" id="create-match-btn">Create Match</button>
      <p style="font-size:11.5px; color:var(--text-faint); text-align:center; margin-top:10px;">
        Players already in an active match for this round won't appear here.
      </p>
    </div>
  `;

  document.getElementById("create-match-btn").addEventListener("click", handleCreateMatch);
}

function optionList(list, selected) {
  if (list.length === 0) return `<option value="">No players available</option>`;
  return list.map((p) => `<option value="${p.id}" ${p.id === selected ? "selected" : ""}>${p.name}</option>`).join("");
}

async function handleCreateMatch() {
  const round = tournamentState.currentRound || 1;
  const warn = document.getElementById("create-warning");
  warn.style.display = "none";

  const t1p1 = document.getElementById("sel-t1-p1").value;
  const t1p2 = document.getElementById("sel-t1-p2").value;
  const t2p1 = document.getElementById("sel-t2-p1").value;
  const t2p2 = document.getElementById("sel-t2-p2").value;

  if (!t1p1 || !t1p2 || !t2p1 || !t2p2) {
    warn.textContent = "Select all four players before creating a match.";
    warn.style.display = "block";
    return;
  }
  if (t1p1 === t1p2) {
    warn.textContent = "Strokes & Slams player 1 and player 2 must be different people.";
    warn.style.display = "block";
    return;
  }
  if (t2p1 === t2p2) {
    warn.textContent = "The Brown Bowl player 1 and player 2 must be different people.";
    warn.style.display = "block";
    return;
  }

  // Re-check against live active set in case another admin just created a match
  const activeIds = activePlayerIdsForRound(round);
  const chosen = [t1p1, t1p2, t2p1, t2p2];
  if (chosen.some((id) => activeIds.has(id))) {
    warn.textContent = "One of these players is already in an active match this round. Refresh and try again.";
    warn.style.display = "block";
    return;
  }

  const findName = (id) => players.find((p) => p.id === id)?.name || "Unknown";

  await createMatch({
    round,
    team1: { players: [findName(t1p1), findName(t1p2)], playerIds: [t1p1, t1p2] },
    team2: { players: [findName(t2p1), findName(t2p2)], playerIds: [t2p1, t2p2] },
  });

  document.querySelector('.tab[data-tab="manage"]').click();
}

// ================= MANAGE MATCHES TAB =================

function renderManageMatches() {
  const sorted = [...matches].sort((a, b) => (a.round || 1) - (b.round || 1));

  document.getElementById("tab-manage").innerHTML = `
    <div class="panel">
      <h3>All Matches (${matches.length})</h3>
      ${
        sorted.length
          ? sorted.map((m) => manageRow(m)).join("")
          : `<div class="empty-state">No matches created yet. Head to "Create Match".</div>`
      }
    </div>
  `;

  document.querySelectorAll("[data-delete-match]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      if (confirm("Delete this match? This can't be undone.")) {
        await deleteMatch(btn.dataset.deleteMatch);
      }
    });
  });
}

function manageRow(m) {
  const a = analyzeMatch(m.holes || [], TEAM1, TEAM2);
  const p1 = (m.team1?.players || []).join(" / ");
  const p2 = (m.team2?.players || []).join(" / ");
  const statusText = a.matchComplete ? "Final" : `Hole ${a.currentHole} · ${a.liveLabel}`;
  return `
    <div class="admin-match-row">
      <div class="info">
        <strong>R${m.round || 1}</strong> — ${p1} vs ${p2}<br/>
        <span style="color:var(--text-faint); font-size:11.5px;">${statusText} · ${a.totalPoints.team1.toFixed(1)}–${a.totalPoints.team2.toFixed(1)}</span>
      </div>
      <div class="actions">
        <a class="btn btn-outline btn-sm" href="match.html?id=${m.id}">Score</a>
        <button class="btn btn-danger btn-sm" data-delete-match="${m.id}">Delete</button>
      </div>
    </div>
  `;
}

// ================= ROUND CONTROL TAB =================

function renderRoundControl() {
  const totals = tournamentTotals(matches);
  const r1 = tournamentState.round1Status || "not_started";
  const r2 = tournamentState.round2Status || "not_started";
  const tStatus = tournamentState.tournamentStatus || "not_started";

  document.getElementById("tab-round").innerHTML = `
    <div class="panel">
      <h3>Tournament Total</h3>
      <div class="total-bar" style="margin:0;">
        <div class="tt t1"><div class="num mono">${totals.team1.toFixed(1)}</div><div class="lbl">Strokes &amp; Slams</div></div>
        <div class="sep">vs</div>
        <div class="tt t2"><div class="num mono">${totals.team2.toFixed(1)}</div><div class="lbl">The Brown Bowl</div></div>
      </div>
    </div>

    <div class="panel">
      <h3>Round Control</h3>
      <div class="round-status-row">
        <span>Round 1 · ${COURSES.north.name}</span>
        <span class="pill ${r1}">${r1.replace("_", " ")}</span>
      </div>
      <div style="display:flex; gap:8px; margin: 10px 0 16px;">
        <button class="btn btn-outline btn-sm" id="start-r1" ${r1 !== "not_started" ? "disabled" : ""}>Start Round 1</button>
        <button class="btn btn-outline btn-sm" id="complete-r1" ${r1 !== "in_progress" ? "disabled" : ""}>Complete Round 1</button>
      </div>

      <div class="round-status-row">
        <span>Round 2 · ${COURSES.south.name}</span>
        <span class="pill ${r2}">${r2.replace("_", " ")}</span>
      </div>
      <div style="display:flex; gap:8px; margin: 10px 0 6px;">
        <button class="btn btn-outline btn-sm" id="start-r2" ${r2 !== "not_started" ? "disabled" : ""}>Start Round 2</button>
        <button class="btn btn-outline btn-sm" id="complete-r2" ${r2 !== "in_progress" ? "disabled" : ""}>Complete Round 2</button>
      </div>
      ${r1 !== "completed" && r2 === "not_started" ? `<div class="warn-banner">Round 1 isn't marked complete yet — you can still start Round 2 early if needed.</div>` : ""}
    </div>

    <div class="panel">
      <h3>Finalize</h3>
      <div class="round-status-row">
        <span>Tournament Status</span>
        <span class="pill ${tStatus}">${tStatus.replace("_", " ")}</span>
      </div>
      <button class="btn btn-gold btn-block" id="finalize-btn" style="margin-top:12px;" ${tStatus === "completed" ? "disabled" : ""}>
        Finalize Tournament
      </button>
    </div>
  `;

  document.getElementById("start-r1").addEventListener("click", () =>
    setTournamentState({ currentRound: 1, round1Status: "in_progress" })
  );
  document.getElementById("complete-r1").addEventListener("click", () => setTournamentState({ round1Status: "completed" }));
  document.getElementById("start-r2").addEventListener("click", () =>
    setTournamentState({ currentRound: 2, round2Status: "in_progress" })
  );
  document.getElementById("complete-r2").addEventListener("click", () => setTournamentState({ round2Status: "completed" }));
  document.getElementById("finalize-btn").addEventListener("click", async () => {
    if (confirm("Finalize the tournament? This marks it complete on the leaderboard.")) {
      await setTournamentState({ tournamentStatus: "completed" });
    }
  });
}
