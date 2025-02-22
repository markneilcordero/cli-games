const readline = require("readline");

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// 🎰 Game Data
let balance = 1000;
const rouletteNumbers = Array.from({ length: 37 }, (_, i) => i); // 0 to 36
const colors = {
    red: [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36],
    black: [2, 4, 6, 8, 10, 11, 13, 15, 17, 20, 22, 24, 26, 28, 29, 31, 33, 35]
};
const bets = [];

console.log(`\n====================================
  🎰 WELCOME TO CLI ROULETTE 🎰
====================================
Game Rules:
- You start with $1000.
- You can place bets on numbers, colors, odd/even, etc.
- Type "spin" to start the game.
- Type "exit" anytime to quit.
------------------------------------`);

// 📌 Display Bet Options
const displayBetOptions = () => {
    console.log(`\n💰 Your Balance: $${balance}`);
    console.log(`
📌 Place Your Bets!
1. Single Number (payout 35:1)
2. Color (Red/Black) (payout 1:1)
3. Odd/Even (payout 1:1)
4. Low (1-18) / High (19-36) (payout 1:1)
5. Spin the Wheel (Type "spin")
6. Exit (Type "exit")
`);
    askBet();
};

// 📌 Ask User for a Bet
const askBet = () => {
    rl.question("Choose a bet type (1-4) or type 'spin' to start: ", (input) => {
        if (input.toLowerCase() === "exit") return exitGame();
        if (input.toLowerCase() === "spin") return spinWheel();

        let betType = parseInt(input);
        if (isNaN(betType) || betType < 1 || betType > 4) {
            console.log("⚠ Invalid choice. Try again.");
            return displayBetOptions();
        }

        placeBet(betType);
    });
};

// 💰 Place a Bet
const placeBet = (betType) => {
    switch (betType) {
        case 1: // 🎯 Single Number
            rl.question("🎯 Choose a number (0-36): ", (num) => {
                num = parseInt(num);
                if (!rouletteNumbers.includes(num)) {
                    console.log("⚠ Invalid number. Choose between 0-36.");
                    return displayBetOptions();
                }
                placeAmount({ type: "number", value: num, payout: 35 });
            });
            break;

        case 2: // 🎨 Color (Red/Black)
            rl.question("🎨 Choose a color (Red/Black): ", (color) => {
                color = color.toLowerCase();
                if (color !== "red" && color !== "black") {
                    console.log("⚠ Invalid color. Type 'Red' or 'Black'.");
                    return displayBetOptions();
                }
                placeAmount({ type: "color", value: color, payout: 1 });
            });
            break;

        case 3: // 🔢 Odd/Even
            rl.question("🔢 Choose Odd or Even: ", (choice) => {
                choice = choice.toLowerCase();
                if (choice !== "odd" && choice !== "even") {
                    console.log("⚠ Invalid choice. Type 'Odd' or 'Even'.");
                    return displayBetOptions();
                }
                placeAmount({ type: "oddEven", value: choice, payout: 1 });
            });
            break;

        case 4: // 🔼 Low (1-18) / High (19-36)
            rl.question("🔼 Choose Low (1-18) or High (19-36): ", (range) => {
                range = range.toLowerCase();
                if (range !== "low" && range !== "high") {
                    console.log("⚠ Invalid choice. Type 'Low' or 'High'.");
                    return displayBetOptions();
                }
                placeAmount({ type: "lowHigh", value: range, payout: 1 });
            });
            break;
    }
};

// 💵 Place Bet Amount
const placeAmount = (bet) => {
    rl.question(`💵 Enter bet amount ($10 - $${balance}): `, (amount) => {
        amount = parseInt(amount);
        if (isNaN(amount) || amount < 10 || amount > balance) {
            console.log(`⚠ Invalid amount. Enter between $10 - $${balance}.`);
            return displayBetOptions();
        }
        bet.amount = amount;
        bets.push(bet);
        balance -= amount;
        console.log(`✅ Bet Placed: $${amount} on ${bet.value}`);
        displayBetOptions();
    });
};

// 🎡 Spin the Wheel
const spinWheel = () => {
    if (bets.length === 0) {
        console.log("⚠ No bets placed. Please place a bet first.");
        return displayBetOptions();
    }

    console.log("\n🎡 Spinning the Roulette Wheel...");
    setTimeout(() => {
        let winningNumber = rouletteNumbers[Math.floor(Math.random() * rouletteNumbers.length)];
        let winningColor = colors.red.includes(winningNumber) ? "red" : colors.black.includes(winningNumber) ? "black" : "green";

        console.log(`🎉 The ball landed on **${winningNumber} (${winningColor})!** 🎉\n`);
        checkResults(winningNumber, winningColor);
    }, 2000);
};

// ✅ Check Results & Payouts
const checkResults = (winningNumber, winningColor) => {
    let totalWinnings = 0;

    bets.forEach((bet) => {
        if (
            (bet.type === "number" && bet.value === winningNumber) ||
            (bet.type === "color" && bet.value === winningColor) ||
            (bet.type === "oddEven" && ((bet.value === "odd" && winningNumber % 2 !== 0) || (bet.value === "even" && winningNumber % 2 === 0))) ||
            (bet.type === "lowHigh" && ((bet.value === "low" && winningNumber >= 1 && winningNumber <= 18) || (bet.value === "high" && winningNumber >= 19 && winningNumber <= 36)))
        ) {
            let winnings = bet.amount * bet.payout;
            totalWinnings += winnings;
            console.log(`✅ **You won $${winnings}** from ${bet.value} (Bet: $${bet.amount})`);
        } else {
            console.log(`❌ **Lost $${bet.amount}** on ${bet.value}`);
        }
    });

    balance += totalWinnings;
    bets.length = 0;

    console.log(`\n💰 Updated Balance: **$${balance}**`);
    if (balance <= 0) {
        console.log("\n💸 You're out of money! Game Over.");
        return exitGame();
    }

    rl.question("\nWould you like to continue? (yes/no): ", (input) => {
        if (input.toLowerCase() === "yes") displayBetOptions();
        else exitGame();
    });
};

// 🚪 Exit the Game
const exitGame = () => {
    console.log(`\n🏁 **GAME OVER!** 🎉 You finished with $${balance}. Thank you for playing!`);
    rl.close();
};

// Start the game loop
displayBetOptions();
