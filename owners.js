// Only the first Owner is playable right now — the other two are shown
// faded and locked as a preview. Flip `locked` to false once an Owner's
// battle is built. image: null shows a placeholder box instead of art.
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

const DIFFICULTY_STYLES = {
    easy: { badge: "bg-rarityUncommon" },
    medium: { badge: "bg-rarityRare" },
    hard: { badge: "bg-rarityEpic" },
};