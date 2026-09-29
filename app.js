let pendingPackCard = null;

async function init() {
    try {
        await loadAllCards();
        renderAll();
    } catch (error) {
        console.error(error);
        document.getElementById("marqueeTrack").innerHTML =
            `<p class="text-inkSoft px-6">Unable to connect to the API.</p>`;
        document.getElementById("cardGrid").innerHTML =
            "Unable to connect to the API.";
    }
}

function renderAll() {
    renderMarquee();
    renderProgress();
    renderRarityBreakdown();
    renderCardGrid();
}

function renderMarquee() {
    const track = document.getElementById("marqueeTrack");
    const unlockedCards = getUnlockedCards();

    if (unlockedCards.length === 0) {
        track.innerHTML = `<p class="text-inkSoft px-6 whitespace-nowrap">No cats yet — open a pack to get started!</p>`;
        return;
    }

    // Duplicated once so the CSS animation (translateX -50%) loops seamlessly
    const tilesHTML = unlockedCards.map((card) => cardTileHTML(card, "w-[150px]")).join("");
    track.innerHTML = tilesHTML + tilesHTML;
    wireCardTileClicks(track);
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

document.getElementById("openPackButton").addEventListener("click", () => {
    if (allCards.length === 0) return;

    pendingPackCard = drawPackCard(allCards);
    const rarity = RARITY_STYLES[pendingPackCard.rarity];

    const front = document.getElementById("revealCardFront");
    front.className = `reveal-face reveal-face-front bg-beige text-ink border-4 ${rarity.border} ${rarity.glow}`;
    front.innerHTML = `
        <div class="flex-1 min-h-0 bg-cover bg-center" style="background-image: url('${pendingPackCard.image}')"></div>
        <div class="px-3 py-2.5 text-center">
            <p class="text-[15px] font-bold">${pendingPackCard.name}</p>
            <span class="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full text-white ${rarity.badge}">${RARITY_LABELS[pendingPackCard.rarity]}</span>
        </div>
    `;

    document.getElementById("revealCardFlipper").classList.remove("flipped");
    document.getElementById("packModalHint").textContent = "Tap the card to open it";

    const modal = document.getElementById("packModal");
    modal.classList.remove("closing");
    modal.classList.add("active");
});

function flipRevealCard() {
    if (!pendingPackCard) return;

    const flipper = document.getElementById("revealCardFlipper");
    if (flipper.classList.contains("flipped")) return;

    flipper.classList.add("flipped");
    playRarityStinger(pendingPackCard.rarity); // on reveal, not open, so it doesn't spoil the rarity
    unlockCard(pendingPackCard.id);
    document.getElementById("packModalHint").textContent = "Added to your collection!";
}

function closePackModal() {
    const modal = document.getElementById("packModal");
    modal.classList.remove("active");
    modal.classList.add("closing");

    setTimeout(() => {
        modal.classList.remove("closing");
    }, 350);

    pendingPackCard = null;
    renderAll();
}

function handlePackOverlayClick(event) {
    if (event.target.id === "packModal") {
        closePackModal();
    }
}

document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
        closePackModal();
    }
});

init();