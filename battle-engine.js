const BATTLE_CONFIG = {
    startingTreats: 5,
    treatCap: 5,
    benchTreatRegen: 2,
    defenseMitigationConstant: 100, // mitigation% = defense / (defense + this)
    eventDisplayMs: 3000,
    aftersmell: {
        procChance: 0.30,
        damagePerTick: 10,
        duration: 3, // ticks (rounds), refreshes rather than stacking
    },
    gayBeam: {
        instantWinChance: 0.20,
        instantLossChance: 0.10,
    },
};

// Mechanical behavior for moves whose effect isn't already fully described
// by their `type` + `power` from cards.js. A plain "damage"/"heal" move
// needs nothing listed here.
// Catnip Distribution currently has nothing to cleanse — no Owner move
// inflicts a debuff on your cats yet. Wired up for when that changes.
const MOVE_EFFECTS = {
    "Salmonella Breath": { inflictsAftersmell: true },
    "Catnip Distribution": { cleansesAftersmell: true },
    "Cute Eyes": { distractTurns: 2 },
    "Political Stance": { distractTurns: 1 },
    "Gay Beam": { isGayBeam: true },
};

let battleState = null;

function startBattle(ownerId) {
    const owner = OWNERS.find((o) => o.id === ownerId);
    const teamCards = getBattleTeam().map((id) => allCards.find((c) => c.id === id));

    battleState = {
        owner: {
            data: owner,
            hp: owner.hp,
            maxHp: owner.hp,
            distractedTurns: 0,
            aftersmell: null, // { turnsLeft } | null
        },
        team: teamCards.map((card) => ({
            card,
            hp: card.stats.hp,
            maxHp: card.stats.hp,
            treats: BATTLE_CONFIG.startingTreats,
            fainted: false,
        })),
        activeIndex: 0,
        mode: "move", // "move" | "swap" | "healTarget" | "over"
        forcedSwapReason: null, // null | "faint"
        pendingMove: null, // { move, moveIndex } while awaiting a heal target
        eventQueue: [],
        inputLocked: false,
        result: null, // null | "win" | "loss"
    };

    document.getElementById("siteHeader").classList.add("hidden");
    document.getElementById("battleLobby").classList.add("hidden");
    document.getElementById("battleScreen").classList.remove("hidden");
    renderBattleScreen();
    triggerAnimation(document.querySelector('.party-card[data-fighter-index="0"]'), "swap-in", 350);
    startBattleMusic();
}

function endBattle() {
    battleState = null;
    document.getElementById("battleScreen").classList.add("hidden");
    document.getElementById("battleLobby").classList.remove("hidden");
    document.getElementById("siteHeader").classList.remove("hidden");
    stopBattleMusic();
    renderAll();
}

function handleExitBattle() {
    playBattleSfx("click");
    const toast = document.getElementById("battleEventToast");
    toast.classList.add("hidden");
    toast.classList.remove("flex");
    endBattle();
}

// mitigation% = defense / (defense + K), so defense always helps but never
// reaches 100% reduction. Always deals at least 1 damage.
function mitigate(power, defense) {
    const mitigationPercent = defense / (defense + BATTLE_CONFIG.defenseMitigationConstant);
    return Math.max(1, Math.round(power * (1 - mitigationPercent)));
}

function activeFighter() {
    return battleState.team[battleState.activeIndex];
}

function livingBenchIndexes() {
    return battleState.team
        .map((fighter, index) => index)
        .filter((index) => index !== battleState.activeIndex && !battleState.team[index].fainted);
}

function queueEvent(message, effect) {
    battleState.eventQueue.push({ message, effect: effect || null });
}

// Runs a batch of already-applied state changes through the event queue,
// then ends the battle or continues into nextStep once every message has
// had its time on screen.
function afterAction(nextStep) {
    battleState.inputLocked = true;
    renderBattleScreen();

    flushEventQueue(() => {
        battleState.inputLocked = false;
        if (battleState.result) {
            battleState.mode = "over";
            battleMusic.pause();
            if (battleState.result === "win") playBattleSfx("victory");
            renderBattleScreen();
            return;
        }
        nextStep();
    });
}

function flushEventQueue(onComplete) {
    if (!battleState.eventQueue.length) {
        onComplete();
        return;
    }
    showNextQueuedEvent(onComplete);
}

function showNextQueuedEvent(onComplete) {
    const { message, effect } = battleState.eventQueue.shift();
    const toast = document.getElementById("battleEventToast");
    document.getElementById("battleEventText").textContent = message;
    toast.classList.remove("hidden");
    toast.classList.add("flex");
    playBattleEffect(effect);

    setTimeout(() => {
        if (!battleState) return;

        if (battleState.eventQueue.length > 0) {
            showNextQueuedEvent(onComplete);
        } else {
            toast.classList.add("hidden");
            toast.classList.remove("flex");
            onComplete();
        }
    }, BATTLE_CONFIG.eventDisplayMs);
}

function triggerAnimation(el, className, durationMs) {
    if (!el) return;
    el.classList.remove(className);
    void el.offsetWidth; // force reflow so the animation restarts
    el.classList.add(className);
    setTimeout(() => el.classList.remove(className), durationMs);
}

function spawnFloatingNumber(hostEl, text, kind) {
    if (!hostEl) return;
    const span = document.createElement("span");
    span.textContent = text;
    span.className = `floating-number ${kind}`;
    hostEl.appendChild(span);
    setTimeout(() => span.remove(), 900);
}

function battleEffectTarget(target) {
    return target === "owner"
        ? document.getElementById("ownerPortraitWrap")
        : document.querySelector(`.party-card[data-fighter-index="${target}"]`);
}

function playBattleEffect(effect) {
    if (!effect) return;
    const el = battleEffectTarget(effect.target);

    if (effect.type === "damage") {
        playBattleSfx("attackUtility");
        if (!el) return;
        triggerAnimation(el, "shake-hit", 500);
        triggerAnimation(el, "flash-hit", 350);
        spawnFloatingNumber(el, `-${effect.amount}`, "damage");
        if (effect.alsoFaints) {
            setTimeout(() => triggerAnimation(el, "faint-drop", 500), 350);
        }
    } else if (effect.type === "heal") {
        playBattleSfx("heal");
        if (el) {
            triggerAnimation(el, "flash-heal", 500);
            spawnFloatingNumber(el, `+${effect.amount}`, "heal");
        }
    } else if (effect.type === "utility") {
        playBattleSfx("attackUtility");
    } else if (effect.type === "swapIn") {
        if (el) triggerAnimation(el, "swap-in", 350);
    } else if (effect.type === "teamWipe") {
        playBattleSfx("attackUtility");
        document.querySelectorAll(".party-card").forEach((card) => triggerAnimation(card, "faint-drop", 500));
    }
}

function handleMoveClick(moveIndex) {
    if (!battleState || battleState.inputLocked || battleState.mode !== "move") return;

    const fighter = activeFighter();
    const move = fighter.card.moves[moveIndex];
    if (move.treatCost > fighter.treats) return;

    const effects = MOVE_EFFECTS[move.name] || {};
    const needsHealTarget = move.type === "heal" && !effects.cleansesAftersmell;

    if (needsHealTarget) {
        battleState.mode = "healTarget";
        battleState.pendingMove = { move, moveIndex };
        playBattleSfx("click");
        renderBattleScreen();
        return;
    }

    resolvePlayerMove(move, null);
}

function handleHealTargetClick(targetIndex) {
    if (!battleState || battleState.inputLocked || battleState.mode !== "healTarget") return;
    resolvePlayerMove(battleState.pendingMove.move, targetIndex);
}

function cancelHealTargeting() {
    if (!battleState || battleState.inputLocked) return;
    playBattleSfx("click");
    battleState.mode = "move";
    battleState.pendingMove = null;
    renderBattleScreen();
}

function resolvePlayerMove(move, healTargetIndex) {
    const fighter = activeFighter();
    const effects = MOVE_EFFECTS[move.name] || {};

    fighter.treats -= move.treatCost;

    if (effects.isGayBeam) {
        const roll = Math.random();
        if (roll < BATTLE_CONFIG.gayBeam.instantWinChance) {
            const dmgAmount = battleState.owner.hp;
            battleState.owner.hp = 0;
            queueEvent(`${fighter.card.name} used Gay Beam — instant win!`, { target: "owner", type: "damage", amount: dmgAmount });
        } else if (roll < BATTLE_CONFIG.gayBeam.instantWinChance + BATTLE_CONFIG.gayBeam.instantLossChance) {
            battleState.team.forEach((f) => { f.hp = 0; f.fainted = true; });
            queueEvent(`${fighter.card.name}'s Gay Beam backfired — the whole team is down!`, { target: "owner", type: "teamWipe" });
        } else {
            queueEvent(`${fighter.card.name} used Gay Beam... nothing happened.`);
        }
    } else if (move.type === "damage") {
        const dmg = mitigate(move.power, battleState.owner.data.defense);
        battleState.owner.hp = Math.max(0, battleState.owner.hp - dmg);
        queueEvent(`${fighter.card.name} used ${move.name} for ${dmg} damage!`, { target: "owner", type: "damage", amount: dmg });

        if (effects.inflictsAftersmell && Math.random() < BATTLE_CONFIG.aftersmell.procChance) {
            battleState.owner.aftersmell = { turnsLeft: BATTLE_CONFIG.aftersmell.duration };
            queueEvent(`${battleState.owner.data.name} is afflicted with Aftersmell!`);
        }
    } else if (move.type === "heal") {
        if (effects.cleansesAftersmell) {
            queueEvent(`${fighter.card.name} used ${move.name}, but there was nothing to cleanse.`);
        } else {
            const target = battleState.team[healTargetIndex];
            const healed = Math.min(target.maxHp - target.hp, move.power);
            target.hp += healed;
            queueEvent(`${fighter.card.name} healed ${target.card.name} for ${healed} HP!`, { target: healTargetIndex, type: "heal", amount: healed });
        }
    } else if (move.type === "utility") {
        const turns = effects.distractTurns || 0;
        battleState.owner.distractedTurns = Math.max(battleState.owner.distractedTurns, turns);
        queueEvent(`${battleState.owner.data.name} is distracted for ${turns} turn(s)!`, { target: "owner", type: "utility" });
    }

    battleState.mode = "move";
    battleState.pendingMove = null;
    checkBattleOver();

    afterAction(() => ownerTurn());
}

function handleSwapButtonClick() {
    if (!battleState || battleState.inputLocked || battleState.mode !== "move") return;
    playBattleSfx("click");
    battleState.mode = "swap";
    battleState.forcedSwapReason = null; // voluntary — still costs the turn
    renderBattleScreen();
}

function cancelSwap() {
    if (!battleState || battleState.inputLocked || battleState.forcedSwapReason) return;
    playBattleSfx("click");
    battleState.mode = "move";
    renderBattleScreen();
}

function handleSwapTargetClick(targetIndex) {
    if (!battleState || battleState.inputLocked || battleState.mode !== "swap") return;

    const wasFaintForced = battleState.forcedSwapReason === "faint";

    battleState.activeIndex = targetIndex;
    battleState.mode = "move";
    battleState.forcedSwapReason = null;
    queueEvent(`${activeFighter().card.name} is sent out!`, { target: targetIndex, type: "swapIn" });

    if (wasFaintForced) {
        afterAction(() => {}); // not your choice — no turn lost, just wait out the toast
        return;
    }

    afterAction(() => ownerTurn());
}

function ownerTurn() {
    if (!battleState || battleState.result) return;
    const owner = battleState.owner;

    if (owner.distractedTurns > 0) {
        owner.distractedTurns -= 1;
        queueEvent(`${owner.data.name} is distracted and can't act!`);
    } else {
        const fighter = activeFighter();
        const dmg = mitigate(owner.data.attack, fighter.card.stats.defense);
        fighter.hp = Math.max(0, fighter.hp - dmg);
        const causesFaint = fighter.hp === 0;
        if (causesFaint) fighter.fainted = true;
        queueEvent(`${owner.data.name} attacks ${fighter.card.name} for ${dmg} damage!`, { target: battleState.activeIndex, type: "damage", amount: dmg, alsoFaints: causesFaint });
    }

    // Ticks after the Owner's turn regardless of whether it acted — it's a
    // clock, not a reaction.
    if (owner.aftersmell) {
        owner.hp = Math.max(0, owner.hp - BATTLE_CONFIG.aftersmell.damagePerTick);
        owner.aftersmell.turnsLeft -= 1;
        queueEvent(`Aftersmell deals ${BATTLE_CONFIG.aftersmell.damagePerTick} damage to ${owner.data.name}!`, { target: "owner", type: "damage", amount: BATTLE_CONFIG.aftersmell.damagePerTick });
        if (owner.aftersmell.turnsLeft <= 0) owner.aftersmell = null;
    }

    livingBenchIndexes().forEach((index) => {
        const fighter = battleState.team[index];
        fighter.treats = Math.min(BATTLE_CONFIG.treatCap, fighter.treats + BATTLE_CONFIG.benchTreatRegen);
    });

    checkBattleOver();

    afterAction(() => {
        if (activeFighter().fainted) {
            const bench = livingBenchIndexes();
            if (bench.length > 0) {
                battleState.mode = "swap";
                battleState.forcedSwapReason = "faint";
            }
        }
        renderBattleScreen();
    });
}

function checkBattleOver() {
    if (battleState.owner.hp <= 0) {
        battleState.result = "win";
        queueEvent(`${battleState.owner.data.name} is defeated! You win!`);
        return;
    }
    if (battleState.team.every((fighter) => fighter.fainted)) {
        battleState.result = "loss";
        queueEvent("Your whole team has fainted...");
    }
}

function hpBarColor(percent) {
    if (percent > 50) return "bg-rarityUncommon";
    if (percent > 20) return "bg-orange";
    return "bg-red-500";
}

function renderBattleScreen() {
    if (!battleState) return;
    renderOwnerCard();
    renderPartyCards();
    renderMoveControls();
    renderSwapButtonVisibility();
    renderBattleOverBanner();
}

function renderOwnerCard() {
    const owner = battleState.owner;
    const percent = owner.maxHp ? Math.max(0, (owner.hp / owner.maxHp) * 100) : 0;

    document.getElementById("ownerNameLabel").textContent = owner.data.name;
    document.getElementById("ownerHpLabel").textContent = `HP ${owner.hp}/${owner.maxHp}`;
    const fill = document.getElementById("ownerHpFill");
    fill.style.width = `${percent}%`;
    fill.className = `h-full transition-all duration-300 ${hpBarColor(percent)}`;

    document.getElementById("ownerPortrait").innerHTML = owner.data.image
        ? `<img src="${owner.data.image}" alt="${owner.data.name}" class="w-full h-full object-cover object-top">`
        : `<span class="text-xs font-semibold text-inkSoft">Imag</span>`;

    const badges = [];
    if (owner.distractedTurns > 0) {
        badges.push(`<span class="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-rarityRare text-white">Distracted (${owner.distractedTurns})</span>`);
    }
    if (owner.aftersmell) {
        badges.push(`<span class="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-rarityEpic text-white">Aftersmell (${owner.aftersmell.turnsLeft})</span>`);
    }
    document.getElementById("ownerStatusBadges").innerHTML = badges.join("");
}

function renderPartyCards() {
    document.getElementById("activeFighterCard").innerHTML = partyCardHTML(activeFighter(), battleState.activeIndex, true, "w-24 sm:w-32 md:w-40 lg:w-48");

    const benchHTML = battleState.team
        .map((fighter, index) => ({ fighter, index }))
        .filter(({ index }) => index !== battleState.activeIndex)
        .map(({ fighter, index }) => partyCardHTML(fighter, index, false, "w-16 sm:w-20 md:w-24 lg:w-28"))
        .join("");
    document.getElementById("benchList").innerHTML = benchHTML;

    wirePartyCardClicks();
}

// Outer wrapper (click target + animation/floating-number host, no overflow
// clipping) around an inner card (the rounded, clipped visual) so shake/
// flash/faint animations aren't cut off by the image's rounded corners.
function partyCardHTML(fighter, index, isActive, sizeClass) {
    const rarity = RARITY_STYLES[fighter.card.rarity];
    const isHealTarget = battleState.mode === "healTarget" && !fighter.fainted;
    const isSwapTarget = battleState.mode === "swap" && !isActive && !fighter.fainted;
    const targetable = isHealTarget || isSwapTarget;

    return `
        <div class="party-card ${sizeClass} relative cursor-pointer" data-fighter-index="${index}">
            <div class="party-card-inner aspect-[5/7] rounded-2xl overflow-hidden border-2 ${rarity.border} ${isActive ? rarity.glow : ""} bg-beige text-ink flex flex-col transition ${fighter.fainted ? "opacity-30 grayscale" : ""} ${targetable ? "ring-2 ring-orange" : ""}">
                <div class="relative flex-1 min-h-0 bg-cover bg-top bg-voidDeep" style="background-image: url('${fighter.card.image}')">
                    <span class="absolute top-1 left-1 flex gap-0.5 sm:gap-1">${treatIconsHTML(fighter.treats)}</span>
                </div>
                <div class="px-1.5 py-1 sm:py-1.5">
                    <p class="text-[10px] sm:text-xs md:text-sm font-bold truncate text-center">${fighter.card.name}</p>
                    ${hpBarHTML(fighter)}
                </div>
            </div>
        </div>
    `;
}

function treatIconsHTML(current) {
    return Array.from({ length: BATTLE_CONFIG.treatCap })
        .map((_, i) => `<span class="${i < current ? "text-orange" : "text-ink/25"}">${iconHTML(TREAT_ICON, "w-2 h-2 sm:w-2.5 sm:h-2.5 md:w-3 md:h-3")}</span>`)
        .join("");
}

function hpBarHTML(fighter) {
    const percent = fighter.maxHp ? Math.max(0, (fighter.hp / fighter.maxHp) * 100) : 0;

    return `
        <div class="w-full h-1 sm:h-1.5 rounded-full bg-ink/15 overflow-hidden mt-1">
            <div class="h-full ${hpBarColor(percent)} transition-all duration-300" style="width:${percent}%"></div>
        </div>
        <p class="text-[8px] sm:text-[10px] md:text-xs text-inkSoft text-center mt-0.5">${fighter.hp}/${fighter.maxHp}${fighter.fainted ? " · Down" : ""}</p>
    `;
}

function wirePartyCardClicks() {
    document.querySelectorAll(".party-card").forEach((el) => {
        const index = Number(el.dataset.fighterIndex);
        const fighter = battleState.team[index];

        el.addEventListener("click", () => {
            if (battleState.inputLocked) return;

            if (battleState.mode === "healTarget" && !fighter.fainted) {
                handleHealTargetClick(index);
            } else if (battleState.mode === "swap" && index !== battleState.activeIndex && !fighter.fainted) {
                playBattleSfx("click");
                handleSwapTargetClick(index);
            } else if (battleState.mode === "move") {
                playBattleSfx("click");
                openDetailModal(fighter.card);
            }
        });
    });
}

function renderMoveControls() {
    const container = document.getElementById("moveButtons");

    if (battleState.inputLocked) {
        container.innerHTML = "";
        return;
    }

    if (battleState.mode === "healTarget") {
        container.innerHTML = `<p class="col-span-full text-sm text-inkSoft text-center">Tap a cat to heal — <button type="button" onclick="cancelHealTargeting()" class="underline">cancel</button></p>`;
        return;
    }

    if (battleState.mode === "swap") {
        const cancelLink = battleState.forcedSwapReason
            ? ""
            : ` — <button type="button" onclick="cancelSwap()" class="underline">cancel</button>`;
        container.innerHTML = `<p class="col-span-full text-sm text-inkSoft text-center">Tap who to send out${cancelLink}</p>`;
        return;
    }

    if (battleState.mode === "over") {
        container.innerHTML = "";
        return;
    }

    const fighter = activeFighter();
    container.innerHTML = fighter.card.moves.map((move, index) => {
        const affordable = move.treatCost <= fighter.treats;
        const effects = MOVE_EFFECTS[move.name] || {};
        const showsPower = move.type === "damage" || (move.type === "heal" && !effects.cleansesAftersmell);

        return `
            <button type="button" ${affordable ? `onclick="handleMoveClick(${index})"` : "disabled"} class="has-tooltip relative flex flex-col items-start gap-1 rounded-xl px-3 py-2.5 text-left border transition ${affordable ? "border-white/10 bg-voidRaised hover:bg-white/5" : "border-white/5 bg-voidRaised/40 opacity-40 cursor-not-allowed"}" data-tooltip="${move.description}" tabindex="0">
                <span class="font-semibold text-sm">${move.name}</span>
                <span class="flex items-center gap-2 text-xs text-inkSoft">
                    ${iconHTML(ROLE_ICONS[move.type] || MOVE_POWER_ICON, "w-3 h-3")}${showsPower ? move.power : ""}
                    ${treatCostHTML(move.treatCost)}
                </span>
            </button>
        `;
    }).join("");
}

function renderSwapButtonVisibility() {
    const hidden = battleState.inputLocked || battleState.mode !== "move";
    document.getElementById("swapButtonContainer").classList.toggle("hidden", hidden);
}

function renderBattleOverBanner() {
    const banner = document.getElementById("battleOverBanner");

    if (battleState.mode !== "over") {
        banner.classList.add("hidden");
        banner.classList.remove("flex");
        return;
    }

    banner.classList.remove("hidden");
    banner.classList.add("flex");

    const won = battleState.result === "win";
    document.getElementById("battleOverTitle").textContent = won ? "Victory!" : "Defeat...";
    document.getElementById("battleOverSubtitle").textContent = won
        ? `${battleState.owner.data.name} has been defeated.`
        : "Your team couldn't pull through this time.";
}