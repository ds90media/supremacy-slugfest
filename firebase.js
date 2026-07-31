// firebase.js
// Firebase project connection + thin Firestore helpers.
// Replace firebaseConfig below with your own project's config —
// see README.md for step-by-step setup instructions.

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAn_zV5xAQty6DAv3Y3GjSRwORmOMfKf1c",
  authDomain: "supremacy-slugfest.firebaseapp.com",
  projectId: "supremacy-slugfest",
  storageBucket: "supremacy-slugfest.firebasestorage.app",
  messagingSenderId: "683093013218",
  appId: "1:683093013218:web:63bfc6c53b5e1d8a7e24bb",
  measurementId: "G-0VP9E3RESC"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

// ---------- Players ----------
const playersCol = collection(db, "players");

export function watchPlayers(callback) {
  return onSnapshot(query(playersCol, orderBy("name")), (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
}

export async function addPlayer(name, team) {
  return addDoc(playersCol, { name, team, createdAt: serverTimestamp() });
}

export async function removePlayer(id) {
  return deleteDoc(doc(db, "players", id));
}

// ---------- Matches ----------
const matchesCol = collection(db, "matches");

export function watchMatches(callback) {
  return onSnapshot(query(matchesCol, orderBy("createdAt")), (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
}

export function watchMatch(id, callback) {
  return onSnapshot(doc(db, "matches", id), (snap) => {
    callback(snap.exists() ? { id: snap.id, ...snap.data() } : null);
  });
}

export async function getMatchesOnce() {
  const snap = await getDocs(matchesCol);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function createMatch(matchData) {
  const emptyHoles = Array.from({ length: 18 }, () => ({ team1: null, team2: null }));
  return addDoc(matchesCol, {
    ...matchData,
    holes: emptyHoles,
    status: "in_progress",
    createdAt: serverTimestamp(),
  });
}

export async function updateMatchHole(matchId, holeIndex, team1Score, team2Score, currentHoles) {
  const holes = currentHoles.map((h, i) => (i === holeIndex ? { team1: team1Score, team2: team2Score } : h));
  return updateDoc(doc(db, "matches", matchId), { holes });
}

export async function setMatchStatus(matchId, status) {
  return updateDoc(doc(db, "matches", matchId), { status });
}

export async function deleteMatch(matchId) {
  return deleteDoc(doc(db, "matches", matchId));
}

// ---------- Tournament state (single doc) ----------
const stateRef = doc(db, "tournament", "state");

export function watchTournamentState(callback) {
  return onSnapshot(stateRef, (snap) => {
    callback(
      snap.exists()
        ? snap.data()
        : { currentRound: 1, round1Status: "not_started", round2Status: "not_started", tournamentStatus: "not_started" }
    );
  });
}

export async function setTournamentState(partialState) {
  return setDoc(stateRef, partialState, { merge: true });
}

export { doc, getDoc };
