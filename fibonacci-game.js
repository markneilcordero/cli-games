const readline = require("readline");
const fs = require("fs");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// Leaderboard File
const LEADERBOARD_FILE = "leaderboard.json";

// Default Game State
let score = 0;
let lives = 3;
let streak = 0;
let difficulty = "Normal";
let fibonacciSequence = [0, 1];
let gameOver = false;
let timeLimit = null;

// Load Leaderboard
function loadLeaderboard() {
  if (fs.existsSync(LEADERBOARD_FILE)) {
    return JSON.parse(fs.readFileSync(LEADERBOARD_FILE, "utf8"));
  }
  return [];
}

// Save Leaderboard
function saveLeaderboard(playerName, playerScore) {
  let leaderboard = loadLeaderboard();
  leaderboard.push({ name: playerName, score: playerScore });
  leaderboard.sort((a, b) => b.score - a.score);
  fs.writeFileSync(LEADERBOARD_FILE, JSON.stringify(leaderboard, null, 2));
}

// Show Leaderboard
function displayLeaderboard() {
  let leaderboard = loadLeaderboard();
  console.log("\n🏆 LEADERBOARD 🏆");
  leaderboard.slice(0, 5).forEach((player, index) => {
    console.log(`${index + 1}. ${player.name} - ${player.score} ⭐`);
  });
}

// Ask for difficulty
function askDifficulty() {
  console.log("\n🎮 Select Difficulty:");
  console.log("1. Easy (Unlimited Lives)");
  console.log("2. Normal (3 Lives)");
  console.log("3. Hard (1 Life)");
  
  rl.question("Enter your choice (1-3): ", (choice) => {
    if (choice === "1") {
      difficulty = "Easy";
      lives = Infinity;
    } else if (choice === "3") {
      difficulty = "Hard";
      lives = 1;
    }
    console.log(`\n🔢 Game Mode: Classic | Difficulty: ${difficulty}`);
    console.log(`❤️ Lives: ${lives} | ⭐ Score: ${score}`);
    startGame();
  });
}

// Start game loop
function startGame() {
  if (gameOver) return;

  const nextNumber = fibonacciSequence[fibonacciSequence.length - 2] + fibonacciSequence[fibonacciSequence.length - 1];

  console.log(`\n🔢 Fibonacci Sequence: [${fibonacciSequence.join(", ")}, ?]`);
  
  if (difficulty === "Easy") {
    console.log("(Hint: The next number is " + nextNumber + ")");
  }

  timeLimit = setTimeout(() => {
    console.log("\n⏳ Time's up! ❌ You lost a life.");
    handleIncorrect(nextNumber);
  }, 5000);

  rl.question("Enter the next Fibonacci number: ", (input) => {
    clearTimeout(timeLimit);
    if (parseInt(input) === nextNumber) {
      handleCorrect(nextNumber);
    } else {
      handleIncorrect(nextNumber);
    }
  });
}

// Handle correct answer
function handleCorrect(nextNumber) {
  fibonacciSequence.push(nextNumber);
  score += 10;
  streak++;
  
  if (streak % 3 === 0) {
    score += 5; // Bonus for streak
    console.log("🔥 Streak Bonus! +5 Points");
  }

  console.log("✅ Correct! 🎉");
  console.log(`❤️ Lives: ${lives} | ⭐ Score: ${score}`);
  startGame();
}

// Handle incorrect answer
function handleIncorrect(correctAnswer) {
  console.log(`❌ Incorrect! The correct number was: ${correctAnswer}`);
  streak = 0;
  if (lives !== Infinity) lives--;

  if (lives <= 0) {
    console.log("\n💀 No lives left. Game Over!");
    gameOver = true;
    endGame();
  } else {
    console.log(`❤️ Lives: ${lives} | ⭐ Score: ${score}`);
    startGame();
  }
}

// End game and save leaderboard
function endGame() {
  rl.question("\nEnter your name for the leaderboard: ", (playerName) => {
    saveLeaderboard(playerName, score);
    displayLeaderboard();
    rl.question("\nPlay again? (y/n): ", (choice) => {
      if (choice.toLowerCase() === "y") {
        resetGame();
      } else {
        console.log("Thanks for playing! 🎉");
        rl.close();
      }
    });
  });
}

// Reset game
function resetGame() {
  score = 0;
  lives = difficulty === "Hard" ? 1 : 3;
  streak = 0;
  fibonacciSequence = [0, 1];
  gameOver = false;
  startGame();
}

// Start the game
askDifficulty();
