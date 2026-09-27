async function init() {
    try {
        await loadAllCards();
        render();
    } catch (error) {
        console.error(error);
        document.getElementById("cardGrid").innerHTML = "Unable to connect to the API.";
    }
}

function render() {
    renderProgress();
    renderRarityBreakdown();
    renderCardGrid();
}

function renderProgress() {
    const collection = getCollection();
    const unlockedCount = collection.unlockedIds.length;
    const totalCount = allCards.length;

    document.getElementById("unlockedCount").textContent = unlockedCount;
    document.getElementById("totalCount").textContent = totalCount;

    const percent = totalCount ? (unlockedCount / totalCount) * 100 : 0;
    document.getElementById("progressFill").style.width = `${percent}%`;
}

// Per-tier "owned / total" counts (e.g. Rare 4/7). Totals come from the
// full generated card list, so they update automatically if rarity odds
// in cards.js change or new cats are added to the API.
function renderRarityBreakdown() {
    const unlockedIds = getCollection().unlockedIds;

    document.getElementById("rarityBreakdown").innerHTML = RARITY_ORDER.map((tier) => {
        const cardsInTier = allCards.filter((card) => card.rarity === tier);
        const total = cardsInTier.length;
        const owned = cardsInTier.filter((card) => unlockedIds.includes(card.id)).length;
        const style = RARITY_STYLES[tier];
        const complete = total > 0 && owned === total;

        return `
            <div class="min-w-[96px] px-3.5 py-2.5 rounded-xl bg-voidRaised border-t-4 ${style.border} ${complete ? style.glow : ""} ${total === 0 ? "opacity-40" : ""}">
                <p class="text-xs font-semibold text-inkSoft">${RARITY_LABELS[tier]}</p>
                <p class="font-display text-xl font-bold">${owned}<span class="text-inkSoft"> / ${total}</span></p>
            </div>
        `;
    }).join("");
}

function renderCardGrid() {
    const grid = document.getElementById("cardGrid");
    const collection = getCollection();

    grid.innerHTML = allCards
        .map((card) => (collection.unlockedIds.includes(card.id) ? cardTileHTML(card) : lockedTileHTML()))
        .join("");

    wireCardTileClicks(grid);
}

init();