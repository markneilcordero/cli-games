const readline = require("readline");

// Create Readline Interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Magic 8-Ball Responses
const responses = {
  positive: [
    "Yes, definitely!",
    "It is certain.",
    "Without a doubt.",
    "Yes!",
    "You may rely on it.",
    "As I see it, yes.",
    "Most likely.",
    "Outlook good.",
    "Signs point to yes."
  ],
  neutral: [
    "Reply hazy, try again.",
    "Ask again later.",
    "Better not tell you now.",
    "Cannot predict now.",
    "Concentrate and ask again."
  ],
  negative: [
    "Don't count on it.",
    "My reply is no.",
    "My sources say no.",
    "Outlook not so good.",
    "Very doubtful."
  ]
};

// Combine all responses into one array
const allResponses = [...responses.positive, ...responses.neutral, ...responses.negative];

// Function to get a random response
const getRandomResponse = () => {
  return allResponses[Math.floor(Math.random() * allResponses.length)];
};

// Function to ask a question
const askQuestion = () => {
  rl.question("\n❓ What is your question? (Type 'exit' to quit)\n> ", (question) => {
    if (question.trim().toLowerCase() === "exit") {
      console.log("\n👋 Goodbye! May the 8-Ball guide your future decisions.");
      rl.close();
      return;
    }

    if (question.trim() === "") {
      console.log("\n⚠️ Please enter a valid question.");
      return askQuestion();
    }

    // Simulate "shaking" effect
    console.log("\n🔮 Shaking the Magic 8-Ball...");
    setTimeout(() => {
      console.log(`🎱 Magic 8-Ball says: "${getRandomResponse()}"\n`);
      askAgain();
    }, 2000);
  });
};

// Function to ask if user wants to play again
const askAgain = () => {
  rl.question("❓ Do you want to ask another question? (yes/no)\n> ", (answer) => {
    if (answer.trim().toLowerCase() === "yes") {
      askQuestion();
    } else if (answer.trim().toLowerCase() === "no") {
      console.log("\n👋 Thanks for playing! Come back anytime.");
      rl.close();
    } else {
      console.log("\n⚠️ Please enter 'yes' or 'no'.");
      askAgain();
    }
  });
};

// Start the game
console.log("\n🎱 Welcome to the Magic 8-Ball! Ask a yes/no question and receive a mystical answer. 🎱");
askQuestion();
