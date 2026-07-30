import { watchMatch, updateMatchHole } from "./firebase.js";
import { analyzeMatch } from "./scoring.js";
import { COURSES } from "./courses.js";

const params = new URLSearchParams(window.location.search);
const matchId = params.get("id");
const root = document.getElementById("match-root");

if (!matchId) {
  root.innerHTML = `<div class="empty-state" style="margin-top:40px;">No match selected. <a href="index.html" style="color:var(--gold-bright);">Back to leaderboard</a></div>`;
} else {
  watchMatch(matchId, (match) => {
    if (!match) {
      root.innerHTML = `<div class="empty-state" style="margin-top:40px;">Match not found. <a href="index.html" style="color:var(--gold-bright);">Back to leaderboard</a></div>`;
      return;
    }
    render(match);
  });
}

function statusClassFor(a, team1Name, team2Name) {
  if (a.liveLabel.includes(team1Name)) return "t1";
  if (a.liveLabel.includes(team2Name)) return "t2";
  return "tie";
}

function summaryCellHTML(label, segment, team1Short, team2Short) {
  const pts = segment.points;
  const ptsText = pts.pending ? "Pending" : `${pts.team1.toFixed(1)} – ${pts.team2.toFixed(1)}`;
  return `
    <div class="summary-cell">
      <div class="k">${label}</div>
      <div class="v">${segment.label}</div>
      <div class="pts">${ptsText}</div>
    </div>
  `;
}

function render(match) {
  const p1 = match.team1?.players || ["", ""];
  const p2 = match.team2?.players || ["", ""];
  const team1Name = p1.join(" / ");
  const team2Name = p2.join(" / ");
  const holes = match.holes || Array.from({ length: 18 }, () => ({ team1: null, team2: null }));
  const courseKey = match.round === 2 ? "south" : "north";
  const course = COURSES[courseKey];

  const a = analyzeMatch(holes, team1Name, team2Name);

  root.innerHTML = `
    <div class="match-hero">
      <div class="round-tag">Round ${match.round || 1} · ${course.name} · ${course.tee}</div>
      <div class="pairing">
        <div class="team-block t1">
          <div class="team-name">Strokes &amp; Slams</div>
          <div class="players-name">${p1.join(" / ")}</div>
        </div>
        <div class="vs-mark">VS</div>
        <div class="team-block t2">
          <div class="team-name">The Brown Bowl</div>
          <div class="players-name">${p2.join(" / ")}</div>
        </div>
      </div>
      <div class="live-banner status-text ${statusClassFor(a, team1Name, team2Name)}" style="color: inherit;">
        ${a.matchComplete ? "Final" : `Hole ${a.currentHole} · `}${a.liveLabel}
      </div>
    </div>

    <div class="summary-grid">
      ${summaryCellHTML("Front 9", a.front9, team1Name, team2Name)}
      ${summaryCellHTML("Back 9", a.back9, team1Name, team2Name)}
      ${summaryCellHTML(
        "Overall 18",
        {
          label: a.overall.complete
            ? a.overall.team1 === a.overall.team2
              ? `Halved (${a.overall.team1})`
              : `${a.overall.team1 < a.overall.team2 ? team1Name : team2Name} ${Math.min(a.overall.team1, a.overall.team2)} – ${Math.max(a.overall.team1, a.overall.team2)}`
            : "Pending",
          points: a.overall.points,
        },
        team1Name,
        team2Name
      )}
    </div>

    <div class="total-bar">
      <div class="tt t1"><div class="num mono">${a.totalPoints.team1.toFixed(1)}</div><div class="lbl">Strokes &amp; Slams</div></div>
      <div class="sep">vs</div>
      <div class="tt t2"><div class="num mono">${a.totalPoints.team2.toFixed(1)}</div><div class="lbl">The Brown Bowl</div></div>
    </div>

    <div class="section-head"><h2>Hole-by-Hole</h2></div>
    <div class="hole-table">
      <div class="hole-table-head">
        <span>Hole</span><span>Par</span><span class="t1c">S&amp;S</span><span class="t2c">Bowl</span><span></span>
      </div>
      ${holes.map((h, i) => holeRow(h, i, course)).join("")}
    </div>

    <p style="text-align:center; color: var(--text-faint); font-size: 11.5px; margin-top: 16px;">
      Scores save instantly and sync to everyone viewing this match.
    </p>
  `;

  // Wire up inputs
  root.querySelectorAll("input[data-hole]").forEach((input) => {
    input.addEventListener("change", async (e) => {
      const holeIndex = parseInt(e.target.dataset.hole, 10);
      const team = e.target.dataset.team;
      const raw = e.target.value;
      const val = raw === "" ? null : Math.max(1, parseInt(raw, 10) || null);

      const currentHoles = match.holes || Array.from({ length: 18 }, () => ({ team1: null, team2: null }));
      const existing = currentHoles[holeIndex] || { team1: null, team2: null };
      const team1Score = team === "team1" ? val : existing.team1;
      const team2Score = team === "team2" ? val : existing.team2;

      await updateMatchHole(matchId, holeIndex, team1Score, team2Score, currentHoles);
    });
  });
}

function holeRow(h, i, course) {
  const par = course.par[i];
  const isSegmentBreak = i === 9;
  let dotClass = "empty";
  if (h && h.team1 != null && h.team2 != null) {
    if (h.team1 < h.team2) dotClass = "t1";
    else if (h.team2 < h.team1) dotClass = "t2";
    else dotClass = "tie";
  }
  return `
    <div class="hole-row ${isSegmentBreak ? "segment-break" : ""}">
      <span class="hnum">${i + 1}</span>
      <span class="hpar">Par ${par}</span>
      <input type="number" min="1" inputmode="numeric" data-hole="${i}" data-team="team1" value="${h && h.team1 != null ? h.team1 : ""}" placeholder="–" />
      <input type="number" min="1" inputmode="numeric" data-hole="${i}" data-team="team2" value="${h && h.team2 != null ? h.team2 : ""}" placeholder="–" />
      <span class="hole-dot ${dotClass}"></span>
    </div>
  `;
}
