const API_ROOT_URL = "https://cat-api-maxingthesequel.vercel.app";
const API_URL = `${API_ROOT_URL}/api/v1`;
const API_HEALTH_URL = `${API_ROOT_URL}/health`;

// Separate keys per frontend so a future battle-only route could be locked
// down to just BATTLE_API_KEY without touching Home.
const COLLECTION_API_KEY = "catTCGcollection-api-key-6767";
const BATTLE_API_KEY = "catTCGbattle-api-key-4242";

const COLLECTION_FETCH_OPTIONS = { headers: { "x-api-key": COLLECTION_API_KEY } };
const BATTLE_FETCH_OPTIONS = { headers: { "x-api-key": BATTLE_API_KEY } };

const API_STATUS_POLL_INTERVAL_MS = 30000;
const API_STATUS_TIMEOUT_MS = 6000;

let allCards = [];
let lastFetchedCatData = null;
let usingCachedCatData = false;

const CACHE_FILE_URL = "cache/cats.json";

// Try the live API first; if it fails, read the bundled JSON file instead.
async function fetchCatsWithFallback(fetchOptions) {
    try {
        const response = await fetch(`${API_URL}/cats`, fetchOptions);
        if (!response.ok) throw new Error("API request failed.");
        const data = await response.json();
        usingCachedCatData = false;
        return data.cats;
    } catch (apiError) {
        console.warn("API unavailable, using cache file:", apiError);
        const response = await fetch(CACHE_FILE_URL);
        if (!response.ok) throw apiError;
        const data = await response.json();
        usingCachedCatData = true;
        return data.cats;
    }
}

async function loadAllCards() {
    const cats = await fetchCatsWithFallback(COLLECTION_FETCH_OPTIONS);
    lastFetchedCatData = cats;
    allCards = cats.map(generateCard);
    return allCards;
}

async function loadAllCardsAsBattle() {
    const cats = await fetchCatsWithFallback(BATTLE_FETCH_OPTIONS);
    lastFetchedCatData = cats;
    allCards = cats.map(generateCard);
    return allCards;
}

function getUnlockedCards() {
    const collection = getCollection();
    return allCards.filter((card) => collection.unlockedIds.includes(card.id));
}

// widthClass defaults to filling its grid cell; pass a fixed width (e.g.
// "w-[150px]") for non-grid contexts like the marquee.
function cardTileHTML(card, widthClass = "w-full") {
    const rarity = RARITY_STYLES[card.rarity];
    const roleLabel = ROLE_LABELS[card.role] || card.role;
    const roleIcon = ROLE_ICONS[card.role];

    return `
        <div class="card-tile hover-lift ${widthClass} shrink-0 aspect-[5/7] rounded-2xl overflow-hidden border-2 ${rarity.border} ${rarity.glow} bg-beige text-ink flex flex-col cursor-pointer shadow-md" data-card-id="${card.id}">
            <div class="relative flex-1 min-h-0 bg-cover bg-center bg-voidDeep" style="background-image: url('${card.image}')">
                <span class="has-tooltip absolute top-1.5 right-1.5 flex items-center justify-center w-5 h-5 rounded-full bg-ink/80 text-beige" data-tooltip="${roleLabel}" tabindex="0" role="img" aria-label="Role: ${roleLabel}">
                    ${roleIcon ? iconHTML(roleIcon, "w-3 h-3") : `<span class="text-[9px] font-bold">${roleLabel.charAt(0)}</span>`}
                </span>
            </div>
            <div class="px-2.5 py-2 text-center">
                <p class="text-[13px] font-bold truncate">${card.name}</p>
                <span class="badge-ribbon inline-block text-[10px] font-bold py-0.5 text-white ${rarity.badge}">${RARITY_LABELS[card.rarity]}</span>
            </div>
        </div>
    `;
}

function lockedTileHTML() {
    return `
        <div class="w-full aspect-[5/7] rounded-2xl border-2 border-white/10 bg-voidRaised flex flex-col items-center justify-center shadow-sm">
            <span class="text-3xl text-inkSoft">?</span>
            <span class="text-[11px] text-inkSoft mt-1.5 tracking-wide">Locked</span>
        </div>
    `;
}

function wireCardTileClicks(container) {
    container.querySelectorAll(".card-tile[data-card-id]").forEach((tile) => {
        const card = allCards.find((c) => c.id === Number(tile.dataset.cardId));
        if (card) tile.addEventListener("click", () => openDetailModal(card));
    });
}

// Recolorable icon (see .icon in custom.css) — inherits the surrounding
// text color, so tint it with a text-* class on a parent.
function iconHTML(src, sizeClass = "w-4 h-4") {
    return `<span class="icon ${sizeClass}" style="-webkit-mask-image: url('${src}'); mask-image: url('${src}');" aria-hidden="true"></span>`;
}

function treatCostHTML(treatCost) {
    if (!treatCost) {
        return `<span class="text-[11px] font-bold text-inkSoft">Free</span>`;
    }
    return `<span class="flex items-center gap-0.5">${iconHTML(TREAT_ICON, "w-3.5 h-3.5").repeat(treatCost)}</span>`;
}

function openDetailModal(card) {
    const rarity = RARITY_STYLES[card.rarity];
    const roleLabel = ROLE_LABELS[card.role] || card.role;
    const roleIcon = ROLE_ICONS[card.role];

    const statsHTML = Object.entries(card.stats).map(([key, value]) => `
        <div class="flex items-baseline justify-between rounded-lg bg-black/5 px-3 py-1.5">
            <span class="flex items-center gap-1.5 text-xs font-bold text-inkSoft">
                ${STAT_ICONS[key] ? iconHTML(STAT_ICONS[key]) : ""}${STAT_LABELS[key] || key}
            </span>
            <span class="font-display text-lg font-bold leading-none">${value}</span>
        </div>
    `).join("");

    const movesHTML = card.moves.map((move) => `
        <div class="has-tooltip relative flex items-center justify-between rounded-lg bg-black/5 hover:bg-black/10 transition-colors px-3 py-2 text-sm" data-tooltip="${move.description}" tabindex="0">
            <span class="font-semibold">${move.name}</span>
            <span class="flex items-center gap-2.5">
                <span class="flex items-center gap-1 font-display text-base font-bold text-orange">${iconHTML(ROLE_ICONS[move.type] || MOVE_POWER_ICON, "w-3.5 h-3.5")}${move.power}</span>
                ${treatCostHTML(move.treatCost)}
            </span>
        </div>
    `).join("");

    document.getElementById("detailModalContent").innerHTML = `
        <div class="relative flex flex-col gap-3 aspect-[5/7] rounded-[18px] border-4 ${rarity.border} ${rarity.glow} bg-beige text-ink px-4 pt-6 pb-4 shadow-2xl shadow-black/50">
            <span class="badge-ribbon absolute -top-3.5 left-4 flex items-center h-7 px-3.5 text-xs font-bold text-white shadow-md ${rarity.badge}">${RARITY_LABELS[card.rarity]}</span>
            <span class="has-tooltip absolute -top-3.5 right-4 flex items-center justify-center w-7 h-7 rounded-full bg-ink text-beige cursor-default shadow-md" data-tooltip="${roleLabel}" tabindex="0" role="img" aria-label="Role: ${roleLabel}">
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
    if (!modal) return;
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

const API_STATUS_LABELS = {
    checking: "Checking…",
    online: "API online",
    offline: "API offline",
};

function setApiStatus(state) {
    const led = document.getElementById("apiStatusLed");
    const label = document.getElementById("apiStatusLabel");
    const wrapper = document.getElementById("apiStatus");
    if (!led || !label || !wrapper) return;

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
        if (!document.hidden) checkApiStatus();
    }, API_STATUS_POLL_INTERVAL_MS);

    document.addEventListener("visibilitychange", () => {
        if (!document.hidden) checkApiStatus();
    });
}

startApiStatusMonitor();