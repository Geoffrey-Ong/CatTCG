const API_ROOT_URL = "https://cat-api-maxingthesequel.vercel.app";
const API_URL = `${API_ROOT_URL}/api/v1`;
const API_HEALTH_URL = `${API_ROOT_URL}/health`; // the one route that needs no API key

// Each frontend authenticates with its own key (see index.py's API_KEYS).
// Both are still accepted on the /cats routes today since Home and Battle
// both need cat data, but keeping them separate means a future battle-only
// route can be locked down to just BATTLE_API_KEY without touching Home.
const COLLECTION_API_KEY = "catTCGcollection-api-key-6767";   // used by loadAllCards() (Home / Collection)
const BATTLE_API_KEY = "catTCGbattle-api-key-4242";    // used by loadAllCardsAsBattle() (Battle Owners)

const COLLECTION_FETCH_OPTIONS = { headers: { "x-api-key": COLLECTION_API_KEY } };
const BATTLE_FETCH_OPTIONS = { headers: { "x-api-key": BATTLE_API_KEY } };

const API_STATUS_POLL_INTERVAL_MS = 30000; // how often the LED re-checks the API
const API_STATUS_TIMEOUT_MS = 6000;        // a check slower than this counts as "offline"

let allCards = [];
let lastFetchedCatData = null;   // raw cat objects from the most recent successful fetch or file import
let usingCachedCatData = false;  // true when allCards came from an imported file, not a live fetch

// Pages that render cards (Home) set this to their own render function, so
// that loading a file from the "Load from file" button can refresh what's
// on screen without extra file-picker wiring on each page.
window.onCatDataUpdated = null;

// Used by the Home / Collection page.
async function loadAllCards() {
    const response = await fetch(`${API_URL}/cats`, COLLECTION_FETCH_OPTIONS);
    if (!response.ok) throw new Error("API request failed.");
    const data = await response.json();

    lastFetchedCatData = data.cats;
    usingCachedCatData = false;
    allCards = data.cats.map(generateCard);
    setCacheStatus(""); // live data — clear any "loaded from file" note
    return allCards;
}

// Not called yet — ready for when the Battle system starts fetching cat
// data of its own, authenticated with the Battle page's own key.
async function loadAllCardsAsBattle() {
    const response = await fetch(`${API_URL}/cats`, BATTLE_FETCH_OPTIONS);
    if (!response.ok) throw new Error("API request failed.");
    const data = await response.json();

    lastFetchedCatData = data.cats;
    usingCachedCatData = false;
    allCards = data.cats.map(generateCard);
    setCacheStatus("");
    return allCards;
}

function getUnlockedCards() {
    const collection = getCollection();
    return allCards.filter((card) => collection.unlockedIds.includes(card.id));
}

// =====================================================================
// DOWNLOADABLE JSON CACHE
// Export writes whatever cat data is currently in memory to a .json file
// via a normal browser download, triggered only by the button below (not
// automatic — a save on every page load got noisy fast). Import reads a
// previously exported file back in through a file picker, so the app
// keeps working with the API offline. Neither touches localStorage — the
// file itself is the only copy.
// =====================================================================

// Chrome and Firefox will create/use a subfolder inside your Downloads
// folder when the download filename contains a slash — Safari mostly
// ignores the folder part and just uses the base filename. There's no way
// for browser JS to write to an arbitrary absolute path on disk; this is
// the closest real equivalent.
function buildCacheFilename() {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    const stamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
    return `cache/cat-tcg-cache-${stamp}.json`;
}

function exportCatDataToFile() {
    if (!lastFetchedCatData) {
        alert("No cat data loaded yet — load the page while the API is online first, then export.");
        return;
    }

    const payload = {
        cats: lastFetchedCatData,
        exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = buildCacheFilename();
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

function importCatDataFromFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            try {
                const parsed = JSON.parse(reader.result);
                if (!Array.isArray(parsed.cats)) {
                    throw new Error("File doesn't look like a cat data export.");
                }
                lastFetchedCatData = parsed.cats;
                usingCachedCatData = true;
                allCards = parsed.cats.map(generateCard);
                resolve(allCards);
            } catch (error) {
                reject(error);
            }
        };
        reader.onerror = () => reject(reader.error);
        reader.readAsText(file);
    });
}

function setCacheStatus(text) {
    const status = document.getElementById("cacheStatus");
    if (!status) return;
    status.textContent = text;
    status.classList.toggle("hidden", !text);
}

// Export button, Import file picker, and a small status note — appended to
// the very end of the page (after the footer and any modals), so pages
// only need the <script> tag and don't need matching markup for it.
function buildCacheControls() {
    const container = document.createElement("div");
    container.id = "cacheControl";
    container.className = "max-w-[1100px] mx-auto px-6 pt-2 pb-10 flex flex-wrap items-center justify-center gap-2.5 text-xs";
    container.innerHTML = `
        <button id="exportCacheButton" type="button" class="px-2.5 py-1 rounded-full border border-white/10 text-inkSoft hover:text-beige hover:bg-white/5 transition">Export data (.json)</button>
        <label for="importCacheInput" class="px-2.5 py-1 rounded-full border border-white/10 text-inkSoft hover:text-beige hover:bg-white/5 transition cursor-pointer">Load from file</label>
        <input id="importCacheInput" type="file" accept="application/json,.json" class="hidden">
        <span id="cacheStatus" class="hidden text-inkSoft"></span>
    `;
    document.body.appendChild(container);

    container.querySelector("#exportCacheButton").addEventListener("click", exportCatDataToFile);

    container.querySelector("#importCacheInput").addEventListener("change", async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        try {
            await importCatDataFromFile(file);
            setCacheStatus(`Loaded from ${file.name}`);
            if (typeof window.onCatDataUpdated === "function") window.onCatDataUpdated();
        } catch (error) {
            console.error("Could not import cat data file:", error);
            alert("That file doesn't look like a valid cat data export.");
        }

        event.target.value = ""; // allow re-selecting the same file later
    });
}

// =====================================================================
// SHARED CARD TILE MARKUP
// Used by the Collection grid, Inventory grid, and Home marquee — one
// definition means a style tweak only has to happen in one place.
// =====================================================================

// widthClass defaults to filling its grid cell; pass a fixed width
// (e.g. "w-[150px]") for contexts like the marquee that aren't a grid.
function cardTileHTML(card, widthClass = "w-full") {
    const rarity = RARITY_STYLES[card.rarity];
    const roleLabel = ROLE_LABELS[card.role] || card.role;
    const roleIcon = ROLE_ICONS[card.role];

    return `
        <div class="card-tile ${widthClass} shrink-0 aspect-[5/7] rounded-2xl overflow-hidden border-2 ${rarity.border} ${rarity.glow} bg-beige text-ink flex flex-col cursor-pointer hover:-translate-y-1 transition" data-card-id="${card.id}">
            <div class="relative flex-1 min-h-0 bg-cover bg-center bg-voidDeep" style="background-image: url('${card.image}')">
                <span class="has-tooltip absolute top-1.5 right-1.5 flex items-center justify-center w-5 h-5 rounded-full bg-ink/80 text-beige" data-tooltip="${roleLabel}" tabindex="0" role="img" aria-label="Role: ${roleLabel}">
                    ${roleIcon ? iconHTML(roleIcon, "w-3 h-3") : `<span class="text-[9px] font-bold">${roleLabel.charAt(0)}</span>`}
                </span>
            </div>
            <div class="px-2.5 py-2 text-center">
                <p class="text-[13px] font-bold truncate">${card.name}</p>
                <span class="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full text-white ${rarity.badge}">${RARITY_LABELS[card.rarity]}</span>
            </div>
        </div>
    `;
}

function lockedTileHTML() {
    return `
        <div class="w-full aspect-[5/7] rounded-2xl border-2 border-white/10 bg-voidRaised flex flex-col items-center justify-center">
            <span class="text-3xl text-inkSoft">?</span>
            <span class="text-[11px] text-inkSoft mt-1.5 tracking-wide">Locked</span>
        </div>
    `;
}

// Attaches click-to-open-detail behavior to every rendered card tile
// inside a container, using each tile's data-card-id to look up the
// full card object (locked tiles have no data-card-id, so they're
// automatically skipped).
function wireCardTileClicks(container) {
    container.querySelectorAll(".card-tile[data-card-id]").forEach((tile) => {
        const card = allCards.find((c) => c.id === Number(tile.dataset.cardId));
        if (card) tile.addEventListener("click", () => openDetailModal(card));
    });
}

// Renders a recolorable icon (see .icon in custom.css). It inherits the
// surrounding text color, so tint it with a text-* class on a parent.
function iconHTML(src, sizeClass = "w-4 h-4") {
    return `<span class="icon ${sizeClass}" style="-webkit-mask-image: url('${src}'); mask-image: url('${src}');" aria-hidden="true"></span>`;
}

// One snack icon per treat a move costs; a free move shows "Free" text
// instead of a zero-icon row.
function treatCostHTML(treatCost) {
    if (!treatCost) {
        return `<span class="text-[11px] font-bold text-inkSoft">Free</span>`;
    }
    return `<span class="flex items-center gap-0.5">${iconHTML(TREAT_ICON, "w-3.5 h-3.5").repeat(treatCost)}</span>`;
}

// =====================================================================
// CARD DETAIL MODAL (shared by every page that shows unlocked cards)
// =====================================================================

function openDetailModal(card) {
    const rarity = RARITY_STYLES[card.rarity];
    const roleLabel = ROLE_LABELS[card.role] || card.role;
    const roleIcon = ROLE_ICONS[card.role];

    // One box per entry in card.stats, so adding a stat later only means
    // adding it in cards.js (and a label in STAT_LABELS).
    const statsHTML = Object.entries(card.stats).map(([key, value]) => `
        <div class="flex items-baseline justify-between rounded-lg bg-black/5 px-3 py-1.5">
            <span class="flex items-center gap-1.5 text-xs font-bold text-inkSoft">
                ${STAT_ICONS[key] ? iconHTML(STAT_ICONS[key]) : ""}${STAT_LABELS[key] || key}
            </span>
            <span class="font-display text-lg font-bold leading-none">${value}</span>
        </div>
    `).join("");

    const movesHTML = card.moves.map((move) => `
        <div class="has-tooltip relative flex items-center justify-between rounded-lg bg-black/5 px-3 py-2 text-sm" data-tooltip="${move.description}" tabindex="0">
            <span class="font-semibold">${move.name}</span>
            <span class="flex items-center gap-2.5">
                <span class="flex items-center gap-1 font-display text-base font-bold text-orange">${iconHTML(ROLE_ICONS[move.type] || MOVE_POWER_ICON, "w-3.5 h-3.5")}${move.power}</span>
                ${treatCostHTML(move.treatCost)}
            </span>
        </div>
    `).join("");

    // Layout follows a physical trading card: rarity + role tabs sitting on
    // the top edge, name, art window, stats, moves, then flavor text.
    document.getElementById("detailModalContent").innerHTML = `
        <div class="relative flex flex-col gap-3 aspect-[5/7] rounded-[18px] border-4 ${rarity.border} ${rarity.glow} bg-beige text-ink px-4 pt-6 pb-4">
            <span class="absolute -top-3.5 left-4 flex items-center h-7 px-3.5 rounded-full text-xs font-bold text-white ${rarity.badge}">${RARITY_LABELS[card.rarity]}</span>
            <span class="has-tooltip absolute -top-3.5 right-4 flex items-center justify-center w-7 h-7 rounded-full bg-ink text-beige cursor-default" data-tooltip="${roleLabel}" tabindex="0" role="img" aria-label="Role: ${roleLabel}">
                ${roleIcon ? iconHTML(roleIcon) : `<span class="text-xs font-bold">${roleLabel.charAt(0)}</span>`}
            </span>

            <h2 class="font-display text-xl font-bold leading-tight text-center">
                ${card.name} <span class="text-sm font-semibold text-inkSoft">(${card.breed})</span>
            </h2>

            <div class="relative flex-1 min-h-[140px] rounded-lg overflow-hidden border-2 border-ink/20 bg-voidRaised">
                <img src="${card.image}" alt="${card.name}" class="absolute inset-0 w-full h-full object-cover object-top">
            </div>

            <div class="grid grid-cols-2 gap-2">${statsHTML}</div>

            <div class="flex flex-col gap-1.5">${movesHTML}</div>

            <p class="pt-3 border-t border-black/10 text-xs leading-relaxed text-inkSoft">${card.description}</p>
        </div>
    `;

    const modal = document.getElementById("cardDetailModal");
    modal.classList.remove("closing");
    modal.classList.add("active");
}

function closeDetailModal() {
    const modal = document.getElementById("cardDetailModal");
    if (!modal) return; // page has no detail modal (e.g. Battle)
    modal.classList.remove("active");
    modal.classList.add("closing");

    setTimeout(() => {
        modal.classList.remove("closing");
    }, 350);
}

function handleDetailOverlayClick(event) {
    if (event.target.id === "cardDetailModal") {
        closeDetailModal();
    }
}

document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
        closeDetailModal();
    }
});

// =====================================================================
// API STATUS LED
// A small dot in every page's header: green = /health responded OK,
// red = it failed or timed out, pulsing gray = check in progress.
// Uses /health (no API key, no cats fetched) so polling stays cheap.
// =====================================================================

const API_STATUS_LABELS = {
    checking: "Checking…",
    online: "API online",
    offline: "API offline",
};

function setApiStatus(state) {
    const led = document.getElementById("apiStatusLed");
    const label = document.getElementById("apiStatusLabel");
    const wrapper = document.getElementById("apiStatus");
    if (!led || !label || !wrapper) return; // page has no LED markup

    led.className = `status-led ${state}`;
    label.textContent = API_STATUS_LABELS[state];
    wrapper.title = API_STATUS_LABELS[state];
}

async function checkApiStatus() {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_STATUS_TIMEOUT_MS);

    try {
        const response = await fetch(API_HEALTH_URL, { signal: controller.signal, cache: "no-store" });
        setApiStatus(response.ok ? "online" : "offline");
    } catch (error) {
        setApiStatus("offline");
    } finally {
        clearTimeout(timeoutId);
    }
}

function startApiStatusMonitor() {
    if (!document.getElementById("apiStatusLed")) return;

    checkApiStatus();
    setInterval(() => {
        if (!document.hidden) checkApiStatus(); // don't poll from background tabs
    }, API_STATUS_POLL_INTERVAL_MS);

    // Coming back to the tab: refresh right away instead of waiting for the next tick
    document.addEventListener("visibilitychange", () => {
        if (!document.hidden) checkApiStatus();
    });
}

startApiStatusMonitor();
buildCacheControls();