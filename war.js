const readline = require("readline");
const fs = require("fs");

// Setup readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// Create a standard 52-card deck
const suits = ["♠️", "♦️", "♣️", "♥️"];
const ranks = [
  { rank: "2", value: 2 },
  { rank: "3", value: 3 },
  { rank: "4", value: 4 },
  { rank: "5", value: 5 },
  { rank: "6", value: 6 },
  { rank: "7", value: 7 },
  { rank: "8", value: 8 },
  { rank: "9", value: 9 },
  { rank: "10", value: 10 },
  { rank: "J", value: 11 },
  { rank: "Q", value: 12 },
  { rank: "K", value: 13 },
  { rank: "A", value: 14 },
];

// Shuffle deck using Fisher-Yates algorithm
function shuffleDeck(deck) {
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
}

// Initialize the game
function initializeGame() {
  let deck = [];
  for (const suit of suits) {
    for (const rank of ranks) {
      deck.push({ rank: rank.rank, value: rank.value, suit });
    }
  }

  shuffleDeck(deck);
  return {
    player1Deck: deck.slice(0, 26),
    player2Deck: deck.slice(26),
    roundsPlayed: 0,
    totalWars: 0,
    longestWarStreak: 0,
    currentWarStreak: 0,
  };
}

// Game logic
function playRound(gameState) {
  if (gameState.player1Deck.length === 0) return "Player 2 Wins!";
  if (gameState.player2Deck.length === 0) return "Player 1 Wins!";

  const card1 = gameState.player1Deck.shift();
  const card2 = gameState.player2Deck.shift();

  console.log(`\n♠️ Round ${gameState.roundsPlayed + 1}`);
  console.log(`Player 1 plays: ${card1.rank}${card1.suit}`);
  console.log(`Player 2 plays: ${card2.rank}${card2.suit}`);

  if (card1.value > card2.value) {
    gameState.player1Deck.push(card1, card2);
    console.log("✅ Player 1 wins this round!");
    gameState.currentWarStreak = 0;
  } else if (card2.value > card1.value) {
    gameState.player2Deck.push(card1, card2);
    console.log("✅ Player 2 wins this round!");
    gameState.currentWarStreak = 0;
  } else {
    console.log("⚔️ WAR! ⚔️");
    gameState.totalWars++;
    gameState.currentWarStreak++;
    gameState.longestWarStreak = Math.max(
      gameState.longestWarStreak,
      gameState.currentWarStreak
    );
    return warBattle(gameState, [card1, card2]);
  }

  gameState.roundsPlayed++;
  console.log(
    `Cards Remaining → Player 1: ${gameState.player1Deck.length} | Player 2: ${gameState.player2Deck.length}`
  );

  return null;
}

// War resolution
function warBattle(gameState, warPile) {
  if (
    gameState.player1Deck.length < 4 ||
    gameState.player2Deck.length < 4
  ) {
    return gameState.player1Deck.length < 4 ? "Player 2 Wins!" : "Player 1 Wins!";
  }

  for (let i = 0; i < 3; i++) {
    warPile.push(gameState.player1Deck.shift());
    warPile.push(gameState.player2Deck.shift());
  }

  const warCard1 = gameState.player1Deck.shift();
  const warCard2 = gameState.player2Deck.shift();
  warPile.push(warCard1, warCard2);

  console.log(`\n🔥 WAR BATTLE! 🔥`);
  console.log(`Player 1 plays: ${warCard1.rank}${warCard1.suit}`);
  console.log(`Player 2 plays: ${warCard2.rank}${warCard2.suit}`);

  if (warCard1.value > warCard2.value) {
    gameState.player1Deck.push(...warPile);
    console.log("🔥 Player 1 wins the war!");
  } else if (warCard2.value > warCard1.value) {
    gameState.player2Deck.push(...warPile);
    console.log("🔥 Player 2 wins the war!");
  } else {
    console.log("🚨 Another tie! Continuing war...");
    return warBattle(gameState, warPile);
  }

  return null;
}

// Game loop
function startGame(autoPlay = false) {
  let gameState = initializeGame();

  function playNextRound() {
    const result = playRound(gameState);
    if (result) {
      console.log(`\n🏆 ${result}`);
      console.log(`Total Rounds: ${gameState.roundsPlayed}`);
      console.log(`Total Wars: ${gameState.totalWars}`);
      console.log(`Longest War Streak: ${gameState.longestWarStreak}`);
      rl.close();
      return;
    }

    if (autoPlay) {
      setTimeout(playNextRound, 500);
    } else {
      rl.question("Press [Enter] to continue...", playNextRound);
    }
  }

  playNextRound();
}

// Save & Load Game State
function saveGame(gameState) {
  fs.writeFileSync("war_game_save.json", JSON.stringify(gameState, null, 2));
  console.log("✅ Game saved successfully!");
}

function loadGame() {
  if (fs.existsSync("war_game_save.json")) {
    return JSON.parse(fs.readFileSync("war_game_save.json"));
  }
  return null;
}

// Main Menu
function mainMenu() {
  console.log("\n🎴 Welcome to CLI War Card Game! 🎴");
  rl.question("Would you like to enable Auto-Play? (yes/no): ", (input) => {
    if (input.toLowerCase() === "yes") {
      startGame(true);
    } else {
      startGame(false);
    }
  });
}

mainMenu();
