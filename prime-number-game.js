const readline = require("readline");
const fs = require("fs");

// Initialize readline
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// High Score File
const HIGH_SCORE_FILE = "highscore.txt";

// Global Variables
let score = 0;
let highScore = 0;
let timer;
let hintsLeft = 1;

// Load High Score
if (fs.existsSync(HIGH_SCORE_FILE)) {
  highScore = parseInt(fs.readFileSync(HIGH_SCORE_FILE, "utf8")) || 0;
}

// Prime Check Function (Optimized)
function isPrime(num) {
  if (num < 2) return false;
  if (num === 2 || num === 3) return true;
  if (num % 2 === 0 || num % 3 === 0) return false;
  for (let i = 5; i * i <= num; i += 6) {
    if (num % i === 0 || num % (i + 2) === 0) return false;
  }
  return true;
}

// Generate Random Number Based on Difficulty
function generateNumber(difficulty) {
  let max;
  if (difficulty === "1") max = 50;
  else if (difficulty === "2") max = 500;
  else max = 5000;
  return Math.floor(Math.random() * max) + 1;
}

// Ask Question Function
function askQuestion(query, callback) {
  rl.question(query, (answer) => callback(answer.trim()));
}

// Game Modes
function startGame() {
  console.log(`
=========================================
🎯 WELCOME TO THE PRIME NUMBER GAME! 🎯
=========================================
📜 Instructions:
- Enter a number to check if it's prime.
- Earn points for correct answers!
- Choose different game modes & difficulties.
- Type 'q' to quit anytime.
  `);

  console.log(`🔹 Choose a Game Mode:
  1️⃣ Normal Mode (Check a number)
  2️⃣ Timed Mode ⏳ (Answer within 10s)
  3️⃣ Multiple Rounds Mode 🔄 (5 rounds)
  4️⃣ Endless Mode ♾️ (Play until you quit)
  5️⃣ Prime List Mode 📜 (Show primes in range)
  `);

  askQuestion("👉 Enter your choice (1-5): ", (mode) => {
    if (["1", "2", "3", "4"].includes(mode)) {
      chooseDifficulty(mode);
    } else if (mode === "5") {
      primeListMode();
    } else {
      console.log("❌ Invalid choice! Restarting game...\n");
      startGame();
    }
  });
}

// Choose Difficulty
function chooseDifficulty(mode) {
  console.log(`🔹 Choose Difficulty:
  1️⃣ Easy (1-50)
  2️⃣ Medium (1-500)
  3️⃣ Hard (1-5000)
  `);

  askQuestion("👉 Enter difficulty (1-3): ", (difficulty) => {
    if (!["1", "2", "3"].includes(difficulty)) {
      console.log("❌ Invalid difficulty! Restarting...\n");
      startGame();
    } else {
      console.log(`✅ You chose ${difficulty === "1" ? "Easy" : difficulty === "2" ? "Medium" : "Hard"} mode!\n`);
      if (mode === "1") normalMode(difficulty);
      else if (mode === "2") timedMode(difficulty);
      else if (mode === "3") multipleRoundsMode(difficulty);
      else endlessMode(difficulty);
    }
  });
}

// Normal Mode
function normalMode(difficulty) {
  let num = generateNumber(difficulty);
  askQuestion(`🧐 Is ${num} prime? (Yes/No): `, (answer) => {
    checkAnswer(num, answer, () => normalMode(difficulty));
  });
}

// Timed Mode
function timedMode(difficulty) {
  console.log("⏳ You have 10 seconds per question!\n");
  let num = generateNumber(difficulty);

  timer = setTimeout(() => {
    console.log("\n⏰ Time’s up! Game Over! 😭\n");
    endGame();
  }, 10000);

  askQuestion(`🕑 Is ${num} prime? (Yes/No): `, (answer) => {
    clearTimeout(timer);
    checkAnswer(num, answer, () => timedMode(difficulty));
  });
}

// Multiple Rounds Mode
function multipleRoundsMode(difficulty, round = 1) {
  if (round > 5) {
    console.log("🏆 Game Over! Final Score:", score);
    endGame();
    return;
  }

  let num = generateNumber(difficulty);
  askQuestion(`🎯 Round ${round}: Is ${num} prime? (Yes/No): `, (answer) => {
    checkAnswer(num, answer, () => multipleRoundsMode(difficulty, round + 1));
  });
}

// Endless Mode
function endlessMode(difficulty) {
  let num = generateNumber(difficulty);
  askQuestion(`🧐 Is ${num} prime? (Yes/No) (Type 'q' to quit): `, (answer) => {
    if (answer.toLowerCase() === "q") {
      endGame();
      return;
    }
    checkAnswer(num, answer, () => endlessMode(difficulty));
  });
}

// Prime List Mode
function primeListMode() {
  askQuestion("👉 Enter the start of the range: ", (start) => {
    askQuestion("👉 Enter the end of the range: ", (end) => {
      let primes = [];
      for (let i = parseInt(start); i <= parseInt(end); i++) {
        if (isPrime(i)) primes.push(i);
      }
      console.log(`🔢 Prime numbers between ${start} and ${end}:`, primes.join(", "));
      endGame();
    });
  });
}

// Check Answer
function checkAnswer(num, answer, nextQuestion) {
  let correct = isPrime(num) ? "yes" : "no";

  if (answer.toLowerCase() === correct) {
    console.log("🎉 Correct! 🎯 (+1 point)\n");
    score++;
  } else {
    console.log(`❌ Incorrect! ${num} is ${isPrime(num) ? "" : "not "}a prime number. 😢 (-1 point)\n`);
    score--;
  }

  nextQuestion();
}

// End Game
function endGame() {
  console.log(`🏆 Final Score: ${score}`);
  if (score > highScore) {
    console.log("🎯 New High Score! 🏆");
    fs.writeFileSync(HIGH_SCORE_FILE, score.toString());
  }
  console.log("\n👋 Thanks for playing! Restarting...\n");
  score = 0;
  startGame();
}

// Start the game
startGame();
