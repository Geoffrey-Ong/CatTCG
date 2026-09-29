// Formulas: final stat = base + (real trait × multiplier, where present) + random(0..range)
const STAT_CONFIG = {
    hp: {
        base: 45,
        friendlinessMultiplier: 9,
        randomRange: 12,
    },
    defense: {
        base: 25,
        healthyBonus: 15,
        unhealthyBonus: 5,
        randomRange: 20,
    },
};

// Rarity: a 0-1 score is rolled, nudged by the bonuses below, then compared
// against these thresholds top-down (first match wins).
const RARITY_THRESHOLDS = {
    legendary: 0.95,
    epic: 0.85,
    rare: 0.65,
    uncommon: 0.35,
};

const RARITY_SCORE_BONUS = {
    notForAdoption: 0.15,
    intenseDescription: 0.2,
};

const INTENSE_WORDS = ["devil", "damned", "possessed", "stab", "anger", "evil", "souls", "political"];

const RARITY_PULL_WEIGHTS = {
    common: 50,
    uncommon: 25,
    rare: 15,
    epic: 7,
    legendary: 3,
};

// Two moves per cat, keyed by the cat's id from the API. Any id not listed
// here falls back to DEFAULT_MOVES.
const CUSTOM_MOVES = {
    1:  [{ name: "Salmonella Breath", power: 35 }, { name: "Claw Slash", power: 20 }],       // Whiskers
    2:  [{ name: "Gay Beam", power: 1 }, { name: "Claw Slash", power: 20 }],                // Luna
    3:  [{ name: "Vase Throw", power: 40 }, { name: "Head Bump", power: 10 }],               // Simba
    4:  [{ name: "Gay Beam", power: 1 }, { name: "Head Bump", power: 10 }],                 // Bacteria
    5:  [{ name: "Tuna Mukbang", power: 30 }, { name: "Head Bump", power: 10 }],             // Chromosome
    6:  [{ name: "Tuna Mukbang", power: 30 }, { name: "Head Bump", power: 10 }],             // Biggie Cheese
    7:  [{ name: "Catnip Distribution", power: 20 }, { name: "Claw Slash", power: 20 }],     // Burmese Python
    8:  [{ name: "Political Stance", power: 1 }, { name: "Claw Slash", power: 20 }],        // King
    9:  [{ name: "Salmonella Breath", power: 35 }, { name: "Claw Slash", power: 20 }],       // Larry
    10: [{ name: "Vase Throw", power: 40 }, { name: "Head Bump", power: 10 }],               // Evil Larry
    11: [{ name: "Vase Throw", power: 40 }, { name: "Head Bump", power: 10 }],               // Irish
    12: [{ name: "Cute Eyes", power: 1 }, { name: "Claw Slash", power: 20 }],               // Poppy
    13: [{ name: "Cute Eyes", power: 1 }, { name: "Head Bump", power: 10 }],                // Mort
    14: [{ name: "Catnip Distribution", power: 20 }, { name: "Head Bump", power: 10 }],      // Wart
    15: [{ name: "Salmonella Breath", power: 35 }, { name: "Claw Slash", power: 20 }],       // Lexi
    16: [{ name: "Tuna Mukbang", power: 30 }, { name: "Claw Slash", power: 20 }],            // Bob
    17: [{ name: "Vase Throw", power: 40 }, { name: "Head Bump", power: 10 }],               // Ratt
    18: [{ name: "Salmonella Breath", power: 35 }, { name: "Claw Slash", power: 20 }],       // Hercules
    19: [{ name: "Political Stance", power: 1 }, { name: "Head Bump", power: 10 }],         // Satan
    20: [{ name: "Catnip Distribution", power: 20 }, { name: "Claw Slash", power: 20 }],     // Terry
};

const DEFAULT_MOVES = [
    { name: "Paw Swipe", power: 20 },
    { name: "Hiss", power: 15 },
];

// Keyed by move name (not cat id) since several cats share a move.
// treatCost: 0 renders as "Free" instead of treat icons.
const MOVE_INFO = {
    "Claw Slash": { description: "A basic slashing attack.", treatCost: 1, type: "damage" },
    "Head Bump": { description: "A basic headbutt attack.", treatCost: 0, type: "damage" },
    "Tuna Mukbang": { description: "Heals the cat's HP by devouring tuna.", treatCost: 2, type: "heal" },
    "Catnip Distribution": { description: "Removes any negative status effects (de-buffs).", treatCost: 2, type: "heal" },
    "Cute Eyes": { description: "Distracts the Owner for 2 turns.", treatCost: 2, type: "utility" },
    "Gay Beam": { description: "20% chance to instantly defeat the boss, but a 10% chance it backfires and wipes out the whole team.", treatCost: 2, type: "utility" },
    "Political Stance": { description: "Distracts the Owner for 1 turn.", treatCost: 1, type: "utility" },
    "Salmonella Breath": { description: "A damaging attack with a chance to inflict After-smell.", treatCost: 2, type: "damage" },
    "Vase Throw": { description: "A powerful throwing attack.", treatCost: 2, type: "damage" },
};

const DEFAULT_MOVE_INFO = { description: "", treatCost: 0, type: "damage" };

// One role per cat, keyed by id. Valid roles are the keys of ROLE_LABELS.
const CUSTOM_ROLES = {
    1:  "damage",   // Whiskers
    2:  "utility",  // Luna
    3:  "damage",   // Simba
    4:  "damage",   // Bacteria
    5:  "heal",     // Chromosome
    6:  "heal",     // Biggie Cheese
    7:  "heal",     // Burmese Python
    8:  "utility",  // King
    9:  "damage",   // Larry
    10: "damage",   // Evil Larry
    11: "damage",   // Irish
    12: "utility",  // Poppy
    13: "utility",  // Mort
    14: "heal",     // Wart
    15: "damage",   // Lexi
    16: "heal",     // Bob
    17: "damage",   // Ratt
    18: "damage",   // Hercules
    19: "utility",  // Satan
    20: "heal",     // Terry
};

const DEFAULT_ROLE = "damage";

const ROLE_LABELS = {
    damage: "Damage",
    heal: "Heal",
    utility: "Utility",
};

const ROLE_ICONS = {
    damage: "icons/Attack.png",
    heal: "icons/Heal.png",
    utility: "icons/Utility.png",
};

const STAT_ICONS = {
    hp: "icons/HP.png",
    defense: "icons/Defence.png",
};

const MOVE_POWER_ICON = "icons/Atk.png";
const TREAT_ICON = "icons/snack.png";

const RARITY_ORDER = ["common", "uncommon", "rare", "epic", "legendary"];

const RARITY_LABELS = {
    common: "Common",
    uncommon: "Uncommon",
    rare: "Rare",
    epic: "Epic",
    legendary: "Legendary",
};

const STAT_LABELS = {
    hp: "HP",
    defense: "Defense",
};

const RARITY_STYLES = {
    common: { border: "border-rarityCommon", badge: "bg-rarityCommon", glow: "" },
    uncommon: { border: "border-rarityUncommon", badge: "bg-rarityUncommon", glow: "" },
    rare: { border: "border-rarityRare", badge: "bg-rarityRare", glow: "glow-rare" },
    epic: { border: "border-rarityEpic", badge: "bg-rarityEpic", glow: "glow-epic" },
    legendary: { border: "border-rarityLegendary", badge: "bg-rarityLegendary", glow: "glow-legendary" },
};

// Seeded PRNG — same seed always produces the same sequence, so a card's
// stats/rarity are reproducible without storing them anywhere.
function mulberry32(seed) {
    return function () {
        seed |= 0;
        seed = (seed + 0x6D2B79F5) | 0;
        let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function getMoves(cat) {
    const moves = CUSTOM_MOVES[cat.id] || DEFAULT_MOVES;
    return moves.map((move) => ({
        ...move,
        ...(MOVE_INFO[move.name] || DEFAULT_MOVE_INFO),
    }));
}

function getRole(cat) {
    return CUSTOM_ROLES[cat.id] || DEFAULT_ROLE;
}

function determineRarity(cat, roll) {
    let score = roll();

    if (cat.good_for_adoption === "No") {
        score += RARITY_SCORE_BONUS.notForAdoption;
    }

    const flavorText = `${cat.description} ${cat.dislikes} ${cat.likes}`.toLowerCase();
    if (INTENSE_WORDS.some((word) => flavorText.includes(word))) {
        score += RARITY_SCORE_BONUS.intenseDescription;
    }

    if (score >= RARITY_THRESHOLDS.legendary) return "legendary";
    if (score >= RARITY_THRESHOLDS.epic) return "epic";
    if (score >= RARITY_THRESHOLDS.rare) return "rare";
    if (score >= RARITY_THRESHOLDS.uncommon) return "uncommon";
    return "common";
}

function generateCard(cat) {
    const roll = mulberry32((cat.id * 2654435761) >>> 0);

    const rarity = determineRarity(cat, roll);
    const friendliness = Number(cat.friendliness_level) || 3;

    const hp = Math.round(
        STAT_CONFIG.hp.base +
        friendliness * STAT_CONFIG.hp.friendlinessMultiplier +
        roll() * STAT_CONFIG.hp.randomRange
    );

    const defense = Math.round(
        STAT_CONFIG.defense.base +
        (cat.previous_health_conditions === "None" ? STAT_CONFIG.defense.healthyBonus : STAT_CONFIG.defense.unhealthyBonus) +
        roll() * STAT_CONFIG.defense.randomRange
    );

    return {
        id: cat.id,
        name: cat.name,
        breed: cat.breed,
        image: cat.image,
        description: cat.description,
        rarity,
        role: getRole(cat),
        stats: { hp, defense },
        moves: getMoves(cat),
    };
}

const COLLECTION_STORAGE_KEY = "catTCG_collection";

function getCollection() {
    try {
        const raw = localStorage.getItem(COLLECTION_STORAGE_KEY);
        return raw ? JSON.parse(raw) : { unlockedIds: [] };
    } catch (error) {
        console.error("Could not read collection from localStorage:", error);
        return { unlockedIds: [] };
    }
}

function saveCollection(collection) {
    try {
        localStorage.setItem(COLLECTION_STORAGE_KEY, JSON.stringify(collection));
    } catch (error) {
        console.error("Could not save collection to localStorage:", error);
    }
}

function hasCard(id) {
    return getCollection().unlockedIds.includes(id);
}

function unlockCard(id) {
    const collection = getCollection();
    if (!collection.unlockedIds.includes(id)) {
        collection.unlockedIds.push(id);
        saveCollection(collection);
    }
    return collection;
}

// The 3 cats picked for Battle, in deploy order — index 0 deploys first.
const BATTLE_TEAM_STORAGE_KEY = "catTCG_battleTeam";
const BATTLE_TEAM_SIZE = 3;

function getBattleTeam() {
    try {
        const raw = localStorage.getItem(BATTLE_TEAM_STORAGE_KEY);
        const team = raw ? JSON.parse(raw) : [];
        return Array.isArray(team) ? team : [];
    } catch (error) {
        console.error("Could not read battle team from localStorage:", error);
        return [];
    }
}

function saveBattleTeam(cardIds) {
    try {
        localStorage.setItem(BATTLE_TEAM_STORAGE_KEY, JSON.stringify(cardIds.slice(0, BATTLE_TEAM_SIZE)));
    } catch (error) {
        console.error("Could not save battle team to localStorage:", error);
    }
}

// Weighted random draw across the full card list, biased by rarity.
function drawPackCard(cards) {
    const totalWeight = cards.reduce((sum, card) => sum + RARITY_PULL_WEIGHTS[card.rarity], 0);
    let roll = Math.random() * totalWeight;

    for (const card of cards) {
        roll -= RARITY_PULL_WEIGHTS[card.rarity];
        if (roll <= 0) return card;
    }

    return cards[cards.length - 1];
}