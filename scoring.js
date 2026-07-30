// scoring.js
// Pure functions for Ryder Cup style scramble scoring.
// A "match" has 18 holes. Each hole is { team1: number|null, team2: number|null }.
// Front 9 (holes 0-8) and Back 9 (holes 9-17) are each worth 1 point as
// independent match-play segments. The full 18 holes, scored as gross
// scramble strokes, are worth 1 more point (lowest total wins).

/**
 * Walk a segment of holes and figure out the running match-play state,
 * including whether/when it was mathematically clinched early.
 */
export function computeSegment(holes, start, end) {
  let diff = 0; // positive => team1 ahead, negative => team2 ahead
  let holesPlayed = 0;
  let decided = false;
  let marginAtDecision = null;
  let remainingAtDecision = null;

  for (let i = start; i <= end; i++) {
    const h = holes[i];
    if (!h || h.team1 == null || h.team2 == null) break; // stop at first unplayed hole
    holesPlayed++;
    if (h.team1 < h.team2) diff++;
    else if (h.team2 < h.team1) diff--;

    const holesRemaining = end - i; // remaining holes in this segment after this one
    if (!decided && Math.abs(diff) > holesRemaining) {
      decided = true;
      marginAtDecision = Math.abs(diff);
      remainingAtDecision = holesRemaining;
    }
  }

  const totalSegmentHoles = end - start + 1;
  const complete = holesPlayed === totalSegmentHoles;
  const holesRemainingNow = totalSegmentHoles - holesPlayed;
  const isDormie = !decided && holesPlayed > 0 && Math.abs(diff) === holesRemainingNow && holesRemainingNow > 0;

  return {
    diff,
    holesPlayed,
    totalSegmentHoles,
    complete,
    decided,
    marginAtDecision,
    remainingAtDecision,
    isDormie,
    resolved: decided || complete,
  };
}

/** Human-readable status label for a segment, e.g. "2 Up", "Dormie", "Won 3&2", "Halved". */
export function segmentLabel(segment, team1Name, team2Name) {
  if (segment.holesPlayed === 0) return "Not Started";

  if (segment.decided) {
    const leader = segment.diff > 0 ? team1Name : team2Name;
    return `${leader} won ${segment.marginAtDecision}&${segment.remainingAtDecision}`;
  }

  if (segment.complete) {
    if (segment.diff === 0) return "Halved";
    const leader = segment.diff > 0 ? team1Name : team2Name;
    return `${leader} won ${Math.abs(segment.diff)} UP`;
  }

  if (segment.isDormie) return "Dormie";
  if (segment.diff === 0) return "All Square";
  const leader = segment.diff > 0 ? team1Name : team2Name;
  return `${leader} ${Math.abs(segment.diff)} Up`;
}

/** Points awarded for a resolved match-play segment. Pending (not yet resolved) = 0/0, pending:true. */
export function segmentPoints(segment) {
  if (!segment.resolved || segment.holesPlayed === 0) {
    return { team1: 0, team2: 0, pending: true };
  }
  if (segment.diff > 0) return { team1: 1, team2: 0, pending: false };
  if (segment.diff < 0) return { team1: 0, team2: 1, pending: false };
  return { team1: 0.5, team2: 0.5, pending: false };
}

/** Gross stroke totals for a range of holes (scramble score), and whether fully entered. */
export function computeStrokeTotal(holes, start, end) {
  let team1 = 0;
  let team2 = 0;
  let holesPlayed = 0;
  for (let i = start; i <= end; i++) {
    const h = holes[i];
    if (!h || h.team1 == null || h.team2 == null) break;
    team1 += h.team1;
    team2 += h.team2;
    holesPlayed++;
  }
  const complete = holesPlayed === end - start + 1;
  return { team1, team2, holesPlayed, complete };
}

/**
 * Full breakdown for a match: front9 / back9 (match play) + overall (stroke play),
 * plus totals and current-hole live status.
 */
export function analyzeMatch(holes, team1Name, team2Name) {
  const front9 = computeSegment(holes, 0, 8);
  const back9 = computeSegment(holes, 9, 17);
  const overallStrokes = computeStrokeTotal(holes, 0, 17);

  const front9Points = segmentPoints(front9);
  const back9Points = segmentPoints(back9);

  let overallPoints;
  if (!overallStrokes.complete) {
    overallPoints = { team1: 0, team2: 0, pending: true };
  } else if (overallStrokes.team1 < overallStrokes.team2) {
    overallPoints = { team1: 1, team2: 0, pending: false };
  } else if (overallStrokes.team2 < overallStrokes.team1) {
    overallPoints = { team1: 0, team2: 1, pending: false };
  } else {
    overallPoints = { team1: 0.5, team2: 0.5, pending: false };
  }

  const totalPoints = {
    team1: front9Points.team1 + back9Points.team1 + overallPoints.team1,
    team2: front9Points.team2 + back9Points.team2 + overallPoints.team2,
  };

  const holesPlayed = holes.filter((h) => h && h.team1 != null && h.team2 != null).length;
  const matchComplete = holesPlayed === 18;

  // Live status: whichever 9 the current action is in.
  const currentSegment = holesPlayed <= 9 ? front9 : back9;
  const liveLabel = holesPlayed === 0 ? "Not Started" : segmentLabel(currentSegment, team1Name, team2Name);
  const currentHole = holesPlayed >= 18 ? 18 : holesPlayed + 1;

  return {
    front9: { ...front9, label: segmentLabel(front9, team1Name, team2Name), points: front9Points },
    back9: { ...back9, label: segmentLabel(back9, team1Name, team2Name), points: back9Points },
    overall: { ...overallStrokes, points: overallPoints },
    totalPoints,
    holesPlayed,
    currentHole,
    matchComplete,
    liveLabel,
  };
}

/** Given a list of match docs, sum team points across all of them. */
export function tournamentTotals(matches) {
  let team1 = 0;
  let team2 = 0;
  for (const m of matches) {
    const a = analyzeMatch(m.holes, m.team1?.players?.join(" / ") || "Team 1", m.team2?.players?.join(" / ") || "Team 2");
    team1 += a.totalPoints.team1;
    team2 += a.totalPoints.team2;
  }
  return { team1, team2 };
}
