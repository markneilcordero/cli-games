const readline = require('readline');

// Setup CLI interface
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// Game settings
const difficulties = {
    1: { name: "Easy", range: 50, attempts: 15 },
    2: { name: "Medium", range: 100, attempts: 10 },
    3: { name: "Hard", range: 500, attempts: 7 }
};

let secretNumber, maxAttempts, remainingAttempts, minRange, maxRange;

// Function to generate a random number
const generateRandomNumber = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

// Function to start the game
const startGame = () => {
    console.clear();
    console.log("===========================================");
    console.log("🎮 WELCOME TO GUESS THE NUMBER GAME! 🎮");
    console.log("===========================================\n");
    console.log("🔹 The computer will pick a random number.");
    console.log("🔹 You must guess the number correctly.");
    console.log("🔹 I'll tell you if your guess is too high or too low.");
    console.log("🔹 Type 'exit' anytime to quit the game.\n");

    chooseDifficulty();
};

// Function to choose difficulty
const chooseDifficulty = () => {
    console.log("🎯 Select Difficulty:");
    console.log("1. Easy (1-50, 15 attempts)");
    console.log("2. Medium (1-100, 10 attempts)");
    console.log("3. Hard (1-500, 7 attempts)");
    console.log("4. Custom Range");

    rl.question("\nEnter your choice (1-4): ", (choice) => {
        if (choice === 'exit') return exitGame();

        if (difficulties[choice]) {
            const { range, attempts } = difficulties[choice];
            minRange = 1;
            maxRange = range;
            maxAttempts = attempts;
        } else if (choice === '4') {
            return customRange();
        } else {
            console.log("❌ Invalid choice. Try again.");
            return chooseDifficulty();
        }

        startNewRound();
    });
};

// Custom range setup
const customRange = () => {
    rl.question("Enter minimum number: ", (min) => {
        rl.question("Enter maximum number: ", (max) => {
            rl.question("Enter max attempts: ", (attempts) => {
                minRange = parseInt(min);
                maxRange = parseInt(max);
                maxAttempts = parseInt(attempts);

                if (isNaN(minRange) || isNaN(maxRange) || isNaN(maxAttempts) || minRange >= maxRange || maxAttempts < 1) {
                    console.log("❌ Invalid values. Try again.");
                    return customRange();
                }
                
                startNewRound();
            });
        });
    });
};

// Start a new round
const startNewRound = () => {
    secretNumber = generateRandomNumber(minRange, maxRange);
    remainingAttempts = maxAttempts;
    
    console.log(`\n🔢 I've picked a number between ${minRange} and ${maxRange}.`);
    console.log(`🤔 You have ${maxAttempts} attempts to guess it. Good luck!\n`);
    
    askForGuess();
};

// Ask player for a guess
const askForGuess = () => {
    rl.question("🔢 Enter your guess: ", (input) => {
        if (input.toLowerCase() === 'exit') return exitGame();

        let guess = parseInt(input);
        if (isNaN(guess) || guess < minRange || guess > maxRange) {
            console.log(`❌ Invalid input! Enter a number between ${minRange} and ${maxRange}.`);
            return askForGuess();
        }

        checkGuess(guess);
    });
};

// Check the player's guess
const checkGuess = (guess) => {
    remainingAttempts--;

    if (guess === secretNumber) {
        console.log(`🎉 Correct! You guessed it in ${maxAttempts - remainingAttempts} attempts!\n`);
        return playAgain();
    } else if (guess > secretNumber) {
        console.log("📢 Too high! Try again.");
    } else {
        console.log("📢 Too low! Try again.");
    }

    console.log(`💡 Attempts left: ${remainingAttempts}\n`);

    if (remainingAttempts === 0) {
        console.log(`❌ Out of attempts! The correct number was ${secretNumber}.\n`);
        return playAgain();
    }

    askForGuess();
};

// Ask if the player wants to play again
const playAgain = () => {
    rl.question("🔄 Do you want to play again? (yes/no): ", (answer) => {
        if (answer.toLowerCase() === 'yes') {
            startGame();
        } else {
            exitGame();
        }
    });
};

// Exit game
const exitGame = () => {
    console.log("👋 Thanks for playing! Goodbye!\n");
    rl.close();
};

// Start the game
startGame();
