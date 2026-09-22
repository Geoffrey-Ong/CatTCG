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

function renderCardGrid() {
    const grid = document.getElementById("cardGrid");
    const collection = getCollection();

    grid.innerHTML = allCards
        .map((card) => (collection.unlockedIds.includes(card.id) ? cardTileHTML(card) : lockedTileHTML()))
        .join("");

    wireCardTileClicks(grid);
}

init();
