const API_URL = "https://cat-api-maxingthesequel.vercel.app/api/v1";
const API_KEY = "student-api-key-6767";

const FETCH_OPTIONS = {
    headers: { "x-api-key": API_KEY }
};

let allCards = [];

async function loadAllCards() {
    const response = await fetch(`${API_URL}/cats`, FETCH_OPTIONS);
    if (!response.ok) throw new Error("API request failed.");
    const data = await response.json();

    allCards = data.cats.map(generateCard);
    return allCards;
}

function getUnlockedCards() {
    const collection = getCollection();
    return allCards.filter((card) => collection.unlockedIds.includes(card.id));
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
    return `
        <div class="card-tile ${widthClass} shrink-0 aspect-[5/7] rounded-2xl overflow-hidden border-2 ${rarity.border} ${rarity.glow} bg-beige text-ink flex flex-col cursor-pointer hover:-translate-y-1 transition" data-card-id="${card.id}">
            <div class="flex-1 min-h-0 bg-cover bg-center bg-voidDeep" style="background-image: url('${card.image}')"></div>
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

// =====================================================================
// CARD DETAIL MODAL (shared by every page that shows unlocked cards)
// =====================================================================

function openDetailModal(card) {
    const rarity = RARITY_STYLES[card.rarity];

    document.getElementById("detailModalContent").innerHTML = `
        <div class="flex gap-6 flex-col sm:flex-row">
            <div class="w-full sm:w-[180px] h-[200px] sm:h-[250px] rounded-xl overflow-hidden bg-voidRaised shrink-0">
                <img src="${card.image}" alt="${card.name}" class="w-full h-full object-cover">
            </div>
            <div class="flex-1 min-w-0">
                <h2 class="font-display text-2xl font-bold mb-1">${card.name}</h2>
                <p class="text-inkSoft font-semibold mb-3">${card.breed}</p>
                <span class="inline-block text-xs font-bold px-2.5 py-1 rounded-full text-white ${rarity.badge}">${RARITY_LABELS[card.rarity]}</span>

                <div class="grid grid-cols-2 gap-x-4 gap-y-2 mt-4 mb-4">
                    <div class="flex justify-between text-sm border-b border-black/10 pb-1"><span class="text-inkSoft font-semibold">HP</span><span>${card.stats.hp}</span></div>
                    <div class="flex justify-between text-sm border-b border-black/10 pb-1"><span class="text-inkSoft font-semibold">Attack</span><span>${card.stats.attack}</span></div>
                    <div class="flex justify-between text-sm border-b border-black/10 pb-1"><span class="text-inkSoft font-semibold">Defense</span><span>${card.stats.defense}</span></div>
                    <div class="flex justify-between text-sm border-b border-black/10 pb-1"><span class="text-inkSoft font-semibold">Speed</span><span>${card.stats.speed}</span></div>
                </div>

                <p class="text-inkSoft font-bold text-xs mb-2">Moves</p>
                ${card.moves.map((move) => `
                    <div class="flex justify-between px-2.5 py-2 bg-black/5 rounded-lg mb-1.5 text-sm">
                        <span>${move.name}</span>
                        <span class="font-bold text-orange">${move.power}</span>
                    </div>
                `).join("")}
            </div>
        </div>
        <p class="mt-4 pt-4 border-t border-black/10 leading-relaxed text-inkSoft text-sm">${card.description}</p>
    `;

    const modal = document.getElementById("cardDetailModal");
    modal.classList.remove("closing");
    modal.classList.add("active");
}

function closeDetailModal() {
    const modal = document.getElementById("cardDetailModal");
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
