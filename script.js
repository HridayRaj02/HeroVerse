// ============================================================
//  HeroVerse — script.js
//  Data comes from a free API, no login needed.
//  API: https://cdn.jsdelivr.net/gh/akabab/superhero-api
// ============================================================

// ── Global Variables ──────────────────────────────────────

const API = "https://cdn.jsdelivr.net/gh/akabab/superhero-api@0.3.0/api";
const PAGE = 24; // how many cards to show per page

let ALL = []; // every hero (loaded once on startup)
let FAVS = []; // heroes the user has saved

const loaded = {}; // tracks which tabs have been set up already

// ── Small Helper Functions ────────────────────────────────

// Returns a CSS class name based on which company published the hero
function pubClass(publisher) {
  if (!publisher) return "pub-other";
  const p = publisher.toLowerCase();
  if (p.includes("marvel")) return "pub-marvel";
  if (p.includes("dc")) return "pub-dc";
  return "pub-other";
}

// Returns a short display label: "Marvel", "DC", or "Other"
function pubLabel(publisher) {
  if (!publisher) return "Other";
  const p = publisher.toLowerCase();
  if (p.includes("marvel")) return "Marvel";
  if (p.includes("dc")) return "DC";
  return "Other";
}

// Adds up all 6 power stats and returns the total
function power(hero) {
  return Object.values(hero.powerstats || {}).reduce(
    (total, val) => total + (parseInt(val) || 0),
    0,
  );
}

// Returns which CSS class to use for the alignment colour dot
function dotClass(alignment) {
  if (alignment === "good") return "align-good";
  if (alignment === "bad") return "align-bad";
  return "align-neutral";
}

// ── App Startup ─────────────────────────────────────────--
//  Runs as soon as the page loads.
//  Fetches all hero data, then shows the dashboard.

(async function startApp() {
  // Show the progress bar is moving
  document.getElementById("lbar").style.width = "30%";

  // Try to download all 731 heroes from the API
  try {
    const response = await fetch(API + "/all.json");
    ALL = await response.json();
  } catch (error) {
    ALL = []; // if the fetch fails, just start with an empty list
  }

  // Fill the bar and show how many heroes loaded
  document.getElementById("lbar").style.width = "100%";
  document.getElementById("ltxt").textContent = ALL.length + " heroes loaded!";

  // Wait half a second, then hide the loader and open the dashboard
  setTimeout(() => {
    const loader = document.getElementById("loader");
    loader.classList.add("hidden");
    setTimeout(() => (loader.style.display = "none"), 400);

    document.getElementById("status").textContent = ALL.length + " heroes";
    initDash();
  }, 500);
})();

// ── Navigation ────────────────────────────────────────────

// Switches to a different tab/section
function goto(id, el) {
  // Hide every section
  document
    .querySelectorAll(".sec")
    .forEach((s) => s.classList.remove("active"));
  // Remove active highlight from all nav links
  document
    .querySelectorAll("nav a")
    .forEach((a) => a.classList.remove("active"));

  // Show the section we want
  document.getElementById("sec-" + id).classList.add("active");
  if (el) el.classList.add("active");

  // Close mobile menu if open
  document.getElementById("nav").classList.remove("open");

  // Favourites tab just re-renders from memory
  if (id === "favs") {
    renderFavs();
    return;
  }

  // Only set up a section once (so we don't re-fetch on every click)
  if (!loaded[id]) {
    loaded[id] = true;
    if (id === "heroes") initHeroes();
    if (id === "marvel") initMarvel();
    if (id === "dc") initDC();
  }
}

// Opens / closes the mobile hamburger menu
function toggleNav() {
  document.getElementById("nav").classList.toggle("open");
}

// ── Dashboard ─────────────────────────────────---------
//  Shows summary stats and the top 9 most powerful heroes.

function initDash() {
  // Count heroes by publisher and alignment
  const marvelCount = ALL.filter((h) =>
    (h.biography.publisher || "").toLowerCase().includes("marvel"),
  ).length;
  const dcCount = ALL.filter((h) =>
    (h.biography.publisher || "").toLowerCase().includes("dc"),
  ).length;
  const heroCount = ALL.filter((h) => h.biography.alignment === "good").length;
  const villainCount = ALL.filter(
    (h) => h.biography.alignment === "bad",
  ).length;

  // Sort all heroes by total power and take the top 9
  const top9 = [...ALL]
    .filter((h) => power(h) > 0)
    .sort((a, b) => power(b) - power(a))
    .slice(0, 9);

  // Inject the stat cards + top heroes grid into the page
  document.getElementById("dash-body").innerHTML = `
    <div class="stat-grid">
      <div class="stat-card t-blue">  <div class="stat-lbl">Total</div>   <div class="stat-val" id="s0">0</div></div>
      <div class="stat-card t-red">   <div class="stat-lbl">Marvel</div>  <div class="stat-val" id="s1">0</div></div>
      <div class="stat-card t-blue">  <div class="stat-lbl">DC</div>      <div class="stat-val" id="s2">0</div></div>
      <div class="stat-card t-green"> <div class="stat-lbl">Heroes</div>  <div class="stat-val" id="s3">0</div></div>
      <div class="stat-card t-red">   <div class="stat-lbl">Villains</div><div class="stat-val" id="s4">0</div></div>
    </div>
    <div class="dash-sub">Top Powered Heroes</div>
    <div class="grid">${top9.map((h) => card(h)).join("")}</div>
  `;

  // Animate each stat number counting up from 0
  const stats = [
    [ALL.length, "s0"],
    [marvelCount, "s1"],
    [dcCount, "s2"],
    [heroCount, "s3"],
    [villainCount, "s4"],
  ];

  stats.forEach(([target, elementId]) => {
    let current = 0;
    const step = Math.max(1, Math.floor(target / 50));
    const timer = setInterval(() => {
      current = Math.min(current + step, target);
      document.getElementById(elementId).textContent = current.toLocaleString();
      if (current >= target) clearInterval(timer);
    }, 20);
  });
}

// ── Hero Card HTML ───────────────────────────────────────-
//  Returns the HTML string for one hero card.

function card(hero) {
  const isFav = FAVS.some((f) => f.id === hero.id);

  return `
    <div class="card" onclick="openHero(${hero.id})">
      <img class="card-img"
        src="${hero.images.md}"
        alt="${hero.name}"
        loading="lazy"
        onerror="this.style.display='none'">
      <div class="card-body">
        <div class="card-name">${hero.name}</div>
        <div class="card-meta">
          <span class="pub-tag ${pubClass(hero.biography.publisher)}">
            ${pubLabel(hero.biography.publisher)}
          </span>
          <button class="fav-btn ${isFav ? "fav-on" : ""}"
            onclick="event.stopPropagation(); toggleFav(${hero.id}, this)">
            <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
          </button>
        </div>
      </div>
    </div>`;
}

// ── Grid Renderer ─────────────────────────────────--------
//  Renders a page of hero cards + pagination buttons.

function renderGrid(list, bodyId, pgId, page, prevFn, nextFn) {
  // Grab just the heroes for this page
  const slice = list.slice(page * PAGE, (page + 1) * PAGE);

  // Show cards or an empty message
  document.getElementById(bodyId).innerHTML = slice.length
    ? slice.map((h) => card(h)).join("")
    : '<div class="empty">No heroes found.</div>';

  // Show pagination if there is more than one page
  const totalPages = Math.ceil(list.length / PAGE);
  document.getElementById(pgId).innerHTML =
    totalPages > 1
      ? `
    <button class="pg-btn" onclick="${prevFn}()" ${page === 0 ? "disabled" : ""}>← Prev</button>
    <span class="pg-info">Page ${page + 1} of ${totalPages} · ${list.length}</span>
    <button class="pg-btn" onclick="${nextFn}()" ${page >= totalPages - 1 ? "disabled" : ""}>Next →</button>
  `
      : "";
}

// ── All Heroes Tab ───────────────────────────────────────-

// Holds the current filter state for the All Heroes tab
let hS = { filtered: [], page: 0, align: "all" };

function initHeroes() {
  applyHF();
}
function filterHeroes() {
  hS.page = 0;
  applyHF();
}

// Called when the user clicks one of the alignment filter buttons
function setAlign(value, btn) {
  hS.align = value;
  hS.page = 0;
  document
    .querySelectorAll("#align-filters .fb")
    .forEach((b) => b.classList.remove("active"));
  btn.classList.add("active");
  applyHF();
}

// Applies the active search text + alignment filter, then re-renders
function applyHF() {
  const query = (document.getElementById("hsearch").value || "")
    .toLowerCase()
    .trim();

  // Start with all heroes, then narrow by alignment
  let list =
    hS.align !== "all"
      ? ALL.filter((h) => h.biography.alignment === hS.align)
      : ALL;

  // Further narrow by search text (name or full name)
  if (query) {
    list = list.filter(
      (h) =>
        h.name.toLowerCase().includes(query) ||
        (h.biography.fullName || "").toLowerCase().includes(query),
    );
  }

  hS.filtered = list;
  document.getElementById("heroes-count").textContent = list.length + " found";
  renderGrid(list, "heroes-body", "heroes-pg", hS.page, "prevH", "nextH");
}

function prevH() {
  hS.page--;
  renderGrid(
    hS.filtered,
    "heroes-body",
    "heroes-pg",
    hS.page,
    "prevH",
    "nextH",
  );
  scrollTo(0, 0);
}
function nextH() {
  hS.page++;
  renderGrid(
    hS.filtered,
    "heroes-body",
    "heroes-pg",
    hS.page,
    "prevH",
    "nextH",
  );
  scrollTo(0, 0);
}

// ── Marvel Tab ────────────────────────────────────────────

let mS = { filtered: [], page: 0 };

function initMarvel() {
  mS.filtered = ALL.filter((h) =>
    (h.biography.publisher || "").toLowerCase().includes("marvel"),
  );
  document.getElementById("marvel-count").textContent =
    mS.filtered.length + " characters";
  renderGrid(mS.filtered, "marvel-body", "marvel-pg", 0, "prevM", "nextM");
}

function filterMarvel() {
  const query = document.getElementById("msearch").value.toLowerCase().trim();
  const base = ALL.filter((h) =>
    (h.biography.publisher || "").toLowerCase().includes("marvel"),
  );
  mS.filtered = query
    ? base.filter((h) => h.name.toLowerCase().includes(query))
    : base;
  mS.page = 0;
  renderGrid(mS.filtered, "marvel-body", "marvel-pg", 0, "prevM", "nextM");
}

function prevM() {
  mS.page--;
  renderGrid(
    mS.filtered,
    "marvel-body",
    "marvel-pg",
    mS.page,
    "prevM",
    "nextM",
  );
  scrollTo(0, 0);
}
function nextM() {
  mS.page++;
  renderGrid(
    mS.filtered,
    "marvel-body",
    "marvel-pg",
    mS.page,
    "prevM",
    "nextM",
  );
  scrollTo(0, 0);
}

// ── DC Tab ───────────────────────────────────────────────-

let dS = { filtered: [], page: 0 };

function initDC() {
  dS.filtered = ALL.filter((h) =>
    (h.biography.publisher || "").toLowerCase().includes("dc"),
  );
  document.getElementById("dc-count").textContent =
    dS.filtered.length + " characters";
  renderGrid(dS.filtered, "dc-body", "dc-pg", 0, "prevD", "nextD");
}

function filterDC() {
  const query = document.getElementById("dsearch").value.toLowerCase().trim();
  const base = ALL.filter((h) =>
    (h.biography.publisher || "").toLowerCase().includes("dc"),
  );
  dS.filtered = query
    ? base.filter((h) => h.name.toLowerCase().includes(query))
    : base;
  dS.page = 0;
  renderGrid(dS.filtered, "dc-body", "dc-pg", 0, "prevD", "nextD");
}

function prevD() {
  dS.page--;
  renderGrid(dS.filtered, "dc-body", "dc-pg", dS.page, "prevD", "nextD");
  scrollTo(0, 0);
}
function nextD() {
  dS.page++;
  renderGrid(dS.filtered, "dc-body", "dc-pg", dS.page, "prevD", "nextD");
  scrollTo(0, 0);
}

// ── Hero Detail Modal ─────────────────────────────────----
//  Opens a full profile panel for the clicked hero.

function openHero(id) {
  const hero = ALL.find((x) => x.id === id);
  if (!hero) return;

  const ps = hero.powerstats;
  const bio = hero.biography;
  const app = hero.appearance;
  const wrk = hero.work;
  const isFav = FAVS.some((f) => f.id === id);

  // Each stat: [display label, value, bar colour]
  const stats = [
    ["Intelligence", parseInt(ps.intelligence) || 0, "var(--blue)"],
    ["Strength", parseInt(ps.strength) || 0, "var(--red)"],
    ["Speed", parseInt(ps.speed) || 0, "var(--gold)"],
    ["Durability", parseInt(ps.durability) || 0, "var(--green)"],
    ["Power", parseInt(ps.power) || 0, "var(--purple)"],
    ["Combat", parseInt(ps.combat) || 0, "#f4845f"],
  ];

  document.getElementById("modal-content").innerHTML = `
    <div class="modal-hero">

      <img class="modal-img" src="${hero.images.lg}" alt="${hero.name}"
        onerror="this.style.display='none'">

      <div class="modal-name">${hero.name}</div>
      <div class="modal-pub">${bio.publisher || "—"} · ${(bio.alignment || "unknown").toUpperCase()}</div>

      <div class="modal-btns">
        <button id="fb-${id}" class="fav-btn ${isFav ? "fav-on" : ""}"
          onclick="toggleFav(${id}, null); syncFavBtn(${id})">
          <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
        </button>
      </div>

      <div class="msec">Biography</div>
      <div class="info-grid">
        <div class="info-row"><div class="info-lbl">Full Name</div>  <div class="info-val">${bio.fullName || "—"}</div></div>
        <div class="info-row"><div class="info-lbl">First App.</div> <div class="info-val">${bio.firstAppearance || "—"}</div></div>
        <div class="info-row"><div class="info-lbl">Height</div>     <div class="info-val">${(app.height || ["—"])[0]}</div></div>
        <div class="info-row"><div class="info-lbl">Weight</div>     <div class="info-val">${(app.weight || ["—"])[0]}</div></div>
        <div class="info-row"><div class="info-lbl">Race</div>       <div class="info-val">${app.race || "—"}</div></div>
        <div class="info-row"><div class="info-lbl">Occupation</div> <div class="info-val">${wrk.occupation || "—"}</div></div>
      </div>

      <div class="msec">Power Stats · Total: ${power(hero)}</div>
      <div class="stats-plain">
        ${stats
          .map(
            ([label, value]) => `
          <div class="stat-plain-row">
            <span class="stat-plain-lbl">${label}</span>
            <span class="stat-plain-val">${value || "?"}</span>
          </div>`,
          )
          .join("")}
      </div>

    </div>
  `;

  // Open the modal
  document.getElementById("modal").classList.add("open");
}

// Updates the like button state inside the open modal
function syncFavBtn(id) {
  const btn = document.getElementById("fb-" + id);
  if (!btn) return;
  const isNowSaved = FAVS.some((f) => f.id === id);
  btn.classList.toggle("fav-on", isNowSaved);
}

// Closes the hero detail modal
function closeM() {
  document.getElementById("modal").classList.remove("open");
}

// ── Favourites ───────────────────────────────────────────-

// Adds or removes a hero from the saved list
function toggleFav(id, btn) {
  const hero = ALL.find((x) => x.id === id);
  if (!hero) return;

  const index = FAVS.findIndex((f) => f.id === id);
  if (index > -1) {
    FAVS.splice(index, 1); // already saved → remove
  } else {
    FAVS.push(hero); // not saved yet → add
  }

  // Update the badge count in the nav
  document.getElementById("fbadge").textContent = FAVS.length;

  // Update the button that was clicked (if one was passed)
  if (btn) {
    const isNowSaved = FAVS.some((f) => f.id === id);
    btn.classList.toggle("fav-on", isNowSaved);
  }
}

// Renders all saved heroes into the Favourites tab
function renderFavs() {
  const container = document.getElementById("favs-body");

  if (!FAVS.length) {
    container.innerHTML = `
      <div class="fav-empty">
        <div class="icon"><svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg></div>
        <p>No favourites yet. Click <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg> Save on any card.</p>
      </div>`;
    return;
  }

  container.innerHTML = FAVS.map(
    (hero) => `
    <div class="card" onclick="openHero(${hero.id})">
      <img class="card-img"
        src="${hero.images.md}"
        alt="${hero.name}"
        loading="lazy"
        onerror="this.style.display='none'">
      <div class="card-body">
        <div class="card-name">${hero.name}</div>
        <div class="card-meta">
          <span class="pub-tag ${pubClass(hero.biography.publisher)}">
            ${pubLabel(hero.biography.publisher)}
          </span>
          <button class="fav-btn fav-on"
            onclick="event.stopPropagation(); toggleFav(${hero.id}); renderFavs()">
            <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
          </button>
        </div>
      </div>
    </div>`,
  ).join("");
}

// Empties the favourites list
function clearFavs() {
  FAVS = [];
  document.getElementById("fbadge").textContent = "0";
  renderFavs();
}

// ── Keyboard Shortcut ─────────────────────────────────----
//  Press Escape to close whichever modal is open.

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    closeM();
  }
});
