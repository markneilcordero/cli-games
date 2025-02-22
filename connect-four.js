const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// Game Constants
const ROWS = 6;
const COLUMNS = 7;
const EMPTY = '.';
const PLAYER_ONE = '🔴';
const PLAYER_TWO = '🟡';

// Game Variables
let board = [];
let currentPlayer = PLAYER_ONE;

// Initialize the board
function initializeBoard() {
    board = Array.from({ length: ROWS }, () => Array(COLUMNS).fill(EMPTY));
}

// Display the board
function displayBoard() {
    console.clear();
    console.log('\n🎮 CONNECT FOUR 🎮\n');
    console.log(' 1  2  3  4  5  6  7 ');
    console.log('-'.repeat(23));
    for (let row of board) {
        console.log('| ' + row.join(' ') + ' |');
    }
    console.log('-'.repeat(23) + '\n');
}

// Check if a move is valid (column not full)
function isValidMove(col) {
    return board[0][col] === EMPTY;
}

// Drop the piece into the board
function dropPiece(col) {
    for (let row = ROWS - 1; row >= 0; row--) {
        if (board[row][col] === EMPTY) {
            board[row][col] = currentPlayer;
            return row;
        }
    }
    return -1;
}

// Check for a win condition
function checkWin(row, col) {
    return (
        checkDirection(row, col, 1, 0) || // Vertical
        checkDirection(row, col, 0, 1) || // Horizontal
        checkDirection(row, col, 1, 1) || // Diagonal /
        checkDirection(row, col, 1, -1)   // Diagonal \
    );
}

// Helper function to check 4-in-a-row in a direction
function checkDirection(row, col, rowDir, colDir) {
    let count = 1;

    for (let dir of [-1, 1]) {
        let r = row + rowDir * dir;
        let c = col + colDir * dir;
        while (r >= 0 && r < ROWS && c >= 0 && c < COLUMNS && board[r][c] === currentPlayer) {
            count++;
            if (count === 4) return true;
            r += rowDir * dir;
            c += colDir * dir;
        }
    }
    return false;
}

// Check if the board is full (Draw condition)
function isBoardFull() {
    return board[0].every(cell => cell !== EMPTY);
}

// Handle Player Move
function playerMove() {
    displayBoard();
    rl.question(`Player ${currentPlayer} - Choose a column (1-7) or type 'E' to exit: `, (input) => {
        if (input.toUpperCase() === 'E') {
            console.log("🚪 Exiting game...");
            rl.close();
            return;
        }

        const col = parseInt(input) - 1;

        if (isNaN(col) || col < 0 || col >= COLUMNS) {
            console.log("⚠️ Invalid column! Please choose between 1-7.");
            return playerMove();
        }

        if (!isValidMove(col)) {
            console.log("⚠️ Column full! Choose another.");
            return playerMove();
        }

        const row = dropPiece(col);

        if (checkWin(row, col)) {
            displayBoard();
            console.log(`🎉 Player ${currentPlayer} WINS! 🏆`);
            return askReplay();
        }

        if (isBoardFull()) {
            displayBoard();
            console.log("🤝 It's a DRAW! No more moves available.");
            return askReplay();
        }

        // Switch player and continue
        currentPlayer = currentPlayer === PLAYER_ONE ? PLAYER_TWO : PLAYER_ONE;
        playerMove();
    });
}

// Ask to replay or exit
function askReplay() {
    rl.question("🔄 Play again? (Y/N): ", (answer) => {
        if (answer.toUpperCase() === 'Y') {
            startGame();
        } else {
            console.log("Thanks for playing! 🎮");
            rl.close();
        }
    });
}

// Start Game Function
function startGame() {
    initializeBoard();
    currentPlayer = PLAYER_ONE;
    playerMove();
}

// Start the game on execution
startGame();
