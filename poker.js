const readline = require("readline");

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

const suits = ["♠", "♥", "♦", "♣"];
const ranks = [
    "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"
];
let deck = [];
let players = [];
let communityCards = [];
let pot = 0;
let dealerIndex = 0;
let smallBlind = 10;
let bigBlind = 20;

/**
 * Initialize deck
 */
function createDeck() {
    deck = [];
    for (const suit of suits) {
        for (const rank of ranks) {
            deck.push({ rank, suit });
        }
    }
}

/**
 * Shuffle the deck using Fisher-Yates Algorithm
 */
function shuffleDeck() {
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
}

/**
 * Initialize Players
 */
function setupPlayers() {
    players = [];
    players.push({ name: "You", chips: 1000, cards: [], folded: false });

    const aiCount = 3;
    for (let i = 1; i <= aiCount; i++) {
        players.push({ name: `AI_${i}`, chips: 1000, cards: [], folded: false });
    }
}

/**
 * Deal hole cards to each player
 */
function dealHoleCards() {
    for (const player of players) {
        player.cards = [deck.pop(), deck.pop()];
    }
}

/**
 * Deal community cards
 */
function dealCommunityCards() {
    communityCards = [deck.pop(), deck.pop(), deck.pop(), deck.pop(), deck.pop()];
}

/**
 * Display the table
 */
function displayTable() {
    console.log("\n==========================================");
    console.log("♠️ TEXAS HOLD'EM POKER - CLI VERSION ♠️");
    console.log("==========================================");
    console.log(`💰 POT: ${pot} Chips`);
    console.log(`🃏 Community Cards: ${communityCards.map(c => `[${c.rank}${c.suit}]`).join(" ") || "None"}`);
}

/**
 * Display Player's hand
 */
function displayPlayerHand(player) {
    console.log(`\n👤 ${player.name}'s Cards: ${player.cards.map(c => `[${c.rank}${c.suit}]`).join(" ")}`);
}

/**
 * AI Decision Making
 */
function aiDecision(player) {
    if (player.folded) return;
    const action = Math.random() < 0.5 ? "check" : "call";
    console.log(`🤖 ${player.name} chooses to ${action}.`);
}

/**
 * Betting Round
 */
function bettingRound(callback) {
    console.log("\n💰 Betting Round:");
    function askPlayer() {
        if (players[0].folded) {
            return callback();
        }
        rl.question("➡️ Your turn! (fold, check, call, raise): ", (answer) => {
            if (answer === "fold") {
                players[0].folded = true;
            } else if (answer === "raise") {
                rl.question("Enter raise amount: ", (amount) => {
                    pot += parseInt(amount);
                    console.log(`You raised ${amount} chips.`);
                    askAI();
                });
                return;
            } else if (answer === "call") {
                console.log("You called.");
            } else {
                console.log("You checked.");
            }
            askAI();
        });
    }

    function askAI(index = 1) {
        if (index >= players.length) return callback();
        aiDecision(players[index]);
        askAI(index + 1);
    }

    askPlayer();
}

/**
 * Showdown & Determine Winner
 */
function showdown() {
    console.log("\n🏆 SHOWDOWN TIME!");
    players.forEach(player => {
        if (!player.folded) {
            console.log(`👤 ${player.name}: ${player.cards.map(c => `[${c.rank}${c.suit}]`).join(" ")}`);
        }
    });

    console.log("\n🎉 Winner is randomly chosen (placeholder for hand ranking logic)!");
}

/**
 * Game Loop
 */
function startGame() {
    createDeck();
    shuffleDeck();
    setupPlayers();
    dealHoleCards();
    displayTable();
    displayPlayerHand(players[0]);

    bettingRound(() => {
        dealCommunityCards();
        displayTable();

        bettingRound(() => {
            showdown();
            rl.close();
        });
    });
}

startGame();
