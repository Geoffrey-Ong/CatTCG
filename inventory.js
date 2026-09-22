async function init() {
    try {
        await loadAllCards();
        renderInventory();
    } catch (error) {
        console.error(error);
        document.getElementById("cardGrid").innerHTML = "Unable to connect to the API.";
    }
}

function renderInventory() {
    const unlockedCards = getUnlockedCards();
    document.getElementById("unlockedCount").textContent = unlockedCards.length;

    const grid = document.getElementById("cardGrid");

    if (unlockedCards.length === 0) {
        grid.innerHTML = `
            <p class="col-span-full text-center text-inkSoft">
                No cats yet — open a pack from the Home page to get started.
            </p>
        `;
        return;
    }

    grid.innerHTML = unlockedCards.map((card) => cardTileHTML(card)).join("");
    wireCardTileClicks(grid);
}

init();
