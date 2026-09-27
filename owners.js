// =====================================================================
// OWNERS (Battle bosses)
// One entry per Owner you can challenge, ordered easy -> hard. Only the
// first (easiest) Owner is playable right now — the other two are shown
// faded and locked as a preview of what's coming. Flip `locked` to
// false once an Owner's battle is actually built.
//
// image is optional — leave it null to show a placeholder box instead
// of art (no Owner art has been supplied yet).
// =====================================================================

const OWNERS = [
    { id: 1, name: "Betit The III Jr.", difficulty: "easy", image: "images/betit.jpg", locked: false, hp: 220, attack: 18, defense: 20 },
    { id: 2, name: "Owner Name", difficulty: "medium", image: null, locked: true, hp: null, attack: null, defense: null },
    { id: 3, name: "Owner Name", difficulty: "hard", image: null, locked: true, hp: null, attack: null, defense: null },
];

const DIFFICULTY_LABELS = {
    easy: "Easy",
    medium: "Medium",
    hard: "Hard",
};

// Tailwind classes per difficulty tier — same idea as RARITY_STYLES in
// cards.js, just a separate table since difficulty and rarity are
// unrelated concepts.
const DIFFICULTY_STYLES = {
    easy: { badge: "bg-rarityUncommon" },
    medium: { badge: "bg-rarityRare" },
    hard: { badge: "bg-rarityEpic" },
};