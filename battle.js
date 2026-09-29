async function init() {
    try {
        await loadAllCardsAsBattle();
        renderAll();
    } catch (error) {
        console.error(error);
        document.getElementById("bossList").innerHTML = "Unable to connect to the API.";
    }
}

function renderAll() {
    renderBosses();
    renderTeamSlots();
}

function renderBosses() {
    document.getElementById("bossList").innerHTML = OWNERS.map(bossPillHTML).join("");

    document.querySelectorAll("[data-boss-play]").forEach((button) => {
        button.addEventListener("click", () => handleBossPlayClick(Number(button.dataset.bossPlay)));
    });
}

function bossPillHTML(owner) {
    const style = DIFFICULTY_STYLES[owner.difficulty] || DIFFICULTY_STYLES.easy;
    const label = DIFFICULTY_LABELS[owner.difficulty] || owner.difficulty;

    return `
        <div class="relative flex items-stretch gap-4 rounded-[28px] bg-voidRaised border border-white/10 p-3 pr-5 ${owner.locked ? "opacity-40" : ""}">
            <div class="w-20 h-20 rounded-2xl bg-voidDeep flex items-center justify-center overflow-hidden shrink-0">
                ${owner.image
                    ? `<img src="${owner.image}" alt="${owner.name}" class="w-full h-full object-cover object-top">`
                    : `<span class="text-[10px] font-semibold text-inkSoft">Imag</span>`}
            </div>
            <div class="flex-1 min-w-0 flex flex-col justify-between py-1">
                <p class="font-display font-bold text-lg truncate">${owner.name}</p>
                <span class="self-end inline-block text-[11px] font-bold px-2.5 py-0.5 rounded-full text-white ${style.badge}">${label}</span>
            </div>
            ${owner.locked
                ? `<span class="absolute top-3 right-3 w-9 h-9 rounded-full bg-black/30 flex items-center justify-center text-sm" role="img" aria-label="Locked">🔒</span>`
                : `<button type="button" class="absolute top-3 right-3 w-9 h-9 rounded-full bg-orange text-voidDeep flex items-center justify-center hover:bg-orangeLight transition" data-boss-play="${owner.id}" aria-label="Battle ${owner.name}">${iconHTML("icons/play.png", "w-4 h-4")}</button>`}
        </div>
    `;
}

function handleBossPlayClick(ownerId) {
    const owner = OWNERS.find((o) => o.id === ownerId);
    const team = getBattleTeam();

    if (team.length < BATTLE_TEAM_SIZE) {
        alert(`Pick ${BATTLE_TEAM_SIZE} cats with "Change" before challenging ${owner.name}.`);
        return;
    }

    startBattle(owner.id);
}

function renderTeamSlots() {
    const team = getBattleTeam();

    document.getElementById("teamSlots").innerHTML = Array.from({ length: BATTLE_TEAM_SIZE })
        .map((_, index) => {
            const card = allCards.find((c) => c.id === team[index]);
            return card ? filledSlotHTML(card, index) : emptySlotHTML(index);
        })
        .join("");

    wireTeamSlotClicks();
}

function wireTeamSlotClicks() {
    document.querySelectorAll(".team-slot-filled[data-card-id]").forEach((slot) => {
        const card = allCards.find((c) => c.id === Number(slot.dataset.cardId));
        if (card) slot.addEventListener("click", () => openDetailModal(card));
    });
}

function filledSlotHTML(card, index) {
    const rarity = RARITY_STYLES[card.rarity];
    const roleLabel = ROLE_LABELS[card.role] || card.role;
    const roleIcon = ROLE_ICONS[card.role];

    return `
        <div class="team-slot-filled relative rounded-2xl overflow-hidden border-2 ${rarity.border} ${rarity.glow} bg-beige text-ink flex flex-col cursor-pointer hover:-translate-y-1 transition" data-card-id="${card.id}">
            <span class="absolute top-1.5 left-1.5 z-10 flex items-center justify-center w-5 h-5 rounded-full bg-ink/80 text-beige text-[10px] font-bold" title="Deploys ${ordinal(index + 1)}">${index + 1}</span>
            <span class="has-tooltip absolute top-1.5 right-1.5 z-10 flex items-center justify-center w-5 h-5 rounded-full bg-ink/80 text-beige" data-tooltip="${roleLabel}" tabindex="0" role="img" aria-label="Role: ${roleLabel}">
                ${roleIcon ? iconHTML(roleIcon, "w-3 h-3") : `<span class="text-[9px] font-bold">${roleLabel.charAt(0)}</span>`}
            </span>
            <div class="relative h-28 bg-cover bg-top bg-voidDeep" style="background-image: url('${card.image}')"></div>
            <div class="px-2.5 py-2 text-center">
                <p class="text-[13px] font-bold truncate">${card.name}</p>
            </div>
        </div>
    `;
}

function emptySlotHTML(index) {
    return `
        <div class="rounded-2xl border-2 border-dashed border-white/15 bg-voidRaised flex flex-col items-center justify-center h-[164px] text-inkSoft">
            <span class="text-[10px] font-bold uppercase tracking-wide mb-1">Slot ${index + 1}</span>
            <span class="text-xs">Empty</span>
        </div>
    `;
}

function ordinal(n) {
    return n === 1 ? "1st" : n === 2 ? "2nd" : "3rd";
}

function openTeamPicker() {
    renderTeamPickerGrid();
    const modal = document.getElementById("teamPickerModal");
    modal.classList.remove("closing");
    modal.classList.add("active");
}

function closeTeamPicker() {
    const modal = document.getElementById("teamPickerModal");
    modal.classList.remove("active");
    modal.classList.add("closing");

    setTimeout(() => {
        modal.classList.remove("closing");
    }, 350);

    renderTeamSlots();
}

function handleTeamPickerOverlayClick(event) {
    if (event.target.id === "teamPickerModal") {
        closeTeamPicker();
    }
}

function renderTeamPickerGrid() {
    const unlocked = getUnlockedCards();
    const team = getBattleTeam();
    const grid = document.getElementById("teamPickerGrid");

    if (unlocked.length === 0) {
        grid.innerHTML = `<p class="col-span-full text-sm text-inkSoft text-center py-6">No cats unlocked yet — open some packs on the Home page first.</p>`;
        return;
    }

    grid.innerHTML = unlocked.map((card) => teamPickerTileHTML(card, team.indexOf(card.id))).join("");

    grid.querySelectorAll(".team-picker-tile").forEach((tile) => {
        tile.addEventListener("click", () => toggleTeamCard(Number(tile.dataset.cardId)));
    });
}

function teamPickerTileHTML(card, selectionIndex) {
    const rarity = RARITY_STYLES[card.rarity];
    const selected = selectionIndex !== -1;
    const roleLabel = ROLE_LABELS[card.role] || card.role;
    const roleIcon = ROLE_ICONS[card.role];

    return `
        <div class="team-picker-tile relative aspect-[5/7] rounded-xl overflow-hidden border-2 ${selected ? "border-orange" : rarity.border} ${selected ? "" : rarity.glow} bg-beige text-ink flex flex-col cursor-pointer transition" data-card-id="${card.id}">
            <div class="relative flex-1 min-h-0 bg-cover bg-top bg-voidDeep" style="background-image: url('${card.image}')">
                <span class="has-tooltip absolute top-1.5 right-1.5 flex items-center justify-center w-5 h-5 rounded-full bg-ink/80 text-beige" data-tooltip="${roleLabel}" tabindex="0" role="img" aria-label="Role: ${roleLabel}">
                    ${roleIcon ? iconHTML(roleIcon, "w-3 h-3") : `<span class="text-[9px] font-bold">${roleLabel.charAt(0)}</span>`}
                </span>
                ${selected ? `<span class="absolute top-1.5 left-1.5 flex items-center justify-center w-5 h-5 rounded-full bg-orange text-voidDeep text-[11px] font-bold">${selectionIndex + 1}</span>` : ""}
            </div>
            <div class="px-2 py-1.5 text-center">
                <p class="text-[11px] font-bold truncate">${card.name}</p>
            </div>
        </div>
    `;
}

function toggleTeamCard(cardId) {
    const team = getBattleTeam();
    const idx = team.indexOf(cardId);

    if (idx !== -1) {
        team.splice(idx, 1);
    } else {
        if (team.length >= BATTLE_TEAM_SIZE) return;
        team.push(cardId);
    }

    saveBattleTeam(team);
    renderTeamPickerGrid();
    renderTeamSlots();
}

document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
        closeTeamPicker();
    }
});

init();