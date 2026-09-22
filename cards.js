// =====================================================================
// EASY CUSTOMIZATION ZONE
// Every number that affects card stats, rarity odds, or pack odds lives
// here. Change values in this section — nothing below it needs to change.
// =====================================================================

// Formulas: final stat = base + (real trait × multiplier, where present) + random(0..range)
const STAT_CONFIG = {
    hp: {
        base: 45,
        friendlinessMultiplier: 9, // each point of friendliness_level adds this much HP
        randomRange: 12,
    },
    attack: {
        base: 30,
        randomRange: 40,
        notForAdoptionBonus: 10, // extra attack if good_for_adoption is "No"
    },
    defense: {
        base: 25,
        healthyBonus: 15,   // bonus if previous_health_conditions is "None"
        unhealthyBonus: 5,  // bonus otherwise
        randomRange: 20,
    },
    speed: {
        base: 20,
        randomRange: 50,
    },
};

// Rarity: a 0-1 score is rolled, nudged by the bonuses below, then compared
// against these thresholds top-down (first match wins).
const RARITY_THRESHOLDS = {
    legendary: 0.95,
    epic: 0.85,
    rare: 0.65,
    uncommon: 0.35,
    // anything below "uncommon" is common
};

const RARITY_SCORE_BONUS = {
    notForAdoption: 0.15,      // added if good_for_adoption is "No"
    intenseDescription: 0.2,   // added if an INTENSE_WORDS match is found
};

// Words that, if found in a cat's description/likes/dislikes, push its
// rarity score up by RARITY_SCORE_BONUS.intenseDescription.
const INTENSE_WORDS = ["devil", "damned", "possessed", "stab", "anger", "evil", "souls", "political"];

// Relative odds of pulling each rarity tier from a pack. Higher = more common.
const RARITY_PULL_WEIGHTS = {
    common: 50,
    uncommon: 25,
    rare: 15,
    epic: 7,
    legendary: 3,
};

// -----------------------------------------------------------------
// CUSTOM MOVES
// Two moves per cat, keyed by the cat's id from the API. Edit names
// and power values freely — nothing here is auto-generated.
// Any cat whose id isn't listed here falls back to DEFAULT_MOVES,
// so adding a new cat to the API won't break anything.
// -----------------------------------------------------------------
const CUSTOM_MOVES = {
    1:  [{ name: "Bonito Barrage", power: 32 }, { name: "Beach Sprint", power: 22 }],       // Whiskers
    2:  [{ name: "Yarn Ball Tangle", power: 28 }, { name: "Fish Frenzy", power: 30 }],       // Luna
    3:  [{ name: "Soul Devourer", power: 38 }, { name: "Slipper Shred", power: 24 }],        // Simba
    4:  [{ name: "Midnight Stab", power: 34 }, { name: "Deep Sleep", power: 18 }],           // Bacteria
    5:  [{ name: "Nugget Nom", power: 26 }, { name: "Food Frenzy", power: 30 }],             // Chromosome
    6:  [{ name: "17-Hour Nap", power: 15 }, { name: "Grumpy Slap", power: 30 }],            // Biggie Cheese
    7:  [{ name: "Sunbeam Bask", power: 20 }, { name: "Water Splash", power: 24 }],          // Burmese Python
    8:  [{ name: "Throne Stare", power: 28 }, { name: "Royal Decree", power: 26 }],          // King
    9:  [{ name: "Cheese Wheel Roll", power: 30 }, { name: "Cheddar Charge", power: 26 }],   // Larry
    10: [{ name: "Larry's Bane", power: 36 }, { name: "Egg Toss", power: 22 }],              // Evil Larry
    11: [{ name: "Meatball Meteor", power: 30 }, { name: "Park Pounce", power: 24 }],        // Irish
    12: [{ name: "Crunch Bite", power: 28 }, { name: "Plant Pounce", power: 22 }],           // Poppy
    13: [{ name: "Rooftop Leap", power: 26 }, { name: "Storm Cower", power: 16 }],           // Mort
    14: [{ name: "Gentle Nuzzle", power: 22 }, { name: "Perfect Precision", power: 34 }],    // Wart
    15: [{ name: "Sandy Scamper", power: 24 }, { name: "Beach Body Slam", power: 28 }],      // Lexi
    16: [{ name: "Ear Scratch Combo", power: 20 }, { name: "Quiet Retreat", power: 18 }],    // Bob
    17: [{ name: "Cheesestick Charge", power: 28 }, { name: "Underdog Uppercut", power: 32 }], // Ratt
    18: [{ name: "Solar Flare", power: 34 }, { name: "Rain Dodge", power: 20 }],             // Hercules
    19: [{ name: "Whispering Voices", power: 36 }, { name: "Midnight Watch", power: 30 }],   // Satan
    20: [{ name: "Dumpling Toss", power: 26 }, { name: "Nap Attack", power: 18 }],           // Terry
};

// Used for any cat id not listed in CUSTOM_MOVES above.
const DEFAULT_MOVES = [
    { name: "Paw Swipe", power: 20 },
    { name: "Hiss", power: 15 },
];

// =====================================================================
// CARD GENERATION
// Stats and rarity are derived deterministically from each cat's own id
// using a seeded random number generator (mulberry32) — so the same cat
// always produces the same card, every time the page loads, without
// needing to store the computed values anywhere. Only the *pack draw*
// (which cat you get) uses true randomness.
// =====================================================================

const RARITY_ORDER = ["common", "uncommon", "rare", "epic", "legendary"];

const RARITY_LABELS = {
    common: "Common",
    uncommon: "Uncommon",
    rare: "Rare",
    epic: "Epic",
    legendary: "Legendary",
};

// Tailwind classes per rarity tier, used when building card markup in JS.
// "glow" is a small custom class (see custom.css) for tiers dramatic
// enough to deserve a colored box-shadow.
const RARITY_STYLES = {
    common: { border: "border-rarityCommon", badge: "bg-rarityCommon", glow: "" },
    uncommon: { border: "border-rarityUncommon", badge: "bg-rarityUncommon", glow: "" },
    rare: { border: "border-rarityRare", badge: "bg-rarityRare", glow: "glow-rare" },
    epic: { border: "border-rarityEpic", badge: "bg-rarityEpic", glow: "glow-epic" },
    legendary: { border: "border-rarityLegendary", badge: "bg-rarityLegendary", glow: "glow-legendary" },
};

// A small, fast seeded PRNG. Calling the returned function repeatedly
// advances its internal state, giving a repeatable sequence of
// pseudo-random values for a given seed.
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
    return CUSTOM_MOVES[cat.id] || DEFAULT_MOVES;
}

// Rarity leans on real traits: cats not currently up for adoption, or
// with an intense/villainous streak in their description, skew rarer —
// ties the rarity system back to the actual data instead of being pure
// dice rolls.
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
    // Scramble the id a bit so adjacent ids don't produce visibly similar seeds
    const roll = mulberry32((cat.id * 2654435761) >>> 0);

    const rarity = determineRarity(cat, roll);
    const friendliness = Number(cat.friendliness_level) || 3;

    const hp = Math.round(
        STAT_CONFIG.hp.base +
        friendliness * STAT_CONFIG.hp.friendlinessMultiplier +
        roll() * STAT_CONFIG.hp.randomRange
    );

    const attack = Math.round(
        STAT_CONFIG.attack.base +
        roll() * STAT_CONFIG.attack.randomRange +
        (cat.good_for_adoption === "No" ? STAT_CONFIG.attack.notForAdoptionBonus : 0)
    );

    const defense = Math.round(
        STAT_CONFIG.defense.base +
        (cat.previous_health_conditions === "None" ? STAT_CONFIG.defense.healthyBonus : STAT_CONFIG.defense.unhealthyBonus) +
        roll() * STAT_CONFIG.defense.randomRange
    );

    const speed = Math.round(
        STAT_CONFIG.speed.base +
        roll() * STAT_CONFIG.speed.randomRange
    );

    return {
        id: cat.id,
        name: cat.name,
        breed: cat.breed,
        image: cat.image,
        description: cat.description,
        rarity,
        stats: { hp, attack, defense, speed },
        moves: getMoves(cat),
    };
}

// =====================================================================
// COLLECTION STORAGE (localStorage)
//
// Kept behind these functions on purpose — if this later moves to a
// real backend, only these functions need to change, not every place
// that calls them.
// =====================================================================

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

// =====================================================================
// PACK OPENING
// =====================================================================

// Weighted random draw across the full card list, using each card's
// rarity to bias the odds. This is the one place true randomness
// belongs — everything about the card itself is already fixed.
function drawPackCard(cards) {
    const totalWeight = cards.reduce((sum, card) => sum + RARITY_PULL_WEIGHTS[card.rarity], 0);
    let roll = Math.random() * totalWeight;

    for (const card of cards) {
        roll -= RARITY_PULL_WEIGHTS[card.rarity];
        if (roll <= 0) return card;
    }

    return cards[cards.length - 1]; // fallback, shouldn't normally hit this
}
