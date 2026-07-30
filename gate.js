// gate.js
// Simple shared-password gate for the whole site. This is a casual deterrent,
// NOT real security — the password lives in this file's source, so anyone who
// views page source or opens dev tools can read it. It just keeps randoms and
// search engines from stumbling onto your live scores.
//
// Change PASSWORD to whatever you want the group to use.
(function () {
  const PASSWORD = "slugfest2026";
  const STORAGE_KEY = "slugfest_unlocked";

  const overlay = document.getElementById("gate-overlay");
  if (!overlay) return; // page doesn't have the gate markup, skip

  const input = document.getElementById("gate-input");
  const btn = document.getElementById("gate-submit");
  const err = document.getElementById("gate-error");

  if (localStorage.getItem(STORAGE_KEY) === "1") {
    overlay.style.display = "none";
    return;
  }

  function unlock() {
    localStorage.setItem(STORAGE_KEY, "1");
    overlay.style.display = "none";
  }

  function attempt() {
    if (input.value === PASSWORD) {
      unlock();
    } else {
      err.style.display = "block";
      input.value = "";
      input.focus();
    }
  }

  btn.addEventListener("click", attempt);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") attempt();
  });

  // Autofocus so people can just start typing
  setTimeout(() => input && input.focus(), 50);
})();
