let pendingPackCard = null;

// =====================================================================
// INIT
// =====================================================================

async function init() {
    try {
        await loadAllCards();
        renderMarquee();
    } catch (error) {
        console.error(error);
        document.getElementById("marqueeTrack").innerHTML =
            `<p class="text-inkSoft px-6">Unable to connect to the API.</p>`;
    }
}

// =====================================================================
// MARQUEE (only shows cats you actually own)
// =====================================================================

function renderMarquee() {
    const track = document.getElementById("marqueeTrack");
    const unlockedCards = getUnlockedCards();

    if (unlockedCards.length === 0) {
        track.innerHTML = `<p class="text-inkSoft px-6 whitespace-nowrap">No cats yet — open a pack to get started!</p>`;
        return;
    }

    // Duplicate the list once so the CSS animation (translateX -50%) loops seamlessly
    const tilesHTML = unlockedCards.map((card) => cardTileHTML(card, "w-[150px]")).join("");
    track.innerHTML = tilesHTML + tilesHTML;
    wireCardTileClicks(track);
}

// =====================================================================
// PACK OPENING
// =====================================================================

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
    if (flipper.classList.contains("flipped")) return; // already revealed

    flipper.classList.add("flipped");
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
    renderMarquee(); // picks up the newly unlocked card, if one was opened
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
