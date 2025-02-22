const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const board = [' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' '];
let currentPlayer = 'X';
let aiPlayer = 'O';
let gameMode = 1; // 1: Player vs AI, 2: Player vs Player

// Display the Tic-Tac-Toe board
function displayBoard() {
    console.log(`
      ${board[0]} | ${board[1]} | ${board[2]} 
     ---+---+---
      ${board[3]} | ${board[4]} | ${board[5]} 
     ---+---+---
      ${board[6]} | ${board[7]} | ${board[8]} 
    `);
}

// Check if a player has won
function checkWinner(player) {
    const winPatterns = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
        [0, 3, 6], [1, 4, 7], [2, 5, 8], // Columns
        [0, 4, 8], [2, 4, 6]             // Diagonals
    ];
    return winPatterns.some(pattern => pattern.every(index => board[index] === player));
}

// Check for a draw
function isDraw() {
    return board.every(cell => cell !== ' ');
}

// Minimax Algorithm for AI Move
function minimax(newBoard, player) {
    const emptyCells = newBoard.reduce((acc, cell, index) => {
        if (cell === ' ') acc.push(index);
        return acc;
    }, []);

    if (checkWinner(aiPlayer)) return { score: 1 };
    if (checkWinner(currentPlayer)) return { score: -1 };
    if (emptyCells.length === 0) return { score: 0 };

    let moves = [];

    for (let i of emptyCells) {
        let move = {};
        move.index = i;
        newBoard[i] = player;

        if (player === aiPlayer) {
            move.score = minimax(newBoard, currentPlayer).score;
        } else {
            move.score = minimax(newBoard, aiPlayer).score;
        }

        newBoard[i] = ' ';
        moves.push(move);
    }

    let bestMove;
    if (player === aiPlayer) {
        let maxScore = -Infinity;
        for (let m of moves) {
            if (m.score > maxScore) {
                maxScore = m.score;
                bestMove = m;
            }
        }
    } else {
        let minScore = Infinity;
        for (let m of moves) {
            if (m.score < minScore) {
                minScore = m.score;
                bestMove = m;
            }
        }
    }

    return bestMove;
}

// AI makes a move
function aiMove() {
    console.log(`🤖 AI is thinking...`);
    const bestSpot = minimax([...board], aiPlayer).index;
    board[bestSpot] = aiPlayer;
    console.log(`🤖 AI placed '${aiPlayer}' at position ${bestSpot + 1}`);
    displayBoard();
    if (checkWinner(aiPlayer)) return console.log("🤖 AI Wins! Better luck next time!");
    if (isDraw()) return console.log("🤝 It's a Draw!");
    playerTurn();
}

// Handle player move
function playerTurn() {
    rl.question(`🎮 ${currentPlayer}'s Turn! Choose a position (1-9): `, (input) => {
        const index = parseInt(input) - 1;
        if (isNaN(index) || index < 0 || index > 8 || board[index] !== ' ') {
            console.log("❌ Invalid move! Try again.");
            return playerTurn();
        }

        board[index] = currentPlayer;
        displayBoard();

        if (checkWinner(currentPlayer)) {
            console.log(`🎉 Congratulations! ${currentPlayer} Wins!`);
            return;
        }

        if (isDraw()) {
            console.log("🤝 It's a Draw!");
            return;
        }

        if (gameMode === 1) {
            aiMove();
        } else {
            currentPlayer = currentPlayer === 'X' ? 'O' : 'X';
            playerTurn();
        }
    });
}

// Game initialization
function startGame() {
    console.log("🎲 Welcome to CLI Tic-Tac-Toe!");
    console.log("1️⃣ Player vs AI");
    console.log("2️⃣ Player vs Player");
    console.log("3️⃣ Exit Game");

    rl.question("Enter choice (1-3): ", (choice) => {
        if (choice === '3') {
            console.log("👋 Thanks for playing!");
            rl.close();
            return;
        }

        if (choice === '1') {
            gameMode = 1;
            rl.question("Choose your symbol: 1️⃣ X (First Move) 2️⃣ O (Second Move): ", (symbolChoice) => {
                if (symbolChoice === '2') {
                    currentPlayer = 'O';
                    aiPlayer = 'X';
                    aiMove();
                } else {
                    currentPlayer = 'X';
                    aiPlayer = 'O';
                    displayBoard();
                    playerTurn();
                }
            });
        } else if (choice === '2') {
            gameMode = 2;
            displayBoard();
            playerTurn();
        } else {
            console.log("❌ Invalid choice! Please restart.");
            startGame();
        }
    });
}

startGame();
