// ===========================================
// HEROVERSE — script.js
// Organized Sections:
//  1. API Config & Global State
//  2. Boot Sequence (JARVIS startup)
//  3. Helper Functions
//  4. Navigation
//  5. Dashboard (initDash)
//  6. Hero Grid Engine (renderGrid)
//  7. All Heroes Section
//  8. Marvel Section
//  9. DC Section
// 10. Hero Modal (openHero)
// 11. Favourites System
// 12. Compare System
// 13. Timeline Section
// ===========================================


// ===========================================
// 1. API CONFIG & GLOBAL STATE
// ===========================================

// Free API — no key needed!
// Source: https://github.com/akabab/superhero-api
const API_BASE = 'https://cdn.jsdelivr.net/gh/akabab/superhero-api@0.3.0/api';

let ALL  = [];   // Full list of all 731 heroes (loaded once at boot)
let FAVS = [];   // Heroes saved as favourites
let CMP  = [];   // Heroes selected for comparison (max 2)

// How many hero cards to show per page
const PAGE_SIZE = 24;

// Tracks which sections have already been initialized
const sectionState = {};

// State for each section's pagination + search
const hState = { list: [], filtered: [], page: 0, alignF: 'all' }; // All Heroes
const mState = { list: [], filtered: [], page: 0 };                 // Marvel
const dState = { list: [], filtered: [], page: 0 };                 // DC


// ===========================================
// 2. BOOT SEQUENCE (JARVIS terminal startup)
// ===========================================

// Lines that appear one by one on the boot screen
const BOOT_SEQ = [
  ['HEROVERSE INTELLIGENCE SYSTEM v3.0',            'ok'],
  ['CONNECTING TO SUPERHERO API (NO KEY REQUIRED)…','ok'],
  ['ENDPOINT: cdn.jsdelivr.net/gh/akabab/superhero-api', 'ok'],
  ['FETCHING 731 HERO PROFILES…',                   'ok'],
  ['LOADING CHART.JS ANALYTICS ENGINE…',            'ok'],
  ['ENABLING HERO COMPARISON MODULE…',              'ok'],
  ['FAVOURITES SYSTEM READY…',                      'ok'],
  ['ALL SYSTEMS NOMINAL — WELCOME, AGENT',          'ok'],
];

// Self-invoking async function — runs immediately when page loads
(async function boot() {
  const linesEl = document.getElementById('blines');
  const bar     = document.getElementById('bbar');
  const pct     = document.getElementById('bpct');
  let i = 0;

  // Print each boot line one by one with a small delay
  function nextLine() {
    if (i >= BOOT_SEQ.length) return;

    const [text, cls] = BOOT_SEQ[i];

    // Create a new line element
    const div = document.createElement('div');
    div.className = 'boot-line';
    div.innerHTML = '&gt; ' + text + ' <span class="' + cls + '">[' + cls.toUpperCase() + ']</span>';
    div.style.animationDelay = '0s';
    linesEl.appendChild(div);

    // Update progress bar
    const progress = Math.round(((i + 1) / BOOT_SEQ.length) * 100);
    bar.style.width = progress + '%';
    pct.textContent = progress + '%';

    i++;
    setTimeout(nextLine, 180 + Math.random() * 100);
  }

  // Start printing lines AND fetch all hero data at the same time
  nextLine();

  try {
    const res = await fetch(API_BASE + '/all.json');
    ALL = await res.json();
  } catch (e) {
    ALL = []; // If fetch fails, app still loads with empty data
    console.error('Failed to load hero data:', e);
  }

  // Wait until all boot lines are printed before hiding the boot screen
  const waitForLines = setInterval(() => {
    if (i >= BOOT_SEQ.length) {
      clearInterval(waitForLines);

      setTimeout(() => {
        // Fade out boot screen
        const bootEl = document.getElementById('boot');
        bootEl.classList.add('fade');

        setTimeout(() => {
          bootEl.style.display = 'none';
        }, 500);

        // Update status label in header
        document.getElementById('slbl').textContent = ALL.length + ' HEROES LOADED';

        // Load the dashboard now
        initDash();
      }, 400);
    }
  }, 100);
})();


// ===========================================
// 3. HELPER FUNCTIONS
// ===========================================

/** Returns a loading spinner HTML string */
function loaderH(text) {
  return '<div class="loader"><div class="lring"></div><div class="ltxt">' + text + '</div></div>';
}

/**
 * Returns the CSS class for a publisher badge
 * e.g. "Marvel Comics" → "pub-marvel"
 */
function pubClass(publisher) {
  if (!publisher) return 'pub-other';
  const p = publisher.toLowerCase();
  if (p.includes('marvel')) return 'pub-marvel';
  if (p.includes('dc'))     return 'pub-dc';
  return 'pub-other';
}

/** Returns short publisher label: "MARVEL", "DC", or "OTHER" */
function pubLabel(publisher) {
  if (!publisher) return 'OTHER';
  const p = publisher.toLowerCase();
  if (p.includes('marvel')) return 'MARVEL';
  if (p.includes('dc'))     return 'DC';
  return 'OTHER';
}

/** Returns CSS class based on hero alignment (good/bad/neutral) */
function alignClass(alignment) {
  if (!alignment)          return 'align-neutral';
  if (alignment === 'good') return 'align-good';
  if (alignment === 'bad')  return 'align-bad';
  return 'align-neutral';
}

/** Calculates total power score by summing all powerstats */
function totalPower(hero) {
  if (!hero.powerstats) return 0;
  return Object.values(hero.powerstats)
    .reduce((sum, val) => sum + (parseInt(val) || 0), 0);
}

/**
 * Animates a number counting up from 0 to target
 * Used for dashboard stat cards
 */
function animCount(elementId, target) {
  const el = document.getElementById(elementId);
  if (!el) return;
  let current = 0;
  const step = Math.max(1, Math.floor(target / 60));
  const timer = setInterval(() => {
    current = Math.min(current + step, target);
    el.textContent = current.toLocaleString();
    if (current >= target) clearInterval(timer);
  }, 20);
}


// ===========================================
// 4. NAVIGATION
// ===========================================

/**
 * Switches the visible section
 * Called by onclick on nav links in index.html
 * @param {string} id - section name (e.g. 'heroes', 'marvel')
 * @param {Element} el - the nav <a> element that was clicked
 */
function gotoSec(id, el) {
  // Hide all sections, deactivate all nav links
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('nav a').forEach(a => a.classList.remove('active'));

  // Show the selected section and highlight the nav link
  document.getElementById('section-' + id).classList.add('active');
  if (el) el.classList.add('active');

  // Favourites section re-renders every time (so new favs show up)
  if (id === 'favs') {
    renderFavs();
    return;
  }

  // Only initialize a section the first time it is visited
  if (!sectionState[id] && ALL.length > 0) {
    sectionState[id] = true;
    if (id === 'heroes')   initHeroes();
    if (id === 'marvel')   initMarvel();
    if (id === 'dc')       initDC();
    if (id === 'timeline') initTimeline();
  }
}


// ===========================================
// 5. DASHBOARD
// ===========================================

function initDash() {
  sectionState.dash = true;

  // Split the full hero list by publisher and alignment
  const marvel  = ALL.filter(h => h.biography.publisher?.toLowerCase().includes('marvel'));
  const dc      = ALL.filter(h => h.biography.publisher?.toLowerCase().includes('dc'));
  const good    = ALL.filter(h => h.biography.alignment === 'good');

  // Top 9 heroes sorted by total power for the "recently seen" grid
  const topPower = [...ALL]
    .filter(h => totalPower(h) > 0)
    .sort((a, b) => totalPower(b) - totalPower(a))
    .slice(0, 9);

  // Build the dashboard HTML and inject it
  document.getElementById('dash-body').innerHTML = `
    <!-- Stat Cards Row -->
    <div class="dash-stats">
      <div class="dsc b">
        <div class="dsc-lbl">TOTAL HEROES</div>
        <div class="dsc-val" id="dc0">0</div>
        <div class="dsc-sub">IN DATABASE</div>
      </div>
      <div class="dsc r">
        <div class="dsc-lbl">MARVEL</div>
        <div class="dsc-val" id="dc1">0</div>
        <div class="dsc-sub">CHARACTERS</div>
      </div>
      <div class="dsc g">
        <div class="dsc-lbl">DC COMICS</div>
        <div class="dsc-val" id="dc2">0</div>
        <div class="dsc-sub">CHARACTERS</div>
      </div>
      <div class="dsc gr">
        <div class="dsc-lbl">HEROES</div>
        <div class="dsc-val" id="dc3">0</div>
        <div class="dsc-sub">GOOD ALIGNMENT</div>
      </div>
    </div>

    <!-- Charts Row -->
    <div class="dash-charts">
      <div class="cpanel">
        <div class="cptitle">UNIVERSE BREAKDOWN</div>
        <div class="cwrap"><canvas id="ch1"></canvas></div>
      </div>
      <div class="cpanel">
        <div class="cptitle">ALIGNMENT SPLIT</div>
        <div class="cwrap"><canvas id="ch2"></canvas></div>
      </div>
    </div>

    <!-- Top Powered Heroes Grid -->
    <div class="dash-recent">
      <div class="rct-title">TOP POWERED HEROES</div>
      <div class="rct-grid">
        ${topPower.map((h, i) => `
          <div class="rct-card" style="animation-delay:${i * .05}s" onclick="openHero(${h.id})">
            <img src="${h.images.sm}" alt="${h.name}" loading="lazy" onerror="this.style.display='none'">
            <div class="rct-name">${h.name}</div>
          </div>
        `).join('')}
      </div>
    </div>`;

  // Animate stat counters
  animCount('dc0', ALL.length);
  animCount('dc1', marvel.length);
  animCount('dc2', dc.length);
  animCount('dc3', good.length);

  // ── Chart 1: Universe Doughnut ──
  const ctx1 = document.getElementById('ch1').getContext('2d');
  new Chart(ctx1, {
    type: 'doughnut',
    data: {
      labels: ['Marvel', 'DC', 'Other'],
      datasets: [{
        data: [
          marvel.length,
          dc.length,
          ALL.length - marvel.length - dc.length
        ],
        backgroundColor: [
          'rgba(230, 36, 41, .8)',
          'rgba(59, 130, 246, .8)',
          'rgba(240, 178, 50, .8)'
        ],
        borderWidth: 0,
        hoverOffset: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: { color: '#c8dde8', font: { family: 'Orbitron', size: 10 }, padding: 12 }
        }
      },
      cutout: '62%'
    }
  });

  // ── Chart 2: Alignment Doughnut ──
  const bad     = ALL.filter(h => h.biography.alignment === 'bad').length;
  const neutral = ALL.length - good.length - bad;
  const ctx2    = document.getElementById('ch2').getContext('2d');

  new Chart(ctx2, {
    type: 'doughnut',
    data: {
      labels: ['Heroes', 'Villains', 'Neutral'],
      datasets: [{
        data: [good.length, bad, neutral],
        backgroundColor: [
          'rgba(0, 255, 136, .75)',
          'rgba(230, 36, 41, .75)',
          'rgba(74, 96, 112, .75)'
        ],
        borderWidth: 0,
        hoverOffset: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: { color: '#c8dde8', font: { family: 'Orbitron', size: 10 }, padding: 12 }
        }
      },
      cutout: '62%'
    }
  });
}


// ===========================================
// 6. HERO GRID ENGINE
// ===========================================

/**
 * Renders a paginated grid of hero cards into a container
 *
 * @param {Array}  heroes      - the filtered array of heroes to show
 * @param {string} containerId - the DOM id to inject cards into
 * @param {string} pgId        - the DOM id of the pagination bar
 * @param {number} page        - current page number (0-indexed)
 * @param {string} prevFn      - function name string for Prev button
 * @param {string} nextFn      - function name string for Next button
 */
function renderGrid(heroes, containerId, pgId, page, prevFn, nextFn) {
  const start = page * PAGE_SIZE;
  const slice = heroes.slice(start, start + PAGE_SIZE);

  // Show empty state if no results
  if (!slice.length) {
    document.getElementById(containerId).innerHTML = '<div class="empty">// NO HEROES FOUND</div>';
    document.getElementById(pgId).style.display = 'none';
    return;
  }

  // Build each hero card
  document.getElementById(containerId).innerHTML =
    '<div class="hgrid">' +
    slice.map((h, i) => {
      const isFav = FAVS.some(f => f.id === h.id);
      const isCmp = CMP.some(c => c.id === h.id);
      const ps    = h.powerstats;

      // Three mini stat bars shown on the card
      const miniStats = [
        { label: 'STR', value: parseInt(ps.strength)     || 0, color: '#e62429' },
        { label: 'INT', value: parseInt(ps.intelligence) || 0, color: '#00c8ff' },
        { label: 'CMB', value: parseInt(ps.combat)       || 0, color: '#f0b232' },
      ];

      return `
        <div class="hcard" style="animation-delay:${i * .035}s" onclick="openHero(${h.id})">

          <!-- Image section -->
          <div class="him">
            <img src="${h.images.md}" alt="${h.name}" loading="lazy"
              onerror="this.style.display='none'">
            <div class="hov"></div>
            <span class="hpub ${pubClass(h.biography.publisher)}">${pubLabel(h.biography.publisher)}</span>
            <button class="hfav ${isFav ? 'on' : ''}"
              onclick="toggleFav(event, ${h.id})" title="Save to Favourites">♥</button>
            <span class="halign ${alignClass(h.biography.alignment)}">
              ${(h.biography.alignment || '—').toUpperCase()}
            </span>
          </div>

          <!-- Text info section -->
          <div class="hinfo">
            <div class="hname">${h.name.toUpperCase()}</div>
            <div class="hfull">
              ${h.biography.fullName && h.biography.fullName !== '-' ? h.biography.fullName : '&nbsp;'}
            </div>

            <!-- Mini stat bars -->
            <div class="hstats-mini">
              ${miniStats.map(s => `
                <div class="hsm">
                  <span class="hsm-l">${s.label}</span>
                  <div class="hsm-bar">
                    <div class="hsm-fill" style="width:${s.value}%; background:${s.color}"></div>
                  </div>
                  <span class="hsm-v">${s.value || '?'}</span>
                </div>
              `).join('')}
            </div>

            <!-- Footer: power score + compare button -->
            <div class="hfoot">
              <span style="font-family:var(--mono);font-size:.54rem;color:var(--gold)">
                ⚡ ${totalPower(h)} PWR
              </span>
              <button class="hcmp ${isCmp ? 'sel' : ''}"
                onclick="toggleCmp(event, ${h.id})" title="Add to Compare">+ CMP</button>
            </div>
          </div>

        </div>`;
    }).join('') +
    '</div>';

  // Build pagination bar
  const totalPages = Math.ceil(heroes.length / PAGE_SIZE);
  const pgEl = document.getElementById(pgId);

  if (totalPages > 1) {
    pgEl.style.display = 'flex';
    pgEl.innerHTML = `
      <button class="pgb" onclick="${prevFn}()" ${page === 0 ? 'disabled' : ''}>◀ PREV</button>
      <span class="pgi">
        PAGE <b>${page + 1}</b> / <b>${totalPages}</b> &nbsp;·&nbsp; ${heroes.length} HEROES
      </span>
      <button class="pgb" onclick="${nextFn}()" ${page >= totalPages - 1 ? 'disabled' : ''}>NEXT ▶</button>`;
  } else {
    pgEl.style.display = 'none';
  }
}


// ===========================================
// 7. ALL HEROES SECTION
// ===========================================

function initHeroes() {
  hState.list = ALL;
  applyHeroFilters();
}

/** Called when user types in the search box */
function filterHeroes() {
  hState.page = 0;
  applyHeroFilters();
}

/** Called when an alignment filter button is clicked */
function setAlignFilter(value, btn) {
  hState.alignF = value;
  hState.page   = 0;
  // Toggle the active class on the clicked button
  document.querySelectorAll('#align-filters .fb').forEach(b => b.classList.remove('on'));
  btn.classList.add('on');
  applyHeroFilters();
}

/** Applies both alignment filter and search query, then re-renders */
function applyHeroFilters() {
  const query = (document.getElementById('hsearch').value || '').toLowerCase().trim();
  let list = hState.list;

  // Filter by alignment
  if (hState.alignF !== 'all') {
    list = list.filter(h => h.biography.alignment === hState.alignF);
  }

  // Filter by search query (name or real name)
  if (query) {
    list = list.filter(h =>
      h.name.toLowerCase().includes(query) ||
      (h.biography.fullName || '').toLowerCase().includes(query)
    );
  }

  hState.filtered = list;
  document.getElementById('heroes-count').textContent = list.length + ' HEROES FOUND';
  renderGrid(list, 'heroes-body', 'heroes-pg', hState.page, 'prevH', 'nextH');
}

// Pagination controls
function prevH() { hState.page--; renderGrid(hState.filtered, 'heroes-body', 'heroes-pg', hState.page, 'prevH', 'nextH'); scrollTo(0, 0); }
function nextH() { hState.page++; renderGrid(hState.filtered, 'heroes-body', 'heroes-pg', hState.page, 'prevH', 'nextH'); scrollTo(0, 0); }


// ===========================================
// 8. MARVEL SECTION
// ===========================================

function initMarvel() {
  // Filter only Marvel characters
  mState.list     = ALL.filter(h => h.biography.publisher?.toLowerCase().includes('marvel'));
  mState.filtered = mState.list;
  document.getElementById('marvel-count').textContent = mState.list.length + ' CHARACTERS';
  renderGrid(mState.filtered, 'marvel-body', 'marvel-pg', mState.page, 'prevM', 'nextM');
}

function filterMarvel() {
  const query     = document.getElementById('msearch').value.toLowerCase().trim();
  mState.filtered = query ? mState.list.filter(h => h.name.toLowerCase().includes(query)) : mState.list;
  mState.page     = 0;
  renderGrid(mState.filtered, 'marvel-body', 'marvel-pg', mState.page, 'prevM', 'nextM');
}

function prevM() { mState.page--; renderGrid(mState.filtered, 'marvel-body', 'marvel-pg', mState.page, 'prevM', 'nextM'); scrollTo(0, 0); }
function nextM() { mState.page++; renderGrid(mState.filtered, 'marvel-body', 'marvel-pg', mState.page, 'prevM', 'nextM'); scrollTo(0, 0); }


// ===========================================
// 9. DC SECTION
// ===========================================

function initDC() {
  // Filter only DC characters
  dState.list     = ALL.filter(h => h.biography.publisher?.toLowerCase().includes('dc'));
  dState.filtered = dState.list;
  document.getElementById('dc-count').textContent = dState.list.length + ' CHARACTERS';
  renderGrid(dState.filtered, 'dc-body', 'dc-pg', dState.page, 'prevD', 'nextD');
}

function filterDC() {
  const query     = document.getElementById('dsearch').value.toLowerCase().trim();
  dState.filtered = query ? dState.list.filter(h => h.name.toLowerCase().includes(query)) : dState.list;
  dState.page     = 0;
  renderGrid(dState.filtered, 'dc-body', 'dc-pg', dState.page, 'prevD', 'nextD');
}

function prevD() { dState.page--; renderGrid(dState.filtered, 'dc-body', 'dc-pg', dState.page, 'prevD', 'nextD'); scrollTo(0, 0); }
function nextD() { dState.page++; renderGrid(dState.filtered, 'dc-body', 'dc-pg', dState.page, 'prevD', 'nextD'); scrollTo(0, 0); }


// ===========================================
// 10. HERO MODAL
// ===========================================

/**
 * Opens the hero detail modal for a given hero ID
 * @param {number} id - The hero's id from the ALL array
 */
function openHero(id) {
  const hero = ALL.find(h => h.id === id);
  if (!hero) return;

  const overlay = document.getElementById('hmodal');
  const content = document.getElementById('mcontent');
  overlay.classList.add('open');

  const ps     = hero.powerstats;
  const bio    = hero.biography;
  const app    = hero.appearance;
  const work   = hero.work;
  const isFav  = FAVS.some(f => f.id === hero.id);

  // Define stat bars with colors
  const stats = [
    { label: 'INTELLIGENCE', value: parseInt(ps.intelligence) || 0, color: '#00c8ff' },
    { label: 'STRENGTH',     value: parseInt(ps.strength)     || 0, color: '#e62429' },
    { label: 'SPEED',        value: parseInt(ps.speed)        || 0, color: '#f0b232' },
    { label: 'DURABILITY',   value: parseInt(ps.durability)   || 0, color: '#00ff88' },
    { label: 'POWER',        value: parseInt(ps.power)        || 0, color: '#a855f7' },
    { label: 'COMBAT',       value: parseInt(ps.combat)       || 0, color: '#ff6b35' },
  ];

  // Build the modal HTML
  content.innerHTML = `
    <!-- Banner Image -->
    <div class="mbanner">
      <img src="${hero.images.lg}" alt="${hero.name}" onerror="this.style.display='none'">
      <div class="mban-ph">${hero.name[0]}</div>
      <div class="mban-ov">
        <div>
          <div class="mhname">${hero.name.toUpperCase()}</div>
          <div class="mhfull">
            ${bio.fullName && bio.fullName !== '-' ? '// ' + bio.fullName : ''}
          </div>
        </div>
      </div>
    </div>

    <!-- Two-column body -->
    <div class="mbody">

      <!-- LEFT COLUMN: Bio info + action buttons -->
      <div>
        <div class="msec">BIOGRAPHY</div>

        <div class="minfo-row">
          <span class="minfo-lbl">PUBLISHER</span>
          <span class="minfo-val" style="color:${bio.publisher?.toLowerCase().includes('marvel') ? 'var(--red)' : '#3b82f6'}">
            ${bio.publisher || '—'}
          </span>
        </div>
        <div class="minfo-row">
          <span class="minfo-lbl">FIRST APP</span>
          <span class="minfo-val">${bio.firstAppearance || '—'}</span>
        </div>
        <div class="minfo-row">
          <span class="minfo-lbl">ALIGNMENT</span>
          <span class="minfo-val" style="color:${bio.alignment === 'good' ? 'var(--green)' : bio.alignment === 'bad' ? 'var(--red)' : 'var(--textd)'}">
            ${(bio.alignment || '—').toUpperCase()}
          </span>
        </div>
        <div class="minfo-row">
          <span class="minfo-lbl">ALIASES</span>
          <span class="minfo-val" style="font-size:.58rem">
            ${(bio.aliases || []).slice(0, 3).join(', ') || '—'}
          </span>
        </div>

        <div class="msec" style="margin-top:1.2rem">APPEARANCE</div>
        <div class="minfo-row">
          <span class="minfo-lbl">HEIGHT</span>
          <span class="minfo-val">${(app.height || ['-'])[0]}</span>
        </div>
        <div class="minfo-row">
          <span class="minfo-lbl">WEIGHT</span>
          <span class="minfo-val">${(app.weight || ['-'])[0]}</span>
        </div>
        <div class="minfo-row">
          <span class="minfo-lbl">RACE</span>
          <span class="minfo-val">${app.race || '—'}</span>
        </div>
        <div class="minfo-row">
          <span class="minfo-lbl">EYE COLOR</span>
          <span class="minfo-val">${app.eyeColor || '—'}</span>
        </div>
        <div class="minfo-row">
          <span class="minfo-lbl">HAIR COLOR</span>
          <span class="minfo-val">${app.hairColor || '—'}</span>
        </div>

        <div class="msec" style="margin-top:1.2rem">WORK & AFFILIATIONS</div>
        <div class="minfo-row">
          <span class="minfo-lbl">OCCUPATION</span>
          <span class="minfo-val" style="font-size:.6rem">${work.occupation || '—'}</span>
        </div>
        <div class="minfo-row">
          <span class="minfo-lbl">BASE</span>
          <span class="minfo-val" style="font-size:.6rem">${work.base || '—'}</span>
        </div>
        <div style="margin-top:8px;font-family:var(--mono);font-size:.58rem;color:var(--textd);line-height:1.6;">
          ${hero.connections.groupAffiliation || ''}
        </div>

        <!-- Action buttons -->
        <div class="mbtns" style="margin-top:1.4rem">
          <button id="fav-btn-${hero.id}"
            class="mbtn mbtn-fav ${isFav ? 'on' : ''}"
            onclick="toggleFav(null, ${hero.id}); syncFavBtn(${hero.id})">
            ${isFav ? '♥ SAVED' : '♡ FAVOURITE'}
          </button>
          <button class="mbtn mbtn-cmp" onclick="toggleCmp(null, ${hero.id})">
            + COMPARE
          </button>
        </div>
      </div>

      <!-- RIGHT COLUMN: Power stats + radar chart -->
      <div>
        <div class="msec">POWER STATS</div>

        <!-- Animated stat bars (width set to 0 then animated by JS below) -->
        ${stats.map(s => `
          <div class="srow">
            <span class="slbl">${s.label}</span>
            <div class="strk">
              <div class="sfill" data-v="${s.value}" style="background:${s.color}"></div>
            </div>
            <span class="sval">${s.value || '?'}</span>
          </div>
        `).join('')}

        <div style="margin-top:6px;font-family:var(--mono);font-size:.62rem;color:var(--gold);">
          TOTAL POWER: ${totalPower(hero)}
        </div>

        <div class="msec" style="margin-top:1.4rem">STATS RADAR</div>
        <div style="position:relative;height:210px;margin-top:8px;">
          <canvas id="hradar"></canvas>
        </div>
      </div>

    </div>`;

  // Short delay to let DOM render, then animate the stat bars and draw the radar
  setTimeout(() => {
    // Animate bars from 0 to actual value
    document.querySelectorAll('.sfill').forEach(bar => {
      bar.style.width = bar.dataset.v + '%';
    });

    // Draw radar chart using Chart.js
    const radarCanvas = document.getElementById('hradar');
    if (radarCanvas) {
      new Chart(radarCanvas.getContext('2d'), {
        type: 'radar',
        data: {
          labels: stats.map(s => s.label),
          datasets: [{
            label: hero.name,
            data: stats.map(s => s.value),
            borderColor: 'rgba(0, 200, 255, .9)',
            backgroundColor: 'rgba(0, 200, 255, .1)',
            pointBackgroundColor: '#00c8ff',
            borderWidth: 1.5
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            r: {
              grid:        { color: 'rgba(0, 200, 255, .07)' },
              angleLines:  { color: 'rgba(0, 200, 255, .07)' },
              pointLabels: { color: '#c8dde8', font: { family: 'Orbitron', size: 9 } },
              ticks:       { display: false },
              min: 0, max: 100
            }
          },
          plugins: { legend: { display: false } }
        }
      });
    }
  }, 80);
}

/** Updates the Favourite button inside an open modal */
function syncFavBtn(id) {
  const btn = document.getElementById('fav-btn-' + id);
  if (!btn) return;
  const isNowFav = FAVS.some(f => f.id === id);
  btn.classList.toggle('on', isNowFav);
  btn.textContent = isNowFav ? '♥ SAVED' : '♡ FAVOURITE';
}

// Close the hero modal
function closeM()      { document.getElementById('hmodal').classList.remove('open'); }
function closeMov(e)   { if (e.target === document.getElementById('hmodal')) closeM(); }

// Close either modal when Escape key is pressed
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { closeM(); closeCM(); }
});


// ===========================================
// 11. FAVOURITES SYSTEM
// ===========================================

/**
 * Adds or removes a hero from the FAVS array
 * @param {Event|null} e  - click event (stopped from bubbling to card)
 * @param {number}     id - hero id
 */
function toggleFav(e, id) {
  if (e) e.stopPropagation(); // Don't open the hero modal when clicking ♥

  const hero = ALL.find(h => h.id === id);
  if (!hero) return;

  const index = FAVS.findIndex(f => f.id === id);

  if (index > -1) {
    FAVS.splice(index, 1);  // Remove from favourites
  } else {
    FAVS.push(hero);         // Add to favourites
  }

  // Update the badge count in the nav
  document.getElementById('fbadge').textContent = FAVS.length;

  // Update the ♥ button on the card (if it's visible in the current grid)
  document.querySelectorAll('.hfav').forEach(btn => {
    const card = btn.closest('.hcard');
    if (card && card.getAttribute('onclick')?.includes('(' + id + ')')) {
      btn.classList.toggle('on', FAVS.some(f => f.id === id));
    }
  });
}

/** Renders the Favourites section content */
function renderFavs() {
  const container = document.getElementById('favs-body');

  if (!FAVS.length) {
    container.innerHTML = `
      <div class="favs-empty">
        <div class="favs-empty-ic">♡</div>
        <h2>NO FAVOURITES YET</h2>
        <p>Tap the ♥ on any hero card to save them here.</p>
      </div>`;
    return;
  }

  container.innerHTML =
    '<div class="hgrid">' +
    FAVS.map((h, i) => `
      <div class="hcard" style="animation-delay:${i * .05}s" onclick="openHero(${h.id})">
        <div class="him">
          <img src="${h.images.md}" alt="${h.name}" loading="lazy" onerror="this.style.display='none'">
          <div class="hov"></div>
          <span class="hpub ${pubClass(h.biography.publisher)}">${pubLabel(h.biography.publisher)}</span>
          <button class="hfav on"
            onclick="toggleFav(event, ${h.id}); renderFavs();">♥</button>
        </div>
        <div class="hinfo">
          <div class="hname">${h.name.toUpperCase()}</div>
          <div class="hfull">
            ${h.biography.fullName && h.biography.fullName !== '-' ? h.biography.fullName : '&nbsp;'}
          </div>
          <div style="font-family:var(--mono);font-size:.56rem;color:var(--gold)">
            ⚡ ${totalPower(h)} TOTAL POWER
          </div>
        </div>
      </div>
    `).join('') +
    '</div>';
}

/** Clears all saved favourites */
function clearFavs() {
  FAVS = [];
  document.getElementById('fbadge').textContent = '0';
  renderFavs();
}


// ===========================================
// 12. COMPARE SYSTEM
// ===========================================

/**
 * Adds or removes a hero from the compare list (max 2)
 * @param {Event|null} e  - click event
 * @param {number}     id - hero id
 */
function toggleCmp(e, id) {
  if (e) e.stopPropagation();

  const hero  = ALL.find(h => h.id === id);
  if (!hero) return;

  const index = CMP.findIndex(c => c.id === id);

  if (index > -1) {
    CMP.splice(index, 1); // Remove if already selected
  } else {
    if (CMP.length >= 2) {
      alert('Max 2 heroes for comparison. Remove one first.');
      return;
    }
    CMP.push(hero); // Add to compare list
  }

  updateCmpBar();

  // Update the "+ CMP" button state on the card
  document.querySelectorAll('.hcmp').forEach(btn => {
    const card = btn.closest('.hcard');
    if (card && card.getAttribute('onclick')?.includes('(' + id + ')')) {
      btn.classList.toggle('sel', CMP.some(c => c.id === id));
    }
  });
}

/** Updates the sticky compare bar at the bottom */
function updateCmpBar() {
  const bar   = document.getElementById('cmpbar');
  const slots = document.getElementById('cslots');

  if (!CMP.length) {
    bar.classList.remove('vis');
    return;
  }

  bar.classList.add('vis');

  slots.innerHTML =
    CMP.map(h => `
      <div class="cslot">
        <img src="${h.images.xs}" style="width:28px;height:28px;border-radius:2px;object-fit:cover;object-position:top"
          onerror="this.style.display='none'">
        <span class="cslot-n">${h.name}</span>
        <span class="crm" onclick="toggleCmp(null, ${h.id})">✕</span>
      </div>
    `).join('') +
    (CMP.length < 2
      ? '<div class="cslot"><div class="cslot-ph">+</div><span class="cslot-n emp">Select 2nd hero…</span></div>'
      : '');
}

/** Clears the compare selection */
function clearCmp() {
  CMP = [];
  updateCmpBar();
  document.querySelectorAll('.hcmp').forEach(b => b.classList.remove('sel'));
}

/** Opens the comparison modal with two selected heroes */
function runCmp() {
  if (CMP.length < 2) { alert('Select 2 heroes first!'); return; }

  const h1 = CMP[0];
  const h2 = CMP[1];

  const overlay = document.getElementById('cmodal');
  const content = document.getElementById('ccontent');
  overlay.classList.add('open');

  // Stat keys and short labels
  const statKeys   = ['intelligence', 'strength', 'speed', 'durability', 'power', 'combat'];
  const statLabels = ['INT', 'STR', 'SPD', 'DUR', 'PWR', 'CMB'];

  // Get numeric values for both heroes
  const s1 = statKeys.map(k => parseInt(h1.powerstats[k]) || 0);
  const s2 = statKeys.map(k => parseInt(h2.powerstats[k]) || 0);

  const total1 = s1.reduce((a, b) => a + b, 0);
  const total2 = s2.reduce((a, b) => a + b, 0);
  const winner = total1 > total2 ? h1 : total2 > total1 ? h2 : null;

  content.innerHTML = `
    <!-- Header row with winner banner -->
    <div style="padding:1.2rem 1.8rem;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between">
      <div class="msec" style="margin:0">⚔ HERO COMPARISON</div>
      ${winner
        ? `<span style="font-family:var(--hud);font-size:.55rem;letter-spacing:.1em;color:var(--gold)">
             WINNER: ${winner.name.toUpperCase()}
           </span>`
        : `<span style="font-family:var(--hud);font-size:.52rem;color:var(--textd)">TIE</span>`
      }
    </div>

    <div class="cmpbody">

      <!-- Hero images + names -->
      <div class="cmph">
        <div class="cmpcol">
          <img src="${h1.images.md}" alt="${h1.name}" onerror="this.style.display='none'">
          <div class="cmpn">${h1.name}</div>
          <div class="cmpm">${h1.biography.publisher || ''} &nbsp;·&nbsp; ${total1} PWR</div>
        </div>
        <div class="cmpcol">
          <img src="${h2.images.md}" alt="${h2.name}" onerror="this.style.display='none'">
          <div class="cmpn">${h2.name}</div>
          <div class="cmpm">${h2.biography.publisher || ''} &nbsp;·&nbsp; ${total2} PWR</div>
        </div>
      </div>

      <!-- Stat breakdown: left bars | label | right bars -->
      <div class="msec">STATS BREAKDOWN</div>
      <div class="cmpsgrid">
        ${statLabels.map((lbl, i) => {
          const v1 = s1[i], v2 = s2[i];
          // Highlight the winner's stat in color
          const c1 = v1 > v2 ? 'var(--blue)'  : v1 < v2 ? 'var(--textd)' : 'var(--gold)';
          const c2 = v2 > v1 ? 'var(--red)'   : v2 < v1 ? 'var(--textd)' : 'var(--gold)';
          return `
            <div class="cmpbl">
              <span class="cmpnum" style="color:${c1}">${v1}</span>
              <div class="cmptrk" style="transform:scaleX(-1)">
                <div class="cmpfl" data-v="${v1}" style="background:${c1}"></div>
              </div>
            </div>
            <div class="cmpslbl">${lbl}</div>
            <div class="cmpbr">
              <div class="cmptrk">
                <div class="cmpfl" data-v="${v2}" style="background:${c2}"></div>
              </div>
              <span class="cmpnum" style="color:${c2}">${v2}</span>
            </div>`;
        }).join('')}
      </div>

      <!-- Radar chart -->
      <div style="position:relative;height:260px;margin-top:1.5rem">
        <canvas id="cradar"></canvas>
      </div>

    </div>`;

  // Animate compare bars and draw radar
  setTimeout(() => {
    document.querySelectorAll('.cmpfl').forEach(bar => {
      bar.style.width = bar.dataset.v + '%';
    });

    const radarCanvas = document.getElementById('cradar');
    if (radarCanvas) {
      new Chart(radarCanvas.getContext('2d'), {
        type: 'radar',
        data: {
          labels: statLabels,
          datasets: [
            {
              label: h1.name,
              data: s1,
              borderColor: 'rgba(0, 200, 255, .9)',
              backgroundColor: 'rgba(0, 200, 255, .12)',
              pointBackgroundColor: '#00c8ff',
              borderWidth: 1.5
            },
            {
              label: h2.name,
              data: s2,
              borderColor: 'rgba(230, 36, 41, .9)',
              backgroundColor: 'rgba(230, 36, 41, .12)',
              pointBackgroundColor: '#e62429',
              borderWidth: 1.5
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            r: {
              grid:        { color: 'rgba(0, 200, 255, .07)' },
              angleLines:  { color: 'rgba(0, 200, 255, .07)' },
              pointLabels: { color: '#c8dde8', font: { family: 'Orbitron', size: 10 } },
              ticks:       { display: false },
              min: 0, max: 100
            }
          },
          plugins: {
            legend: {
              labels: { color: '#c8dde8', font: { family: 'Orbitron', size: 10 }, padding: 12 }
            }
          }
        }
      });
    }
  }, 80);
}

// Close compare modal
function closeCM()    { document.getElementById('cmodal').classList.remove('open'); }
function closeCmov(e) { if (e.target === document.getElementById('cmodal')) closeCM(); }


// ===========================================
// 13. TIMELINE SECTION
// ===========================================

function initTimeline() {
  // 1. Filter heroes that have a year in their firstAppearance string
  const withYear = ALL
    .filter(h => /\d{4}/.test(h.biography.firstAppearance || ''))
    .map(h => {
      const match = h.biography.firstAppearance.match(/\d{4}/);
      return { ...h, year: parseInt(match[0]) };
    })
    .filter(h => h.year >= 1939 && h.year <= 2023); // Reasonable range

  // 2. Keep only the most powerful hero per year
  const byYear = {};
  withYear.forEach(h => {
    if (!byYear[h.year] || totalPower(h) > totalPower(byYear[h.year])) {
      byYear[h.year] = h;
    }
  });

  // 3. Sort by year and take the first 40 entries
  const sorted = Object.values(byYear)
    .sort((a, b) => a.year - b.year)
    .slice(0, 40);

  // 4. Build the timeline HTML
  document.getElementById('tl-body').innerHTML =
    '<div class="tl-wrap"><div class="tl-line"></div>' +
    sorted.map((h, i) => {
      // Alternate cards left and right
      const side = i % 2 === 0 ? 'l' : 'r';

      return `
        <div class="tl-item ${side}">
          <div class="tl-ctr">
            <div class="tl-dot"></div>
            <div class="tl-yr">${h.year}</div>
          </div>
          <div class="tl-sp"></div>
          <div class="tl-content" style="animation-delay:${i * .04}s; opacity:0"
            onclick="openHero(${h.id})">
            <div class="tl-img">
              <img src="${h.images.md}" alt="${h.name}" loading="lazy"
                onerror="this.style.display='none'">
            </div>
            <div class="tl-inf">
              <div class="tl-title">${h.name.toUpperCase()}</div>
              <div class="tl-pub">${h.biography.publisher || '—'}</div>
              <div class="tl-app">${h.biography.firstAppearance}</div>
            </div>
          </div>
        </div>`;
    }).join('') +
    '</div>';
}
