import { watchMatches, watchTournamentState } from "./firebase.js";
import { analyzeMatch } from "./scoring.js";
import { COURSES } from "./courses.js";

const TEAM1 = "Strokes & Slams";
const TEAM2 = "The Brown Bowl";
const WIN_TARGET = 18.5;
const SCALE_MAX = 36;

let allMatches = [];
let tournamentState = { currentRound: 1, round1Status: "not_started", round2Status: "not_started" };

function courseNameFor(round) {
  const key = round === 2 ? "south" : "north";
  return COURSES[key].name;
}

function render() {
  // Round line
  const roundStatusKey = tournamentState.currentRound === 2 ? tournamentState.round2Status : tournamentState.round1Status;
  const roundLabel =
    roundStatusKey === "completed"
      ? "Tournament Complete"
      : `Round ${tournamentState.currentRound} · ${courseNameFor(tournamentState.currentRound)}`;
  document.getElementById("roundline").textContent = roundLabel;

  // Totals
  let t1 = 0, t2 = 0;
  const analyzed = allMatches.map((m) => {
    const a = analyzeMatch(m.holes || [], TEAM1, TEAM2);
    t1 += a.totalPoints.team1;
    t2 += a.totalPoints.team2;
    return { match: m, analysis: a };
  });

  document.getElementById("score-t1").textContent = t1.toFixed(1);
  document.getElementById("score-t2").textContent = t2.toFixed(1);

  const fill1Pct = Math.min(100, (t1 / SCALE_MAX) * 100);
  const fill2Pct = Math.min(100, (t2 / SCALE_MAX) * 100);
  document.getElementById("fill-1").style.width = fill1Pct + "%";
  document.getElementById("fill-2").style.width = fill2Pct + "%";

  const markerPct = (WIN_TARGET / SCALE_MAX) * 100;
  document.getElementById("win-marker").style.left = markerPct + "%";
  document.getElementById("win-marker-label").style.left = markerPct + "%";

  const leaderText = document.getElementById("leader-text");
  if (t1 > t2) leaderText.textContent = `Strokes & Slams lead by ${(t1 - t2).toFixed(1)}`;
  else if (t2 > t1) leaderText.textContent = `The Brown Bowl lead by ${(t2 - t1).toFixed(1)}`;
  else leaderText.textContent = "All Square";

  // Winner banner
  const winnerSlot = document.getElementById("winner-banner-slot");
  if (t1 >= WIN_TARGET || t2 >= WIN_TARGET) {
    const winner = t1 >= WIN_TARGET ? TEAM1 : TEAM2;
    winnerSlot.innerHTML = `<div class="winner-banner">
      <div class="title">🏆 ${winner} WIN THE SUPREMACY SLUGFEST</div>
      <div class="sub">Final Score: ${t1.toFixed(1)} — ${t2.toFixed(1)}</div>
    </div>`;
  } else {
    winnerSlot.innerHTML = "";
  }

  // Status strip
  const inProgress = analyzed.filter((x) => x.match.status !== "completed" && !x.analysis.matchComplete).length;
  const completedCount = analyzed.filter((x) => x.analysis.matchComplete).length;
  const pointsRemaining = SCALE_MAX - (t1 + t2);
  document.getElementById("status-strip").innerHTML = `
    <div class="status-chip"><span class="dot"></span>${inProgress} live</div>
    <div class="status-chip"><span class="dot"></span>${completedCount} completed</div>
    <div class="status-chip"><span class="dot"></span>${pointsRemaining.toFixed(1)} pts remaining</div>
    <div class="status-chip"><span class="dot"></span>Round ${tournamentState.currentRound} of 2</div>
  `;

  // Live matches
  const live = analyzed.filter((x) => !x.analysis.matchComplete);
  const completed = analyzed.filter((x) => x.analysis.matchComplete);

  const liveEl = document.getElementById("live-matches");
  liveEl.innerHTML = live.length
    ? live.map((x, i) => matchCard(x, i)).join("")
    : `<div class="empty-state">No matches in progress right now.</div>`;

  const completedEl = document.getElementById("completed-matches");
  completedEl.innerHTML = completed.length
    ? completed.map((x, i) => matchCard(x, i, true)).join("")
    : `<div class="empty-state">No completed matches yet.</div>`;
}

function statusClassFor(a) {
  if (a.liveLabel.includes(TEAM1)) return "t1";
  if (a.liveLabel.includes(TEAM2)) return "t2";
  if (a.liveLabel === "All Square" || a.liveLabel === "Halved" || a.liveLabel === "Dormie") return "tie";
  return "";
}

function matchCard(x, idx, completedCard = false) {
  const m = x.match;
  const a = x.analysis;
  const p1 = (m.team1?.players || []).join(" / ");
  const p2 = (m.team2?.players || []).join(" / ");
  const holeBadge = a.matchComplete ? "Final" : `Hole ${a.currentHole}`;
  const statusText = a.matchComplete
    ? a.liveLabel === "Halved"
      ? "Match Halved"
      : a.liveLabel
    : a.liveLabel;

  return `
    <a class="match-card ${completedCard ? "completed" : ""}" href="match.html?id=${m.id}">
      <div class="row-top">
        <span class="match-no">Match ${idx + 1} · ${m.round === 2 ? "Round 2" : "Round 1"}</span>
        <span class="hole-badge">${holeBadge}</span>
      </div>
      <div class="players">
        <span class="side t1">${p1}</span>
        <span class="vs">vs</span>
        <span class="side t2">${p2}</span>
      </div>
      <div class="status-line">
        <span class="status-text ${statusClassFor(a)}">${statusText}</span>
        <span class="pts">${a.totalPoints.team1.toFixed(1)} – ${a.totalPoints.team2.toFixed(1)}</span>
      </div>
    </a>
  `;
}

watchTournamentState((state) => {
  tournamentState = state;
  render();
});

watchMatches((matches) => {
  allMatches = matches;
  render();
});
