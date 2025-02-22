

```
# 🎮 CLI Games Collection

A collection of fun and interactive Command Line Interface (CLI) games built using **Node.js**.

## 🚀 Features
- **Interactive Game Selection**: Choose a game from the menu using arrow keys.
- **Multiple CLI Games**: Includes classics like Tic-Tac-Toe, Blackjack, Poker, and more!
- **Automatic Game Execution**: Runs each game seamlessly inside the terminal.
- **Replay Option**: Return to the menu after finishing a game.

## 📜 List of Games
- Battleship
- Blackjack
- Connect Four
- Fibonacci Game
- Guess the Number
- Magic 8-Ball
- Poker
- Prime Number Game
- Rock Paper Scissors
- Roulette
- Solitaire
- Stock Market Simulator
- Tic-Tac-Toe
- War

## 🛠 Installation & Setup
1. **Clone this repository**:
   ```sh
   git clone https://github.com/your-username/cli-games.git
   ```
2. **Navigate to the project folder**:
   ```sh
   cd cli-games
   ```
3. **Install dependencies**:
   ```sh
   npm install
   ```
   (This installs `inquirer` for interactive menus.)

## ▶️ Running the CLI Games
Start the game launcher:
```sh
node index.js
```
Use the arrow keys to select a game and press **Enter** to play.

## 📝 Adding More Games
To add a new game:
1. Create a new `.js` file inside the **cli-games** folder.
2. Implement your game logic in JavaScript.
3. Run `node index.js` to see it appear in the menu automatically!

## 📌 Example of a Simple Game (Guess the Number)
```javascript
const readline = require("readline");

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const secretNumber = Math.floor(Math.random() * 10) + 1;

rl.question("Guess a number between 1 and 10: ", (answer) => {
    if (parseInt(answer) === secretNumber) {
        console.log("🎉 Correct! You guessed the number!");
    } else {
        console.log(`❌ Wrong! The number was ${secretNumber}.`);
    }
    rl.close();
});
```

## 🤝 Contributing
Feel free to contribute by adding new games or improving existing ones! Fork the repository, create a new branch, and submit a pull request.
